"""
Authentication routes for user login and registration
"""
from datetime import datetime, timezone
import logging
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token
)
from app.core.dependencies import get_current_user
from app.core.security import verify_token
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import (
    LoginRequest, RefreshTokenRequest, TokenResponse, UserCreate, UserResponse
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
logger = logging.getLogger(__name__)

MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300
LOGIN_LOCK_SECONDS = 300
FAILED_LOGIN_ATTEMPTS = defaultdict(list)
LOCKED_UNTIL = {}


def _store_refresh_token(db: Session, refresh_token: str, user_id: int) -> None:
    _cleanup_expired_refresh_tokens(db)
    payload = verify_token(refresh_token, expected_type="refresh")
    exp = payload.get("exp")
    jti = payload.get("jti")
    if exp is None or jti is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload",
        )

    db.add(
        RefreshToken(
            user_id=user_id,
            token_jti=jti,
            expires_at=datetime.fromtimestamp(exp, tz=timezone.utc).replace(tzinfo=None),
            revoked=False,
        )
    )
    db.commit()


def _cleanup_expired_refresh_tokens(db: Session) -> None:
    now_utc_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    db.query(RefreshToken).filter(RefreshToken.expires_at < now_utc_naive).delete()
    db.commit()


def _issue_token_response(db: Session, user: User) -> TokenResponse:
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    _store_refresh_token(db, refresh_token, user.id)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user (Clerk registration)
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone,
        role="clerk"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return _issue_token_response(db, new_user)


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email and password
    Returns access and refresh tokens
    """
    now = time.time()
    locked_until = LOCKED_UNTIL.get(credentials.email, 0)
    if locked_until > now:
        retry_after = int(locked_until - now)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Try again in {retry_after}s",
        )

    FAILED_LOGIN_ATTEMPTS[credentials.email] = [
        timestamp
        for timestamp in FAILED_LOGIN_ATTEMPTS[credentials.email]
        if now - timestamp <= LOGIN_WINDOW_SECONDS
    ]

    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        FAILED_LOGIN_ATTEMPTS[credentials.email].append(now)
        if len(FAILED_LOGIN_ATTEMPTS[credentials.email]) >= MAX_LOGIN_ATTEMPTS:
            LOCKED_UNTIL[credentials.email] = now + LOGIN_LOCK_SECONDS
        logger.warning("Failed login attempt for email=%s", credentials.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    FAILED_LOGIN_ATTEMPTS.pop(credentials.email, None)
    LOCKED_UNTIL.pop(credentials.email, None)
    
    logger.info("Successful login user_id=%s role=%s", user.id, user.role)
    return _issue_token_response(db, user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current logged-in user info
    Requires valid JWT token
    """
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    payload: RefreshTokenRequest, db: Session = Depends(get_db)
):
    decoded = verify_token(payload.refresh_token, expected_type="refresh")
    token_jti = decoded.get("jti")
    user_id = decoded.get("sub")

    stored_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_jti == token_jti,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked.is_(False),
        )
        .first()
    )
    now_utc_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    if not stored_token or stored_token.expires_at < now_utc_naive:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or revoked",
        )

    stored_token.revoked = True
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    db.commit()
    logger.info("Refresh token rotated user_id=%s", user_id)
    return _issue_token_response(db, user)


@router.post("/logout")
async def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    decoded = verify_token(payload.refresh_token, expected_type="refresh")
    token_jti = decoded.get("jti")

    stored_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_jti == token_jti, RefreshToken.revoked.is_(False))
        .first()
    )
    if stored_token:
        stored_token.revoked = True
        db.commit()
        logger.info("Refresh token revoked token_jti=%s", token_jti)

    return {"message": "Logged out successfully"}

"""
Security utilities for JWT token handling and password hashing
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

import bcrypt
from fastapi import HTTPException, status
from jose import JWTError, jwt

from .config import settings


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def _encode_token(data: dict, expires_at: datetime, token_type: str) -> str:
    payload = data.copy()
    if "sub" in payload:
        payload["sub"] = str(payload["sub"])
    payload.update({"exp": expires_at, "typ": token_type})
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    return _encode_token(data, expire, "access")


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    payload = data.copy()
    payload["jti"] = uuid4().hex
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    return _encode_token(payload, expire, "refresh")


def create_invite_token(data: dict) -> str:
    """Create a JWT invite token for admin onboarding links."""
    payload = data.copy()
    payload["jti"] = uuid4().hex
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.invite_token_expire_hours)
    return _encode_token(payload, expire, "invite")


def verify_token(token: str, expected_type: Optional[str] = "access") -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        token_type = payload.get("typ")

        if expected_type and token_type != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if "sub" in payload:
            try:
                payload["sub"] = int(payload["sub"])
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        elif expected_type in ("access", "refresh"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

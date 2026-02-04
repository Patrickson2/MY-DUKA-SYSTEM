"""User management routes."""
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.core.security import create_invite_token, hash_password, verify_password
from app.models.store import Store
from app.models.user import User, UserRole
from app.schemas.user import (
    AdminInviteCreateRequest,
    AdminInviteResponse,
    UserChangePassword,
    UserCreateByAdmin,
    UserDeactivate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)
from app.services.email_service import build_admin_invite_link, send_admin_invite_email

router = APIRouter(prefix="/api/users", tags=["users"])
logger = logging.getLogger(__name__)


@router.post("/create", response_model=UserResponse)
async def create_user_by_admin(
    user_data: UserCreateByAdmin,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    """Create a new admin or clerk."""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    if current_user.role == "admin":
        if user_data.role == UserRole.SUPERUSER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin cannot create superuser accounts",
            )
        if current_user.store_id is not None:
            if user_data.store_id is None:
                user_data.store_id = current_user.store_id
            enforce_store_scope(current_user, user_data.store_id)

    new_user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone,
        role=user_data.role,
        store_id=user_data.store_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("User created actor_id=%s created_user_id=%s role=%s", current_user.id, new_user.id, new_user.role)
    return UserResponse.model_validate(new_user)


@router.post("/admin-invites", response_model=AdminInviteResponse)
async def create_admin_invite(
    payload: AdminInviteCreateRequest,
    current_user: User = Depends(check_permission("superuser")),
    db: Session = Depends(get_db),
):
    """Create a tokenized registration link for a future admin account."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    if payload.store_id is not None:
        store = db.query(Store).filter(Store.id == payload.store_id).first()
        if not store:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    token = create_invite_token(
        {
            "sub": current_user.id,
            "email": payload.email,
            "role": "admin",
            "store_id": payload.store_id,
        }
    )
    invite_link = build_admin_invite_link(token)
    send_admin_invite_email(payload.email, invite_link)

    logger.info("Admin invite created actor_id=%s email=%s", current_user.id, payload.email)
    return AdminInviteResponse(invite_token=token, invite_link=invite_link, expires_in_hours=48)


@router.get("/", response_model=List[UserListResponse])
async def list_users(
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
    role: str | None = None,
):
    """List users with role/store filtering."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)

    if current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(User.store_id == current_user.store_id)

    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [UserListResponse.model_validate(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    enforce_store_scope(current_user, user.store_id)
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_admin = current_user.role in (UserRole.ADMIN.value, UserRole.SUPERUSER.value)
    if current_user.id != user_id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update other users")

    enforce_store_scope(current_user, user.store_id)

    if user_data.first_name is not None:
        user.first_name = user_data.first_name
    if user_data.last_name is not None:
        user.last_name = user_data.last_name
    if user_data.phone is not None:
        user.phone = user_data.phone

    db.commit()
    db.refresh(user)
    logger.info("User updated actor_id=%s target_user_id=%s", current_user.id, user.id)
    return UserResponse.model_validate(user)


@router.post("/{user_id}/change-password")
async def change_password(
    user_id: int,
    password_data: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change other users' password")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(password_data.old_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    user.hashed_password = hash_password(password_data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.patch("/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    deactivate_data: UserDeactivate,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    enforce_store_scope(current_user, user.store_id)
    user.is_active = deactivate_data.is_active
    db.commit()
    db.refresh(user)

    logger.info("User status changed actor_id=%s target_user_id=%s active=%s", current_user.id, user.id, user.is_active)
    status_text = "activated" if deactivate_data.is_active else "deactivated"
    return {"message": f"User {status_text} successfully"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    enforce_store_scope(current_user, user.store_id)
    db.delete(user)
    db.commit()

    logger.info("User deleted actor_id=%s target_user_id=%s", current_user.id, user_id)
    return {"message": "User deleted successfully"}

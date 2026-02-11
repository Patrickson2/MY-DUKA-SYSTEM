"""
FastAPI dependencies for authentication and authorization
"""
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from .database import get_db
from .security import verify_token
from typing import Optional


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get the current authenticated user from JWT token in Authorization header
    
    Usage in routes:
    @router.get("/protected")
    async def protected_route(current_user = Depends(get_current_user)):
        ...
    """
    # Local import avoids circular dependency during app startup.
    from app.models.user import User
    
    # Extract token from Authorization header
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract bearer token
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid auth scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(token)
    user_id: int = payload.get("sub")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    return user


def check_permission(required_role: str):
    """
    Create a dependency to check user role
    
    Usage in routes:
    @router.post("/admin-only")
    async def admin_route(current_user = Depends(check_permission("admin"))):
        ...
    """
    async def verify_role(current_user = Depends(get_current_user)):
        if current_user.role != required_role and current_user.role != "superuser":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    
    return verify_role


def enforce_store_scope(current_user, resource_store_id: Optional[int]) -> None:
    """
    Enforce that store-scoped admins can only access resources in their store.
    Superusers bypass this check.
    """
    # Superusers can access all stores.
    if current_user.role == "superuser":
        return
    if current_user.role == "admin" and current_user.store_id is not None:
        if resource_store_id is None or current_user.store_id != resource_store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access resources outside your assigned store",
            )

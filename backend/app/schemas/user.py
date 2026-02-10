"""
Pydantic schemas for User validation and API responses
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    """User roles"""

    SUPERUSER = "superuser"
    ADMIN = "admin"
    CLERK = "clerk"


class UserCreate(BaseModel):
    """Schema for user registration"""

    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None


class UserCreateByAdmin(BaseModel):
    """Schema for admin creating new users (with role)"""

    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    role: UserRole = UserRole.CLERK
    store_id: Optional[int] = None


class UserUpdate(BaseModel):
    """Schema for updating user info"""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class UserChangePassword(BaseModel):
    """Schema for password change"""

    old_password: str
    new_password: str = Field(..., min_length=8)


class UserDeactivate(BaseModel):
    """Schema for deactivating a user"""

    is_active: bool


class UserResponse(BaseModel):
    """Schema for user response (no password)"""

    id: int
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: str
    is_active: bool
    store_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Schema for listing users"""

    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    """Schema for login request"""

    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    """Schema for token response"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AdminInviteCreateRequest(BaseModel):
    """Create a tokenized invite link for a future admin."""

    email: EmailStr
    store_id: Optional[int] = None


class AdminInviteResponse(BaseModel):
    invite_token: str
    invite_link: str
    expires_in_hours: int


class AdminInviteRegisterRequest(BaseModel):
    """Complete admin account registration using an invite token."""

    invite_token: str
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None

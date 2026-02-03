"""
Pydantic schemas for User validation and API responses
"""
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User roles"""
    SUPERUSER = "superuser"
    ADMIN = "admin"
    CLERK = "clerk"


# ===== Request Schemas =====
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


# ===== Response Schemas =====
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


# ===== Auth Schemas =====
class LoginRequest(BaseModel):
    """Schema for login request"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str

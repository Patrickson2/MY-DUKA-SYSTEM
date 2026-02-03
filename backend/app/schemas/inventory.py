"""
Pydantic schemas for Store validation and API responses
"""
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime


# ===== Request Schemas =====
class StoreCreate(BaseModel):
    """Schema for creating a store"""
    name: str = Field(..., min_length=1, max_length=255)
    location: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None


class StoreUpdate(BaseModel):
    """Schema for updating a store"""
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


# ===== Response Schemas =====
class StoreResponse(BaseModel):
    """Schema for store response"""
    id: int
    name: str
    location: str
    description: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class StoreListResponse(BaseModel):
    """Schema for store list response"""
    id: int
    name: str
    location: str
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

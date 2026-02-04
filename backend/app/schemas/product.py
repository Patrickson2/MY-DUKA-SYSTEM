"""
Pydantic schemas for Product validation and API responses
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


# ===== Request Schemas =====
class ProductCreate(BaseModel):
    """Schema for creating a product"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    sku: str = Field(..., min_length=1, max_length=100)
    buying_price: float = Field(..., gt=0)
    selling_price: float = Field(..., gt=0)


class ProductUpdate(BaseModel):
    """Schema for updating a product"""
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    buying_price: Optional[float] = None
    selling_price: Optional[float] = None
    is_active: Optional[bool] = None


# ===== Response Schemas =====
class ProductResponse(BaseModel):
    """Schema for product response"""
    id: int
    name: str
    description: Optional[str]
    sku: str
    buying_price: float
    selling_price: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    """Schema for product list response"""
    id: int
    name: str
    sku: str
    buying_price: float
    selling_price: float
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

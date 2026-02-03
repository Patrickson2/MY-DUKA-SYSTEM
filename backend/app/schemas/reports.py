"""
Pydantic schemas for Inventory and SupplyRequest validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class PaymentStatus(str, Enum):
    """Payment status"""
    PAID = "paid"
    UNPAID = "unpaid"


class SupplyRequestStatus(str, Enum):
    """Supply request status"""
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"


# ===== Inventory Schemas =====
class InventoryCreate(BaseModel):
    """Schema for recording inventory entry"""
    product_id: int
    store_id: int
    quantity_received: int = Field(..., ge=0)
    quantity_in_stock: int = Field(..., ge=0)
    quantity_spoilt: int = Field(..., ge=0)
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    buying_price: float = Field(..., gt=0)
    selling_price: float = Field(..., gt=0)
    remarks: Optional[str] = None


class InventoryUpdate(BaseModel):
    """Schema for updating inventory"""
    quantity_in_stock: Optional[int] = None
    quantity_spoilt: Optional[int] = None
    payment_status: Optional[PaymentStatus] = None
    remarks: Optional[str] = None


class InventoryResponse(BaseModel):
    """Schema for inventory response"""
    id: int
    product_id: int
    store_id: int
    quantity_received: int
    quantity_in_stock: int
    quantity_spoilt: int
    payment_status: str
    buying_price: float
    selling_price: float
    remarks: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ===== Supply Request Schemas =====
class SupplyRequestCreate(BaseModel):
    """Schema for creating supply request"""
    product_id: int
    store_id: int
    quantity_requested: int = Field(..., gt=0)
    reason: Optional[str] = None


class SupplyRequestApprove(BaseModel):
    """Schema for approving supply request"""
    admin_notes: Optional[str] = None


class SupplyRequestDecline(BaseModel):
    """Schema for declining supply request"""
    admin_notes: str = Field(..., min_length=1)


class SupplyRequestResponse(BaseModel):
    """Schema for supply request response"""
    id: int
    product_id: int
    store_id: int
    requested_by: int
    quantity_requested: int
    reason: Optional[str]
    status: str
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class AdminDashboardStats(BaseModel):
    active_clerks: int
    pending_requests: int
    unpaid_products: int
    store_value: float


class AdminSupplyRequestItem(BaseModel):
    id: int
    product: str
    quantity: int
    requested_by: str
    date: datetime
    notes: Optional[str]
    status: str


class AdminPaymentStatusItem(BaseModel):
    inventory_id: int
    product: str
    supplier: Optional[str] = None
    stock: int
    buy_price: float
    payment_status: str


class ClerkListItem(BaseModel):
    id: int
    name: str
    email: str
    joined_date: datetime
    status: str


class AdminDashboardResponse(BaseModel):
    stats: AdminDashboardStats
    supply_requests: List[AdminSupplyRequestItem]
    payment_status: List[AdminPaymentStatusItem]
    clerks: List[ClerkListItem]


class ClerkDashboardStats(BaseModel):
    total_products: int
    total_stock: int
    spoilt_items: int


class ClerkProductItem(BaseModel):
    inventory_id: int
    product: str
    category: Optional[str]
    stock: int
    spoil: int
    buy_price: float
    sell_price: float
    payment_status: str


class ClerkDashboardResponse(BaseModel):
    stats: ClerkDashboardStats
    products: List[ClerkProductItem]


class MerchantDashboardStats(BaseModel):
    active_stores: int
    active_admins: int
    total_products: int
    estimated_revenue: float


class MerchantPerformanceItem(BaseModel):
    product: str
    sales: float
    profit: float


class MerchantPaymentSummary(BaseModel):
    paid_amount: float
    unpaid_amount: float
    paid_percentage: float
    unpaid_percentage: float


class MerchantStoreItem(BaseModel):
    id: int
    name: str
    location: str
    admin_name: Optional[str]
    status: str


class MerchantAdminItem(BaseModel):
    id: int
    name: str
    email: str
    store: Optional[str]
    status: str


class MerchantDashboardResponse(BaseModel):
    stats: MerchantDashboardStats
    performance: List[MerchantPerformanceItem]
    payment_summary: MerchantPaymentSummary
    stores: List[MerchantStoreItem]
    admins: List[MerchantAdminItem]

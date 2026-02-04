"""Pydantic schemas for Inventory/Supply validation and dashboard reporting."""
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PaymentStatus(str, Enum):
    PAID = "paid"
    UNPAID = "unpaid"


class SupplyRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"


class InventoryCreate(BaseModel):
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
    quantity_in_stock: Optional[int] = None
    quantity_spoilt: Optional[int] = None
    payment_status: Optional[PaymentStatus] = None
    remarks: Optional[str] = None


class InventoryResponse(BaseModel):
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

    model_config = ConfigDict(from_attributes=True)


class SupplyRequestCreate(BaseModel):
    product_id: int
    store_id: int
    quantity_requested: int = Field(..., gt=0)
    reason: Optional[str] = None


class SupplyRequestApprove(BaseModel):
    admin_notes: Optional[str] = None


class SupplyRequestDecline(BaseModel):
    admin_notes: str = Field(..., min_length=1)


class SupplyRequestResponse(BaseModel):
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

    model_config = ConfigDict(from_attributes=True)


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


class ClerkPerformanceItem(BaseModel):
    clerk_id: int
    name: str
    recorded_items: int
    total_stock_recorded: int
    spoilt_recorded: int


class AdminDashboardResponse(BaseModel):
    stats: AdminDashboardStats
    supply_requests: List[AdminSupplyRequestItem]
    payment_status: List[AdminPaymentStatusItem]
    clerks: List[ClerkListItem]
    clerk_performance: List[ClerkPerformanceItem]


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
    sales_total: float
    paid_total: float
    unpaid_total: float


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

"""
Schemas for notifications and inventory timeline events.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    store_id: Optional[int]
    product_id: Optional[int]
    category: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class NotificationUnreadCount(BaseModel):
    unread_count: int


class InventoryEventResponse(BaseModel):
    id: int
    inventory_id: Optional[int]
    product_id: int
    store_id: int
    actor_id: int
    event_type: str
    old_quantity_in_stock: Optional[int]
    new_quantity_in_stock: Optional[int]
    old_payment_status: Optional[str]
    new_payment_status: Optional[str]
    details: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StockThresholdUpsert(BaseModel):
    store_id: Optional[int] = None
    min_quantity: int


class StockThresholdResponse(BaseModel):
    id: int
    product_id: int
    store_id: Optional[int]
    min_quantity: int

    model_config = ConfigDict(from_attributes=True)

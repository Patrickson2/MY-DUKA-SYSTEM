"""
Model for inventory timeline events.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class InventoryEvent(Base):
    __tablename__ = "inventory_events"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, index=True, nullable=True)
    product_id = Column(Integer, index=True, nullable=False)
    store_id = Column(Integer, index=True, nullable=False)
    actor_id = Column(Integer, index=True, nullable=False)
    event_type = Column(String(40), nullable=False)

    old_quantity_in_stock = Column(Integer, nullable=True)
    new_quantity_in_stock = Column(Integer, nullable=True)
    old_payment_status = Column(String(20), nullable=True)
    new_payment_status = Column(String(20), nullable=True)
    details = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now, nullable=False)

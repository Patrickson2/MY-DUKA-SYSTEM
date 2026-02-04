"""
SQLAlchemy models for Inventory entity
"""
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, String, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class PaymentStatus(str, enum.Enum):
    """Payment status enumeration"""
    PAID = "paid"
    UNPAID = "unpaid"


class Inventory(Base):
    """
    Inventory model tracking product stock and movements
    """
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Stock information
    quantity_received = Column(Integer, nullable=False, default=0)
    quantity_in_stock = Column(Integer, nullable=False, default=0)
    quantity_spoilt = Column(Integer, nullable=False, default=0)
    
    # Payment tracking
    payment_status = Column(String(20), default=PaymentStatus.UNPAID)
    buying_price = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    
    # Notes
    remarks = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    product = relationship("Product")
    store = relationship("Store", back_populates="inventory")
    created_by_user = relationship("User", back_populates="inventory")
    
    def __repr__(self):
        return f"<Inventory(id={self.id}, product_id={self.product_id}, store_id={self.store_id})>"

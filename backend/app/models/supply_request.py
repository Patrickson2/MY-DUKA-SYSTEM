"""
SQLAlchemy models for Supply Request entity
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class SupplyRequestStatus(str, enum.Enum):
    """Supply request status enumeration"""
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"


class SupplyRequest(Base):
    """
    Supply Request model for clerks to request additional products
    """
    __tablename__ = "supply_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Request details
    quantity_requested = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    
    # Status
    status = Column(String(20), default=SupplyRequestStatus.PENDING)
    
    # Admin response
    admin_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    approved_at = Column(DateTime, nullable=True)
    
    # Relationships
    product = relationship("Product")
    store = relationship("Store", back_populates="supply_requests")
    requested_by_user = relationship("User", back_populates="supply_requests")
    
    def __repr__(self):
        return f"<SupplyRequest(id={self.id}, product_id={self.product_id}, status={self.status})>"

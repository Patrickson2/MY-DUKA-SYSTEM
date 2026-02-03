"""
SQLAlchemy models for Store entity
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Store(Base):
    """
    Store model representing individual store locations
    """
    __tablename__ = "stores"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Contact information
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    inventory = relationship("Inventory", back_populates="store")
    supply_requests = relationship("SupplyRequest", back_populates="store")
    
    def __repr__(self):
        return f"<Store(id={self.id}, name={self.name}, location={self.location})>"

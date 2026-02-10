"""
SQLAlchemy models for User entity
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    """User role enumeration"""
    SUPERUSER = "superuser"  # Merchant
    ADMIN = "admin"           # Store admin
    CLERK = "clerk"           # Data entry clerk


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    """
    User model representing system users
    Roles: superuser (merchant), admin (store admin), clerk (data entry)
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    
    # Role-based access
    role = Column(String(20), default=UserRole.CLERK)
    
    # Account status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Store admin can be assigned to multiple stores
    store_id = Column(Integer, nullable=True)
    
    # Relationships
    inventory = relationship("Inventory", back_populates="created_by_user")
    supply_requests = relationship("SupplyRequest", back_populates="requested_by_user")
    stores = relationship("Store", back_populates="merchant", foreign_keys="Store.merchant_id")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"

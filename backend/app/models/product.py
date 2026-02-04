"""
SQLAlchemy models for Product entity
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from datetime import datetime, timezone
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Product(Base):
    """
    Product model representing items in inventory
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    
    # Pricing
    buying_price = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    def __repr__(self):
        return f"<Product(id={self.id}, name={self.name}, sku={self.sku})>"

"""
Model for product low-stock thresholds.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer

from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class StockThreshold(Base):
    __tablename__ = "stock_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, index=True, nullable=False)
    store_id = Column(Integer, index=True, nullable=True)
    min_quantity = Column(Integer, nullable=False, default=20)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

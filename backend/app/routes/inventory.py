"""
Inventory management routes for recording stock
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.user import User
from app.models.inventory import Inventory, PaymentStatus
from app.models.product import Product
from app.models.store import Store
from app.schemas.reports import (
    InventoryCreate, InventoryUpdate, InventoryResponse
)
from typing import List

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.post("/", response_model=InventoryResponse)
async def record_inventory(
    inventory_data: InventoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record new inventory entry (Stock take)
    Clerks can only record inventory
    """
    # Verify product exists
    product = db.query(Product).filter(Product.id == inventory_data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Verify store exists
    store = db.query(Store).filter(Store.id == inventory_data.store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Create inventory record
    new_inventory = Inventory(
        product_id=inventory_data.product_id,
        store_id=inventory_data.store_id,
        created_by=current_user.id,
        quantity_received=inventory_data.quantity_received,
        quantity_in_stock=inventory_data.quantity_in_stock,
        quantity_spoilt=inventory_data.quantity_spoilt,
        payment_status=inventory_data.payment_status,
        buying_price=inventory_data.buying_price,
        selling_price=inventory_data.selling_price,
        remarks=inventory_data.remarks
    )
    
    db.add(new_inventory)
    db.commit()
    db.refresh(new_inventory)
    
    return InventoryResponse.model_validate(new_inventory)


@router.get("/", response_model=List[InventoryResponse])
async def list_inventory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 10,
    store_id: int = None,
    payment_status: str = None
):
    """
    List inventory records
    Clerks see only their records, admins see all
    """
    query = db.query(Inventory)
    
    # If clerk, only show their records
    if current_user.role == "clerk":
        query = query.filter(Inventory.created_by == current_user.id)
    elif current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(Inventory.store_id == current_user.store_id)
    
    # Filter by store if provided
    if store_id:
        query = query.filter(Inventory.store_id == store_id)
    
    # Filter by payment status if provided
    if payment_status:
        query = query.filter(Inventory.payment_status == payment_status)
    
    records = query.offset(skip).limit(limit).all()
    return [InventoryResponse.model_validate(record) for record in records]


@router.get("/{inventory_id}", response_model=InventoryResponse)
async def get_inventory(
    inventory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get inventory record details
    """
    record = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found"
        )
    
    # Check permissions
    if current_user.role == "clerk" and record.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other clerks' records"
        )
    
    enforce_store_scope(current_user, record.store_id)
    return InventoryResponse.model_validate(record)


@router.put("/{inventory_id}", response_model=InventoryResponse)
async def update_inventory(
    inventory_id: int,
    inventory_data: InventoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update inventory record
    Clerks can update their own records, admins can update any
    """
    record = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found"
        )
    
    # Check permissions
    if current_user.role == "clerk" and record.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other clerks' records"
        )
    
    # Update fields
    if inventory_data.quantity_in_stock is not None:
        record.quantity_in_stock = inventory_data.quantity_in_stock
    if inventory_data.quantity_spoilt is not None:
        record.quantity_spoilt = inventory_data.quantity_spoilt
    if inventory_data.payment_status:
        record.payment_status = inventory_data.payment_status
    if inventory_data.remarks:
        record.remarks = inventory_data.remarks
    
    db.commit()
    db.refresh(record)
    
    return InventoryResponse.model_validate(record)


@router.get("/store/{store_id}/paid")
async def get_paid_inventory(
    store_id: int,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db)
):
    """
    Get all paid inventory items for a store
    Only admins can view
    """
    records = db.query(Inventory).filter(
        Inventory.store_id == store_id,
        Inventory.payment_status == PaymentStatus.PAID
    ).all()
    enforce_store_scope(current_user, store_id)
    
    return [InventoryResponse.model_validate(record) for record in records]


@router.get("/store/{store_id}/unpaid")
async def get_unpaid_inventory(
    store_id: int,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db)
):
    """
    Get all unpaid inventory items for a store
    Only admins can view
    """
    records = db.query(Inventory).filter(
        Inventory.store_id == store_id,
        Inventory.payment_status == PaymentStatus.UNPAID
    ).all()
    enforce_store_scope(current_user, store_id)
    
    return [InventoryResponse.model_validate(record) for record in records]
    enforce_store_scope(current_user, store.id)
    enforce_store_scope(current_user, record.store_id)

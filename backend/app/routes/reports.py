"""
Store management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.user import User
from app.models.store import Store
from app.schemas.inventory import (
    StoreCreate, StoreUpdate, StoreResponse, StoreListResponse
)
from typing import List

router = APIRouter(prefix="/api/stores", tags=["stores"])


@router.post("/", response_model=StoreResponse)
async def create_store(
    store_data: StoreCreate,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db)
):
    """
    Create a new store
    Only superusers/admins can create stores
    """
    new_store = Store(
        name=store_data.name,
        location=store_data.location,
        description=store_data.description,
        phone=store_data.phone,
        email=store_data.email
    )
    
    db.add(new_store)
    db.commit()
    db.refresh(new_store)
    
    return StoreResponse.model_validate(new_store)


@router.get("/", response_model=List[StoreListResponse])
async def list_stores(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 10,
    active_only: bool = True
):
    """
    List all stores
    """
    query = db.query(Store)
    
    if active_only:
        query = query.filter(Store.is_active == True)
    
    stores = query.offset(skip).limit(limit).all()
    return [StoreListResponse.model_validate(store) for store in stores]


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get store details by ID
    """
    store = db.query(Store).filter(Store.id == store_id).first()
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    enforce_store_scope(current_user, store.id)
    return StoreResponse.model_validate(store)


@router.put("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: int,
    store_data: StoreUpdate,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db)
):
    """
    Update store details
    Only admins can update stores
    """
    store = db.query(Store).filter(Store.id == store_id).first()
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Update fields
    if store_data.name:
        store.name = store_data.name
    if store_data.location:
        store.location = store_data.location
    if store_data.description:
        store.description = store_data.description
    if store_data.phone:
        store.phone = store_data.phone
    if store_data.email:
        store.email = store_data.email
    if store_data.is_active is not None:
        store.is_active = store_data.is_active
    
    db.commit()
    db.refresh(store)
    
    return StoreResponse.model_validate(store)


@router.delete("/{store_id}")
async def delete_store(
    store_id: int,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db)
):
    """
    Delete a store
    Only admins can delete stores
    """
    store = db.query(Store).filter(Store.id == store_id).first()
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    db.delete(store)
    db.commit()
    
    return {"message": "Store deleted successfully"}
    enforce_store_scope(current_user, store.id)
    enforce_store_scope(current_user, store.id)

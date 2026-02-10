"""Store management routes."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.store import Store
from app.models.user import User
from app.schemas.inventory import StoreCreate, StoreListResponse, StoreResponse, StoreUpdate

router = APIRouter(prefix="/api/stores", tags=["stores"])


@router.post("/", response_model=StoreResponse)
async def create_store(
    store_data: StoreCreate,
    current_user: User = Depends(check_permission("superuser")),
    db: Session = Depends(get_db),
):
    """Create a new store (merchant only)."""
    _ = current_user
    new_store = Store(
        merchant_id=current_user.id,
        name=store_data.name,
        location=store_data.location,
        description=store_data.description,
        phone=store_data.phone,
        email=store_data.email,
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
    limit: int = 20,
    active_only: bool = True,
):
    """List stores; admins are store-scoped."""
    query = db.query(Store)
    if active_only:
        query = query.filter(Store.is_active.is_(True))
    if current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(Store.id == current_user.store_id)
    elif current_user.role == "superuser":
        query = query.filter(Store.merchant_id == current_user.id)

    stores = query.order_by(Store.created_at.desc()).offset(skip).limit(limit).all()
    return [StoreListResponse.model_validate(store) for store in stores]


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    enforce_store_scope(current_user, store.id)
    if current_user.role == "superuser" and store.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")
    return StoreResponse.model_validate(store)


@router.put("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: int,
    store_data: StoreUpdate,
    current_user: User = Depends(check_permission("superuser")),
    db: Session = Depends(get_db),
):
    """Update store details (merchant only)."""
    _ = current_user
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    if store.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")

    if store_data.name is not None:
        store.name = store_data.name
    if store_data.location is not None:
        store.location = store_data.location
    if store_data.description is not None:
        store.description = store_data.description
    if store_data.phone is not None:
        store.phone = store_data.phone
    if store_data.email is not None:
        store.email = store_data.email
    if store_data.is_active is not None:
        store.is_active = store_data.is_active

    db.commit()
    db.refresh(store)
    return StoreResponse.model_validate(store)


@router.delete("/{store_id}")
async def delete_store(
    store_id: int,
    current_user: User = Depends(check_permission("superuser")),
    db: Session = Depends(get_db),
):
    """Delete a store (merchant only)."""
    _ = current_user
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    if store.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")

    db.delete(store)
    db.commit()
    return {"message": "Store deleted successfully"}

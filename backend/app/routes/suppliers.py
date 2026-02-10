"""
Supplier management routes.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.supplier import Supplier
from app.models.store import Store
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.post("/", response_model=SupplierResponse)
async def create_supplier(
    payload: SupplierCreate,
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    store_id = payload.store_id or current_user.store_id
    if current_user.role == "admin":
        enforce_store_scope(current_user, store_id)
    if current_user.role == "superuser":
        if store_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Store is required")
        store = db.query(Store).filter(Store.id == store_id).first()
        if not store or store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")

    supplier = Supplier(
        store_id=store_id,
        name=payload.name,
        contact_name=payload.contact_name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)


@router.get("/", response_model=List[SupplierResponse])
async def list_suppliers(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    store_id: Optional[int] = None,
    active_only: bool = True,
):
    query = db.query(Supplier)
    if active_only:
        query = query.filter(Supplier.is_active.is_(True))
    if current_user.role == "admin":
        store_id = current_user.store_id
    if store_id is not None:
        if current_user.role == "superuser":
            store = db.query(Store).filter(Store.id == store_id).first()
            if not store or store.merchant_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")
        query = query.filter(Supplier.store_id == store_id)
    elif current_user.role == "superuser":
        query = query.join(Store, Store.id == Supplier.store_id).filter(Store.merchant_id == current_user.id)
    return [SupplierResponse.model_validate(item) for item in query.order_by(Supplier.created_at.desc()).all()]


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    if current_user.role == "admin":
        enforce_store_scope(current_user, supplier.store_id)
    if current_user.role == "superuser":
        store = db.query(Store).filter(Store.id == supplier.store_id).first()
        if not store or store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Supplier not in your account")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)


@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: int,
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    if current_user.role == "admin":
        enforce_store_scope(current_user, supplier.store_id)
    if current_user.role == "superuser":
        store = db.query(Store).filter(Store.id == supplier.store_id).first()
        if not store or store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Supplier not in your account")

    supplier.is_active = False
    db.commit()
    return {"message": "Supplier deactivated"}

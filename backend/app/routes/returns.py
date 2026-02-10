"""
Returns management routes.
"""
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.product import Product
from app.models.return_request import ReturnRequest
from app.models.store import Store
from app.schemas.returns import ReturnCreate, ReturnResponse, ReturnStatusUpdate
from app.services.stock_service import decrease_stock, increase_stock

router = APIRouter(prefix="/api/returns", tags=["returns"])


def utc_now():
    return datetime.now(timezone.utc)


@router.post("/", response_model=ReturnResponse)
async def create_return(
    payload: ReturnCreate,
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    if current_user.role == "admin":
        enforce_store_scope(current_user, payload.store_id)
    if current_user.role == "superuser":
        store = db.query(Store).filter(Store.id == payload.store_id).first()
        if not store or store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")

    store = db.query(Store).filter(Store.id == payload.store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    return_request = ReturnRequest(
        store_id=payload.store_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        return_type=payload.return_type.lower(),
        status="pending",
        reason=payload.reason,
        created_by=current_user.id,
    )
    db.add(return_request)
    db.commit()
    db.refresh(return_request)
    return ReturnResponse.model_validate(return_request)


@router.get("/", response_model=List[ReturnResponse])
async def list_returns(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    store_id: Optional[int] = None,
    status_filter: Optional[str] = None,
):
    query = db.query(ReturnRequest)
    if current_user.role == "admin":
        store_id = current_user.store_id
    if store_id is not None:
        if current_user.role == "superuser":
            store = db.query(Store).filter(Store.id == store_id).first()
            if not store or store.merchant_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")
        query = query.filter(ReturnRequest.store_id == store_id)
    elif current_user.role == "superuser":
        query = query.join(Store, Store.id == ReturnRequest.store_id).filter(
            Store.merchant_id == current_user.id
        )
    if status_filter:
        query = query.filter(ReturnRequest.status == status_filter.lower())
    records = query.order_by(ReturnRequest.created_at.desc()).all()
    return [ReturnResponse.model_validate(item) for item in records]


@router.post("/{return_id}/status", response_model=ReturnResponse)
async def update_return_status(
    return_id: int,
    payload: ReturnStatusUpdate,
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    record = db.query(ReturnRequest).filter(ReturnRequest.id == return_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")
    if current_user.role == "admin":
        enforce_store_scope(current_user, record.store_id)
    if current_user.role == "superuser":
        store = db.query(Store).filter(Store.id == record.store_id).first()
        if not store or store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Return not in your account")

    new_status = payload.status.lower()
    if new_status not in {"pending", "approved", "completed", "rejected"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    if new_status == "approved":
        record.status = "approved"
    elif new_status == "completed":
        if record.status != "approved":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Return must be approved first")
        product = db.query(Product).filter(Product.id == record.product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        if record.return_type == "customer":
            increase_stock(
                db=db,
                store_id=record.store_id,
                product_id=record.product_id,
                quantity=record.quantity,
                buying_price=product.buying_price,
                selling_price=product.selling_price,
                actor_id=current_user.id,
                event_type="return_customer",
                details=f"Customer return #{record.id}",
                payment_status="paid",
            )
        else:
            decrease_stock(
                db=db,
                store_id=record.store_id,
                product_id=record.product_id,
                quantity=record.quantity,
                actor_id=current_user.id,
                event_type="return_supplier",
                details=f"Supplier return #{record.id}",
            )
        record.status = "completed"
        record.completed_at = utc_now()
        record.handled_by = current_user.id
    elif new_status == "rejected":
        record.status = "rejected"
        record.handled_by = current_user.id
    else:
        record.status = "pending"

    if payload.reason is not None:
        record.reason = payload.reason

    db.commit()
    db.refresh(record)
    return ReturnResponse.model_validate(record)

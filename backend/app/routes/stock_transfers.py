"""
Stock transfer routes.
"""
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.product import Product
from app.models.stock_transfer import StockTransfer
from app.models.store import Store
from app.schemas.stock_transfer import StockTransferCreate, StockTransferResponse, StockTransferStatusUpdate
from app.services.stock_service import decrease_stock, increase_stock

router = APIRouter(prefix="/api/stock-transfers", tags=["stock-transfers"])


def utc_now():
    return datetime.now(timezone.utc)


@router.post("/", response_model=StockTransferResponse)
async def create_transfer(
    payload: StockTransferCreate,
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    if payload.from_store_id == payload.to_store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stores must be different")

    if current_user.role == "admin":
        enforce_store_scope(current_user, payload.from_store_id)
    if current_user.role == "superuser":
        from_store = db.query(Store).filter(Store.id == payload.from_store_id).first()
        to_store = db.query(Store).filter(Store.id == payload.to_store_id).first()
        if not from_store or not to_store:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
        if from_store.merchant_id != current_user.id or to_store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")

    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    from_store = db.query(Store).filter(Store.id == payload.from_store_id).first()
    to_store = db.query(Store).filter(Store.id == payload.to_store_id).first()
    if not from_store or not to_store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    transfer = StockTransfer(
        from_store_id=payload.from_store_id,
        to_store_id=payload.to_store_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        notes=payload.notes,
        created_by=current_user.id,
        status="pending",
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return StockTransferResponse.model_validate(transfer)


@router.get("/", response_model=List[StockTransferResponse])
async def list_transfers(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    store_id: Optional[int] = None,
    status_filter: Optional[str] = None,
):
    query = db.query(StockTransfer)
    if current_user.role == "admin":
        store_id = current_user.store_id
    if store_id is not None:
        if current_user.role == "superuser":
            store = db.query(Store).filter(Store.id == store_id).first()
            if not store or store.merchant_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")
        query = query.filter(
            (StockTransfer.from_store_id == store_id) | (StockTransfer.to_store_id == store_id)
        )
    elif current_user.role == "superuser":
        query = query.join(Store, Store.id == StockTransfer.from_store_id).filter(
            Store.merchant_id == current_user.id
        )
    if status_filter:
        query = query.filter(StockTransfer.status == status_filter.lower())
    transfers = query.order_by(StockTransfer.created_at.desc()).all()
    return [StockTransferResponse.model_validate(item) for item in transfers]


@router.post("/{transfer_id}/status", response_model=StockTransferResponse)
async def update_transfer_status(
    transfer_id: int,
    payload: StockTransferStatusUpdate,
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    transfer = db.query(StockTransfer).filter(StockTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    if current_user.role == "admin":
        enforce_store_scope(current_user, transfer.from_store_id)
    if current_user.role == "superuser":
        store = db.query(Store).filter(Store.id == transfer.from_store_id).first()
        if not store or store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Transfer not in your account")

    new_status = payload.status.lower()
    if new_status not in {"pending", "approved", "completed", "cancelled"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    if new_status == "approved":
        transfer.status = "approved"
        transfer.approved_by = current_user.id
    elif new_status == "completed":
        if transfer.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Transfer must be approved first"
            )
        product = db.query(Product).filter(Product.id == transfer.product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        decrease_stock(
            db=db,
            store_id=transfer.from_store_id,
            product_id=transfer.product_id,
            quantity=transfer.quantity,
            actor_id=current_user.id,
            event_type="stock_transfer_out",
            details=f"Transfer #{transfer.id} to store {transfer.to_store_id}",
        )
        increase_stock(
            db=db,
            store_id=transfer.to_store_id,
            product_id=transfer.product_id,
            quantity=transfer.quantity,
            buying_price=product.buying_price,
            selling_price=product.selling_price,
            actor_id=current_user.id,
            event_type="stock_transfer_in",
            details=f"Transfer #{transfer.id} from store {transfer.from_store_id}",
            payment_status="paid",
        )
        transfer.status = "completed"
        transfer.completed_at = utc_now()
    elif new_status == "cancelled":
        transfer.status = "cancelled"
    else:
        transfer.status = "pending"

    if payload.notes is not None:
        transfer.notes = payload.notes
    db.commit()
    db.refresh(transfer)
    return StockTransferResponse.model_validate(transfer)

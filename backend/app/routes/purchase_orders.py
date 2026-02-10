"""
Purchase order management routes.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.supplier import Supplier
from app.models.store import Store
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderListItem,
    PurchaseOrderResponse,
    PurchaseOrderStatusUpdate,
)
from app.services.stock_service import increase_stock

router = APIRouter(prefix="/api/purchase-orders", tags=["purchase-orders"])


def utc_now():
    return datetime.now(timezone.utc)


@router.post("/", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    payload: PurchaseOrderCreate,
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must include items")

    if current_user.role == "admin":
        enforce_store_scope(current_user, payload.store_id)
    if current_user.role == "superuser":
        store = db.query(Store).filter(Store.id == payload.store_id).first()
        if not store or store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")

    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    if supplier.store_id and supplier.store_id != payload.store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier is not linked to the selected store",
        )

    store = db.query(Store).filter(Store.id == payload.store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    purchase_order = PurchaseOrder(
        supplier_id=payload.supplier_id,
        store_id=payload.store_id,
        created_by=current_user.id,
        status="draft",
        notes=payload.notes,
    )

    total_cost = 0.0
    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        unit_price = item.unit_price if item.unit_price is not None else product.selling_price
        line_total = float(item.quantity) * float(item.unit_cost)
        total_cost += line_total
        purchase_order.items.append(
            PurchaseOrderItem(
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                unit_price=unit_price,
                line_total=line_total,
            )
        )

    purchase_order.total_cost = total_cost
    db.add(purchase_order)
    db.commit()
    db.refresh(purchase_order)
    return PurchaseOrderResponse.model_validate(purchase_order)


@router.get("/", response_model=List[PurchaseOrderListItem])
async def list_purchase_orders(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    store_id: Optional[int] = None,
    status_filter: Optional[str] = None,
):
    query = db.query(PurchaseOrder).join(Supplier, Supplier.id == PurchaseOrder.supplier_id).join(
        Store, Store.id == PurchaseOrder.store_id
    )
    if current_user.role == "admin":
        store_id = current_user.store_id
    if store_id is not None:
        if current_user.role == "superuser":
            store = db.query(Store).filter(Store.id == store_id).first()
            if not store or store.merchant_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")
        query = query.filter(PurchaseOrder.store_id == store_id)
    elif current_user.role == "superuser":
        query = query.filter(Store.merchant_id == current_user.id)
    if status_filter:
        query = query.filter(PurchaseOrder.status == status_filter.lower())

    orders = query.order_by(PurchaseOrder.created_at.desc()).all()
    results = []
    for order in orders:
        results.append(
            PurchaseOrderListItem(
                id=order.id,
                supplier_id=order.supplier_id,
                supplier_name=order.supplier.name if order.supplier else "Unknown",
                store_id=order.store_id,
                store_name=order.store.name if order.store else "Unknown",
                status=order.status,
                total_cost=order.total_cost,
                created_at=order.created_at,
                sent_at=order.sent_at,
                received_at=order.received_at,
            )
        )
    return results


@router.get("/{purchase_order_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    purchase_order_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    if current_user.role == "admin":
        enforce_store_scope(current_user, order.store_id)
    if current_user.role == "superuser":
        store = db.query(Store).filter(Store.id == order.store_id).first()
        if not store or store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Order not in your account")
    return PurchaseOrderResponse.model_validate(order)


@router.post("/{purchase_order_id}/status", response_model=PurchaseOrderResponse)
async def update_purchase_order_status(
    purchase_order_id: int,
    payload: PurchaseOrderStatusUpdate,
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == purchase_order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    if current_user.role == "admin":
        enforce_store_scope(current_user, order.store_id)
    if current_user.role == "superuser":
        store = db.query(Store).filter(Store.id == order.store_id).first()
        if not store or store.merchant_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Order not in your account")

    new_status = payload.status.lower()
    if new_status not in {"draft", "sent", "received", "cancelled"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    if new_status == "sent":
        order.status = "sent"
        order.sent_at = order.sent_at or utc_now()
    elif new_status == "received":
        if order.status == "received":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order already received")
        for item in order.items:
            increase_stock(
                db=db,
                store_id=order.store_id,
                product_id=item.product_id,
                quantity=item.quantity,
                buying_price=item.unit_cost,
                selling_price=item.unit_price or item.unit_cost,
                actor_id=current_user.id,
                event_type="purchase_order_received",
                details=f"PO #{order.id} received",
                payment_status="unpaid",
            )
        order.status = "received"
        order.received_at = order.received_at or utc_now()
    elif new_status == "cancelled":
        order.status = "cancelled"
    else:
        order.status = "draft"

    if payload.notes is not None:
        order.notes = payload.notes

    db.commit()
    db.refresh(order)
    return PurchaseOrderResponse.model_validate(order)

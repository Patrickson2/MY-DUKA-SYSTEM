"""
Sales routes.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.product import Product
from app.models.sale import Sale
from app.models.store import Store
from app.schemas.sales import SaleCreate, SaleResponse
from app.services.stock_service import decrease_stock

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.post("/", response_model=SaleResponse)
async def create_sale(
    payload: SaleCreate,
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

    unit_price = payload.unit_price if payload.unit_price is not None else product.selling_price
    unit_cost = product.buying_price
    total_price = float(unit_price) * float(payload.quantity)
    total_cost = float(unit_cost) * float(payload.quantity)

    decrease_stock(
        db=db,
        store_id=payload.store_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        actor_id=current_user.id,
        event_type="sale_recorded",
        details="Sale recorded",
    )

    sale = Sale(
        store_id=payload.store_id,
        product_id=payload.product_id,
        created_by=current_user.id,
        quantity=payload.quantity,
        unit_price=unit_price,
        unit_cost=unit_cost,
        total_price=total_price,
        total_cost=total_cost,
        notes=payload.notes,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return SaleResponse.model_validate(sale)


@router.get("/", response_model=List[SaleResponse])
async def list_sales(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    store_id: Optional[int] = None,
):
    query = db.query(Sale)
    if current_user.role == "admin":
        store_id = current_user.store_id
    if store_id is not None:
        if current_user.role == "superuser":
            store = db.query(Store).filter(Store.id == store_id).first()
            if not store or store.merchant_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")
        query = query.filter(Sale.store_id == store_id)
    elif current_user.role == "superuser":
        query = query.join(Store, Store.id == Sale.store_id).filter(Store.merchant_id == current_user.id)
    sales = query.order_by(Sale.created_at.desc()).all()
    return [SaleResponse.model_validate(item) for item in sales]

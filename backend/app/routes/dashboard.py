"""
Dashboard reporting endpoints for admin, clerk, and merchant views.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, distinct, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, get_current_user
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.store import Store
from app.models.supply_request import SupplyRequest
from app.models.user import User
from app.schemas.reports import (
    AdminDashboardResponse,
    AdminDashboardStats,
    AdminPaymentStatusItem,
    AdminSupplyRequestItem,
    ClerkDashboardResponse,
    ClerkDashboardStats,
    ClerkListItem,
    ClerkProductItem,
    MerchantAdminItem,
    MerchantDashboardResponse,
    MerchantDashboardStats,
    MerchantPaymentSummary,
    MerchantPerformanceItem,
    MerchantStoreItem,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _sum_or_zero(value) -> float:
    if value is None:
        return 0.0
    return float(value)


@router.get("/admin/dashboard", response_model=AdminDashboardResponse)
async def admin_dashboard(
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    inventory_query = db.query(Inventory)
    request_query = db.query(SupplyRequest)
    clerk_query = db.query(User).filter(User.role == "clerk")

    if current_user.store_id:
        inventory_query = inventory_query.filter(Inventory.store_id == current_user.store_id)
        request_query = request_query.filter(SupplyRequest.store_id == current_user.store_id)
        clerk_query = clerk_query.filter(User.store_id == current_user.store_id)

    active_clerks = clerk_query.filter(User.is_active.is_(True)).count()
    pending_requests = request_query.filter(SupplyRequest.status == "pending").count()
    unpaid_products = (
        inventory_query.filter(Inventory.payment_status == "unpaid")
        .with_entities(distinct(Inventory.product_id))
        .count()
    )
    store_value = _sum_or_zero(
        inventory_query.with_entities(
            func.sum(Inventory.quantity_in_stock * Inventory.selling_price)
        ).scalar()
    )

    raw_requests = (
        request_query.join(Product, Product.id == SupplyRequest.product_id)
        .join(User, User.id == SupplyRequest.requested_by)
        .order_by(SupplyRequest.created_at.desc())
        .limit(30)
        .all()
    )
    supply_requests = [
        AdminSupplyRequestItem(
            id=item.id,
            product=item.product.name,
            quantity=item.quantity_requested,
            requested_by=f"{item.requested_by_user.first_name} {item.requested_by_user.last_name}",
            date=item.created_at,
            notes=item.reason,
            status=item.status.capitalize(),
        )
        for item in raw_requests
    ]

    raw_inventory = inventory_query.join(Product, Product.id == Inventory.product_id).order_by(
        Inventory.updated_at.desc()
    ).limit(50).all()
    payment_status = [
        AdminPaymentStatusItem(
            inventory_id=item.id,
            product=item.product.name,
            supplier=None,
            stock=item.quantity_in_stock,
            buy_price=item.buying_price,
            payment_status=item.payment_status.capitalize(),
        )
        for item in raw_inventory
    ]

    clerks = [
        ClerkListItem(
            id=clerk.id,
            name=f"{clerk.first_name} {clerk.last_name}",
            email=clerk.email,
            joined_date=clerk.created_at,
            status="Active" if clerk.is_active else "Inactive",
        )
        for clerk in clerk_query.order_by(User.created_at.desc()).limit(50).all()
    ]

    return AdminDashboardResponse(
        stats=AdminDashboardStats(
            active_clerks=active_clerks,
            pending_requests=pending_requests,
            unpaid_products=unpaid_products,
            store_value=store_value,
        ),
        supply_requests=supply_requests,
        payment_status=payment_status,
        clerks=clerks,
    )


@router.get("/clerk/dashboard", response_model=ClerkDashboardResponse)
async def clerk_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "clerk":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clerks can access clerk dashboard",
        )

    records = (
        db.query(Inventory)
        .join(Product, Product.id == Inventory.product_id)
        .filter(Inventory.created_by == current_user.id)
        .order_by(Inventory.created_at.desc())
        .all()
    )

    total_products = len({record.product_id for record in records})
    total_stock = sum(record.quantity_in_stock for record in records)
    spoilt_items = sum(record.quantity_spoilt for record in records)

    products = [
        ClerkProductItem(
            inventory_id=record.id,
            product=record.product.name,
            category=record.product.description,
            stock=record.quantity_in_stock,
            spoil=record.quantity_spoilt,
            buy_price=record.buying_price,
            sell_price=record.selling_price,
            payment_status=record.payment_status.capitalize(),
        )
        for record in records
    ]

    return ClerkDashboardResponse(
        stats=ClerkDashboardStats(
            total_products=total_products,
            total_stock=total_stock,
            spoilt_items=spoilt_items,
        ),
        products=products,
    )


@router.get("/merchant/dashboard", response_model=MerchantDashboardResponse)
async def merchant_dashboard(
    current_user: User = Depends(check_permission("superuser")),
    db: Session = Depends(get_db),
):
    _ = current_user

    active_stores = db.query(Store).filter(Store.is_active.is_(True)).count()
    active_admins = (
        db.query(User).filter(User.role == "admin", User.is_active.is_(True)).count()
    )
    total_products = db.query(Product).filter(Product.is_active.is_(True)).count()
    estimated_revenue = _sum_or_zero(
        db.query(func.sum(Inventory.quantity_in_stock * Inventory.selling_price)).scalar()
    )

    performance_rows = (
        db.query(
            Product.name.label("product"),
            func.sum(Inventory.quantity_in_stock * Inventory.selling_price).label("sales"),
            func.sum(
                (Inventory.selling_price - Inventory.buying_price) * Inventory.quantity_in_stock
            ).label("profit"),
        )
        .join(Inventory, Inventory.product_id == Product.id)
        .group_by(Product.id)
        .order_by(func.sum(Inventory.quantity_in_stock * Inventory.selling_price).desc())
        .limit(10)
        .all()
    )
    performance = [
        MerchantPerformanceItem(
            product=row.product,
            sales=_sum_or_zero(row.sales),
            profit=_sum_or_zero(row.profit),
        )
        for row in performance_rows
    ]

    paid_amount = _sum_or_zero(
        db.query(
            func.sum(
                case(
                    (Inventory.payment_status == "paid", Inventory.buying_price * Inventory.quantity_in_stock),
                    else_=0,
                )
            )
        ).scalar()
    )
    unpaid_amount = _sum_or_zero(
        db.query(
            func.sum(
                case(
                    (Inventory.payment_status == "unpaid", Inventory.buying_price * Inventory.quantity_in_stock),
                    else_=0,
                )
            )
        ).scalar()
    )
    total_payment = paid_amount + unpaid_amount
    paid_percentage = (paid_amount / total_payment * 100.0) if total_payment else 0.0
    unpaid_percentage = (unpaid_amount / total_payment * 100.0) if total_payment else 0.0

    admin_by_store = {
        admin.store_id: admin
        for admin in db.query(User).filter(User.role == "admin").all()
        if admin.store_id is not None
    }
    stores = []
    for store in db.query(Store).order_by(Store.created_at.desc()).all():
        admin = admin_by_store.get(store.id)
        admin_name = None
        if admin:
            admin_name = f"{admin.first_name} {admin.last_name}"
        stores.append(
            MerchantStoreItem(
                id=store.id,
                name=store.name,
                location=store.location,
                admin_name=admin_name,
                status="Active" if store.is_active else "Inactive",
            )
        )

    admins = []
    for admin in db.query(User).filter(User.role == "admin").order_by(User.created_at.desc()).all():
        store_name = None
        if admin.store_id:
            store = db.query(Store).filter(Store.id == admin.store_id).first()
            store_name = store.name if store else None
        admins.append(
            MerchantAdminItem(
                id=admin.id,
                name=f"{admin.first_name} {admin.last_name}",
                email=admin.email,
                store=store_name,
                status="Active" if admin.is_active else "Inactive",
            )
        )

    return MerchantDashboardResponse(
        stats=MerchantDashboardStats(
            active_stores=active_stores,
            active_admins=active_admins,
            total_products=total_products,
            estimated_revenue=estimated_revenue,
        ),
        performance=performance,
        payment_summary=MerchantPaymentSummary(
            paid_amount=paid_amount,
            unpaid_amount=unpaid_amount,
            paid_percentage=paid_percentage,
            unpaid_percentage=unpaid_percentage,
        ),
        stores=stores,
        admins=admins,
    )

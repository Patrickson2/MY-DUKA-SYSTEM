"""Dashboard reporting endpoints for admin, clerk, and merchant views."""
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
from app.schemas.inventory import StoreListResponse
from app.schemas.product import ProductListResponse
from app.schemas.reports import (
    AdminDashboardResponse,
    AdminDashboardStats,
    AdminPaymentStatusItem,
    AdminSupplyRequestItem,
    ClerkDashboardResponse,
    ClerkDashboardStats,
    ClerkOverviewResponse,
    ClerkListItem,
    ClerkPerformanceItem,
    ClerkProductItem,
    MerchantAdminItem,
    MerchantDashboardResponse,
    MerchantDashboardStats,
    MerchantPaymentSummary,
    MerchantPerformanceItem,
    MerchantStoreItem,
    SupplyRequestResponse,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _sum_or_zero(value) -> float:
    return 0.0 if value is None else float(value)


def _get_clerk_inventory(current_user: User, db: Session):
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

    stats = ClerkDashboardStats(
        total_products=total_products,
        total_stock=total_stock,
        spoilt_items=spoilt_items,
    )
    return stats, products


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
    elif current_user.role == "superuser":
        store_ids = [
            row.id
            for row in db.query(Store.id).filter(Store.merchant_id == current_user.id).all()
        ]
        if store_ids:
            inventory_query = inventory_query.filter(Inventory.store_id.in_(store_ids))
            request_query = request_query.filter(SupplyRequest.store_id.in_(store_ids))
            clerk_query = clerk_query.filter(User.store_id.in_(store_ids))

    active_clerks = clerk_query.filter(User.is_active.is_(True)).count()
    pending_requests = request_query.filter(SupplyRequest.status == "pending").count()
    unpaid_products = (
        inventory_query.filter(Inventory.payment_status == "unpaid")
        .with_entities(distinct(Inventory.product_id))
        .count()
    )
    store_value = _sum_or_zero(
        inventory_query.with_entities(func.sum(Inventory.quantity_in_stock * Inventory.selling_price)).scalar()
    )

    raw_requests = (
        request_query.join(Product, Product.id == SupplyRequest.product_id)
        .join(User, User.id == SupplyRequest.requested_by)
        .order_by(SupplyRequest.created_at.desc())
        .limit(40)
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

    raw_inventory = (
        inventory_query.join(Product, Product.id == Inventory.product_id)
        .order_by(Inventory.updated_at.desc())
        .limit(80)
        .all()
    )
    payment_status = [
        AdminPaymentStatusItem(
            inventory_id=item.id,
            product=item.product.name,
            stock=item.quantity_in_stock,
            buy_price=item.buying_price,
            payment_status=item.payment_status.capitalize(),
        )
        for item in raw_inventory
    ]

    clerks_raw = clerk_query.order_by(User.created_at.desc()).limit(80).all()
    clerks = [
        ClerkListItem(
            id=clerk.id,
            name=f"{clerk.first_name} {clerk.last_name}",
            email=clerk.email,
            joined_date=clerk.created_at,
            status="Active" if clerk.is_active else "Inactive",
        )
        for clerk in clerks_raw
    ]

    performance_rows = (
        inventory_query.with_entities(
            Inventory.created_by,
            func.count(Inventory.id),
            func.sum(Inventory.quantity_in_stock),
            func.sum(Inventory.quantity_spoilt),
        )
        .group_by(Inventory.created_by)
        .all()
    )
    metrics_by_clerk = {
        row[0]: {
            "recorded_items": int(row[1] or 0),
            "total_stock_recorded": int(row[2] or 0),
            "spoilt_recorded": int(row[3] or 0),
        }
        for row in performance_rows
    }
    clerk_performance = []
    for clerk in clerks_raw:
        metric = metrics_by_clerk.get(clerk.id, {})
        clerk_performance.append(
            ClerkPerformanceItem(
                clerk_id=clerk.id,
                name=f"{clerk.first_name} {clerk.last_name}",
                recorded_items=metric.get("recorded_items", 0),
                total_stock_recorded=metric.get("total_stock_recorded", 0),
                spoilt_recorded=metric.get("spoilt_recorded", 0),
            )
        )

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
        clerk_performance=clerk_performance,
    )


@router.get("/clerk/dashboard", response_model=ClerkDashboardResponse)
async def clerk_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "clerk":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only clerks can access clerk dashboard")
    stats, products = _get_clerk_inventory(current_user, db)
    return ClerkDashboardResponse(stats=stats, products=products)


@router.get("/clerk/overview", response_model=ClerkOverviewResponse)
async def clerk_overview(
    lite: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "clerk":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only clerks can access clerk dashboard")

    stats, inventory = _get_clerk_inventory(current_user, db)

    if lite:
        return ClerkOverviewResponse(
            stats=stats,
            inventory=inventory,
            products=[],
            stores=[],
            supply_requests=[],
        )

    store = db.query(Store).filter(Store.id == current_user.store_id).first()
    if store:
        products = (
            db.query(Product)
            .filter(Product.is_active.is_(True), Product.merchant_id == store.merchant_id)
            .order_by(Product.name.asc())
            .limit(200)
            .all()
        )
        stores = (
            db.query(Store)
            .filter(Store.is_active.is_(True), Store.id == store.id)
            .order_by(Store.created_at.desc())
            .limit(1)
            .all()
        )
    else:
        products = []
        stores = []
    requests = (
        db.query(SupplyRequest)
        .filter(SupplyRequest.requested_by == current_user.id)
        .order_by(SupplyRequest.created_at.desc())
        .limit(100)
        .all()
    )

    return ClerkOverviewResponse(
        stats=stats,
        inventory=inventory,
        products=[ProductListResponse.model_validate(item) for item in products],
        stores=[StoreListResponse.model_validate(item) for item in stores],
        supply_requests=[SupplyRequestResponse.model_validate(item) for item in requests],
    )


@router.get("/merchant/dashboard", response_model=MerchantDashboardResponse)
async def merchant_dashboard(
    current_user: User = Depends(check_permission("superuser")),
    db: Session = Depends(get_db),
):
    store_ids = [
        row.id
        for row in db.query(Store.id).filter(Store.merchant_id == current_user.id).all()
    ]
    active_stores = db.query(Store).filter(
        Store.is_active.is_(True), Store.merchant_id == current_user.id
    ).count()
    active_admins = (
        db.query(User)
        .filter(User.role == "admin", User.is_active.is_(True), User.store_id.in_(store_ids))
        .count()
        if store_ids
        else 0
    )
    total_products = db.query(Product).filter(
        Product.is_active.is_(True), Product.merchant_id == current_user.id
    ).count()
    estimated_revenue = _sum_or_zero(
        db.query(func.sum(Inventory.quantity_in_stock * Inventory.selling_price))
        .join(Store, Store.id == Inventory.store_id)
        .filter(Store.merchant_id == current_user.id)
        .scalar()
    )

    performance_rows = (
        db.query(
            Product.name.label("product"),
            func.sum(Inventory.quantity_in_stock * Inventory.selling_price).label("sales"),
            func.sum((Inventory.selling_price - Inventory.buying_price) * Inventory.quantity_in_stock).label("profit"),
        )
        .join(Inventory, Inventory.product_id == Product.id)
        .join(Store, Store.id == Inventory.store_id)
        .filter(Store.merchant_id == current_user.id)
        .group_by(Product.id)
        .order_by(func.sum(Inventory.quantity_in_stock * Inventory.selling_price).desc())
        .limit(12)
        .all()
    )
    performance = [
        MerchantPerformanceItem(product=row.product, sales=_sum_or_zero(row.sales), profit=_sum_or_zero(row.profit))
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
        )
        .join(Store, Store.id == Inventory.store_id)
        .filter(Store.merchant_id == current_user.id)
        .scalar()
    )
    unpaid_amount = _sum_or_zero(
        db.query(
            func.sum(
                case(
                    (Inventory.payment_status == "unpaid", Inventory.buying_price * Inventory.quantity_in_stock),
                    else_=0,
                )
            )
        )
        .join(Store, Store.id == Inventory.store_id)
        .filter(Store.merchant_id == current_user.id)
        .scalar()
    )

    total_payment = paid_amount + unpaid_amount
    paid_percentage = (paid_amount / total_payment * 100.0) if total_payment else 0.0
    unpaid_percentage = (unpaid_amount / total_payment * 100.0) if total_payment else 0.0

    store_rows = (
        db.query(
            Store.id,
            Store.name,
            Store.location,
            Store.is_active,
            func.sum(Inventory.quantity_in_stock * Inventory.selling_price).label("sales_total"),
            func.sum(
                case(
                    (Inventory.payment_status == "paid", Inventory.buying_price * Inventory.quantity_in_stock),
                    else_=0,
                )
            ).label("paid_total"),
            func.sum(
                case(
                    (Inventory.payment_status == "unpaid", Inventory.buying_price * Inventory.quantity_in_stock),
                    else_=0,
                )
            ).label("unpaid_total"),
        )
        .outerjoin(Inventory, Inventory.store_id == Store.id)
        .filter(Store.merchant_id == current_user.id)
        .group_by(Store.id)
        .order_by(Store.created_at.desc())
        .all()
    )

    admins = (
        db.query(User)
        .filter(User.role == "admin", User.store_id.in_(store_ids))
        .order_by(User.created_at.desc())
        .all()
        if store_ids
        else []
    )
    admin_by_store = {admin.store_id: admin for admin in admins if admin.store_id is not None}
    store_name_by_id = {row.id: row.name for row in store_rows}

    stores = [
        MerchantStoreItem(
            id=row.id,
            name=row.name,
            location=row.location,
            admin_name=(
                f"{admin_by_store[row.id].first_name} {admin_by_store[row.id].last_name}"
                if row.id in admin_by_store
                else None
            ),
            status="Active" if row.is_active else "Inactive",
            sales_total=_sum_or_zero(row.sales_total),
            paid_total=_sum_or_zero(row.paid_total),
            unpaid_total=_sum_or_zero(row.unpaid_total),
        )
        for row in store_rows
    ]

    admin_items = [
        MerchantAdminItem(
            id=admin.id,
            name=f"{admin.first_name} {admin.last_name}",
            email=admin.email,
            store=store_name_by_id.get(admin.store_id),
            status="Active" if admin.is_active else "Inactive",
        )
        for admin in admins
    ]

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
        admins=admin_items,
    )

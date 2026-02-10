"""
Analytics and reporting routes.
"""
import csv
from io import StringIO
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission
from app.models.expense import Expense
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.sale import Sale
from app.models.store import Store
from app.schemas.analytics import (
    ExpenseCategoryItem,
    FinancialSummaryResponse,
    PaymentTrendPoint,
    ProductPerformanceItem,
    SalesTrendPoint,
    StorePerformanceItem,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _sum_or_zero(value) -> float:
    return 0.0 if value is None else float(value)


@router.get("/store-performance", response_model=List[StorePerformanceItem])
async def store_performance(
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
    limit: int = 10,
):
    query = (
        db.query(
            Store.id,
            Store.name,
            func.sum(Sale.total_price).label("total_sales"),
            func.sum(Sale.total_price - Sale.total_cost).label("total_profit"),
            func.count(Sale.id).label("orders"),
        )
        .outerjoin(Sale, Sale.store_id == Store.id)
        .group_by(Store.id)
        .order_by(func.sum(Sale.total_price).desc())
    )
    if current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(Store.id == current_user.store_id)
    if current_user.role == "superuser":
        query = query.filter(Store.merchant_id == current_user.id)

    query = query.limit(limit)
    rows = query.all()
    return [
        StorePerformanceItem(
            store_id=row.id,
            store_name=row.name,
            total_sales=_sum_or_zero(row.total_sales),
            total_profit=_sum_or_zero(row.total_profit),
            orders=int(row.orders or 0),
        )
        for row in rows
    ]


@router.get("/top-products", response_model=List[ProductPerformanceItem])
async def top_products(
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
    limit: int = 10,
):
    query = (
        db.query(
            Product.id,
            Product.name,
            func.sum(Sale.quantity).label("quantity_sold"),
            func.sum(Sale.total_price).label("total_sales"),
            func.sum(Sale.total_price - Sale.total_cost).label("total_profit"),
        )
        .join(Sale, Sale.product_id == Product.id)
        .group_by(Product.id)
        .order_by(func.sum(Sale.total_price).desc())
    )
    if current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(Sale.store_id == current_user.store_id)
    if current_user.role == "superuser":
        query = query.join(Store, Store.id == Sale.store_id).filter(Store.merchant_id == current_user.id)

    query = query.limit(limit)
    rows = query.all()
    return [
        ProductPerformanceItem(
            product_id=row.id,
            product_name=row.name,
            quantity_sold=int(row.quantity_sold or 0),
            total_sales=_sum_or_zero(row.total_sales),
            total_profit=_sum_or_zero(row.total_profit),
        )
        for row in rows
    ]


@router.get("/slow-movers", response_model=List[ProductPerformanceItem])
async def slow_movers(
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
    limit: int = 10,
):
    query = (
        db.query(
            Product.id,
            Product.name,
            func.sum(Sale.quantity).label("quantity_sold"),
            func.sum(Sale.total_price).label("total_sales"),
            func.sum(Sale.total_price - Sale.total_cost).label("total_profit"),
        )
        .join(Sale, Sale.product_id == Product.id)
        .group_by(Product.id)
        .order_by(func.sum(Sale.quantity).asc())
    )
    if current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(Sale.store_id == current_user.store_id)
    if current_user.role == "superuser":
        query = query.join(Store, Store.id == Sale.store_id).filter(Store.merchant_id == current_user.id)

    query = query.limit(limit)
    rows = query.all()
    return [
        ProductPerformanceItem(
            product_id=row.id,
            product_name=row.name,
            quantity_sold=int(row.quantity_sold or 0),
            total_sales=_sum_or_zero(row.total_sales),
            total_profit=_sum_or_zero(row.total_profit),
        )
        for row in rows
    ]


@router.get("/payment-trend", response_model=List[PaymentTrendPoint])
async def payment_trend(
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    date_col = func.date(Inventory.created_at)
    query = db.query(
        date_col.label("date"),
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
    if current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(Inventory.store_id == current_user.store_id)
    if current_user.role == "superuser":
        query = query.join(Store, Store.id == Inventory.store_id).filter(Store.merchant_id == current_user.id)

    rows = query.group_by(date_col).order_by(date_col.desc()).limit(days).all()
    return [
        PaymentTrendPoint(
            date=row.date,
            paid_total=_sum_or_zero(row.paid_total),
            unpaid_total=_sum_or_zero(row.unpaid_total),
        )
        for row in rows
    ]


@router.get("/financial-summary", response_model=FinancialSummaryResponse)
async def financial_summary(
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    sales_query = db.query(func.sum(Sale.total_price), func.sum(Sale.total_cost))
    expense_query = db.query(func.sum(Expense.amount))
    if current_user.role == "admin" and current_user.store_id is not None:
        sales_query = sales_query.filter(Sale.store_id == current_user.store_id)
        expense_query = expense_query.filter(Expense.store_id == current_user.store_id)
    if current_user.role == "superuser":
        sales_query = sales_query.join(Store, Store.id == Sale.store_id).filter(
            Store.merchant_id == current_user.id
        )
        expense_query = expense_query.join(Store, Store.id == Expense.store_id).filter(
            Store.merchant_id == current_user.id
        )

    total_sales, total_cost = sales_query.first()
    total_expenses = expense_query.scalar()
    total_sales = _sum_or_zero(total_sales)
    total_cost = _sum_or_zero(total_cost)
    total_expenses = _sum_or_zero(total_expenses)

    gross_profit = total_sales - total_cost
    net_profit = gross_profit - total_expenses

    return FinancialSummaryResponse(
        total_sales=total_sales,
        total_cost=total_cost,
        gross_profit=gross_profit,
        total_expenses=total_expenses,
        net_profit=net_profit,
    )


@router.get("/expenses-by-category", response_model=List[ExpenseCategoryItem])
async def expenses_by_category(
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(Expense.category, func.sum(Expense.amount).label("total_amount")).group_by(Expense.category)
    if current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(Expense.store_id == current_user.store_id)
    if current_user.role == "superuser":
        query = query.join(Store, Store.id == Expense.store_id).filter(Store.merchant_id == current_user.id)

    rows = query.order_by(func.sum(Expense.amount).desc()).all()
    return [ExpenseCategoryItem(category=row.category, total_amount=_sum_or_zero(row.total_amount)) for row in rows]


@router.get("/sales-trend", response_model=List[SalesTrendPoint])
async def sales_trend(
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    date_col = func.date(Sale.created_at)
    query = db.query(
        date_col.label("date"),
        func.sum(Sale.total_price).label("total_sales"),
        func.sum(Sale.total_price - Sale.total_cost).label("total_profit"),
    )
    if current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(Sale.store_id == current_user.store_id)
    if current_user.role == "superuser":
        query = query.join(Store, Store.id == Sale.store_id).filter(Store.merchant_id == current_user.id)
    rows = query.group_by(date_col).order_by(date_col.desc()).limit(days).all()
    return [
        SalesTrendPoint(
            date=row.date,
            total_sales=_sum_or_zero(row.total_sales),
            total_profit=_sum_or_zero(row.total_profit),
        )
        for row in rows
    ]


def _csv_response(filename: str, headers: list[str], rows: list[list]) -> Response:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/store-performance/export")
async def export_store_performance(
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    items = await store_performance(current_user=current_user, db=db, limit=limit)
    rows = [[item.store_id, item.store_name, item.total_sales, item.total_profit, item.orders] for item in items]
    return _csv_response("store-performance.csv", ["Store ID", "Store", "Sales", "Profit", "Orders"], rows)


@router.get("/top-products/export")
async def export_top_products(
    current_user=Depends(check_permission("admin")),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    items = await top_products(current_user=current_user, db=db, limit=limit)
    rows = [
        [item.product_id, item.product_name, item.quantity_sold, item.total_sales, item.total_profit]
        for item in items
    ]
    return _csv_response(
        "top-products.csv", ["Product ID", "Product", "Qty Sold", "Sales", "Profit"], rows
    )

"""
Expense routes.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.expense import Expense
from app.models.store import Store
from app.schemas.expenses import ExpenseCreate, ExpenseResponse

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.post("/", response_model=ExpenseResponse)
async def create_expense(
    payload: ExpenseCreate,
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

    expense = Expense(
        store_id=payload.store_id,
        created_by=current_user.id,
        category=payload.category,
        amount=payload.amount,
        description=payload.description,
        incurred_at=payload.incurred_at or expense_incurred_at(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return ExpenseResponse.model_validate(expense)


def expense_incurred_at():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc)


@router.get("/", response_model=List[ExpenseResponse])
async def list_expenses(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    store_id: Optional[int] = None,
):
    query = db.query(Expense)
    if current_user.role == "admin":
        store_id = current_user.store_id
    if store_id is not None:
        if current_user.role == "superuser":
            store = db.query(Store).filter(Store.id == store_id).first()
            if not store or store.merchant_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")
        query = query.filter(Expense.store_id == store_id)
    elif current_user.role == "superuser":
        query = query.join(Store, Store.id == Expense.store_id).filter(Store.merchant_id == current_user.id)
    expenses = query.order_by(Expense.incurred_at.desc()).all()
    return [ExpenseResponse.model_validate(item) for item in expenses]

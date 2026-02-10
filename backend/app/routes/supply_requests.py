"""Supply request management routes."""
import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import check_permission, enforce_store_scope, get_current_user
from app.models.product import Product
from app.models.store import Store
from app.models.supply_request import SupplyRequest, SupplyRequestStatus
from app.models.user import User
from app.schemas.reports import (
    SupplyRequestApprove,
    SupplyRequestCreate,
    SupplyRequestDecline,
    SupplyRequestResponse,
)
from app.services.notification_service import (
    notify_supply_request_pending,
    notify_supply_request_status,
)

router = APIRouter(prefix="/api/supply-requests", tags=["supply_requests"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=SupplyRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_supply_request(
    request_data: SupplyRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a supply request (typically by clerk)."""
    product = db.query(Product).filter(Product.id == request_data.product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    store = db.query(Store).filter(Store.id == request_data.store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    if current_user.role == "superuser" and store.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")

    enforce_store_scope(current_user, store.id)

    new_request = SupplyRequest(
        product_id=request_data.product_id,
        store_id=request_data.store_id,
        requested_by=current_user.id,
        quantity_requested=request_data.quantity_requested,
        reason=request_data.reason,
        status=SupplyRequestStatus.PENDING,
    )

    db.add(new_request)
    db.flush()
    requester_name = f"{current_user.first_name} {current_user.last_name}".strip()
    notify_supply_request_pending(
        db,
        store_id=new_request.store_id,
        product_id=new_request.product_id,
        quantity_requested=new_request.quantity_requested,
        requested_by_name=requester_name,
    )
    db.commit()
    db.refresh(new_request)
    logger.info("Supply request created user_id=%s request_id=%s", current_user.id, new_request.id)
    return SupplyRequestResponse.model_validate(new_request)


@router.get("/", response_model=List[SupplyRequestResponse])
async def list_supply_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
    status: str | None = None,
    store_id: int | None = None,
):
    """List supply requests by role scope."""
    query = db.query(SupplyRequest)

    if current_user.role == "clerk":
        query = query.filter(SupplyRequest.requested_by == current_user.id)
    elif current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(SupplyRequest.store_id == current_user.store_id)
    elif current_user.role == "superuser":
        query = query.join(Store, Store.id == SupplyRequest.store_id).filter(
            Store.merchant_id == current_user.id
        )

    if store_id is not None:
        enforce_store_scope(current_user, store_id)
        query = query.filter(SupplyRequest.store_id == store_id)

    if status is not None:
        query = query.filter(SupplyRequest.status == status)

    requests = query.order_by(SupplyRequest.created_at.desc()).offset(skip).limit(limit).all()
    return [SupplyRequestResponse.model_validate(req) for req in requests]


@router.get("/{request_id}", response_model=SupplyRequestResponse)
async def get_supply_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    supply_request = db.query(SupplyRequest).filter(SupplyRequest.id == request_id).first()
    if not supply_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supply request not found")

    if current_user.role == "clerk" and supply_request.requested_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view other clerks' requests")

    enforce_store_scope(current_user, supply_request.store_id)
    if current_user.role == "superuser" and supply_request.store.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Request not in your account")
    return SupplyRequestResponse.model_validate(supply_request)


@router.post("/{request_id}/approve")
async def approve_supply_request(
    request_id: int,
    approval_data: SupplyRequestApprove,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    supply_request = db.query(SupplyRequest).filter(SupplyRequest.id == request_id).first()
    if not supply_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supply request not found")

    enforce_store_scope(current_user, supply_request.store_id)

    if supply_request.status != SupplyRequestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending requests can be approved")

    supply_request.status = SupplyRequestStatus.APPROVED
    supply_request.admin_notes = approval_data.admin_notes
    supply_request.approved_at = datetime.now(timezone.utc)
    notify_supply_request_status(
        db,
        requester_id=supply_request.requested_by,
        store_id=supply_request.store_id,
        product_id=supply_request.product_id,
        status="approved",
        admin_notes=approval_data.admin_notes,
    )
    db.commit()
    db.refresh(supply_request)

    logger.info("Supply request approved actor_id=%s request_id=%s", current_user.id, supply_request.id)
    return {"message": "Supply request approved successfully", "request": SupplyRequestResponse.model_validate(supply_request)}


@router.post("/{request_id}/decline")
async def decline_supply_request(
    request_id: int,
    decline_data: SupplyRequestDecline,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    supply_request = db.query(SupplyRequest).filter(SupplyRequest.id == request_id).first()
    if not supply_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supply request not found")

    enforce_store_scope(current_user, supply_request.store_id)

    if supply_request.status != SupplyRequestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending requests can be declined")

    supply_request.status = SupplyRequestStatus.DECLINED
    supply_request.admin_notes = decline_data.admin_notes
    supply_request.approved_at = datetime.now(timezone.utc)
    notify_supply_request_status(
        db,
        requester_id=supply_request.requested_by,
        store_id=supply_request.store_id,
        product_id=supply_request.product_id,
        status="declined",
        admin_notes=decline_data.admin_notes,
    )
    db.commit()
    db.refresh(supply_request)

    logger.info("Supply request declined actor_id=%s request_id=%s", current_user.id, supply_request.id)
    return {"message": "Supply request declined successfully", "request": SupplyRequestResponse.model_validate(supply_request)}


@router.get("/pending/all", response_model=List[SupplyRequestResponse])
async def get_pending_requests(
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(SupplyRequest).filter(SupplyRequest.status == SupplyRequestStatus.PENDING)
    if current_user.store_id is not None:
        query = query.filter(SupplyRequest.store_id == current_user.store_id)
    elif current_user.role == "superuser":
        query = query.join(Store, Store.id == SupplyRequest.store_id).filter(
            Store.merchant_id == current_user.id
        )

    requests = query.order_by(SupplyRequest.created_at.desc()).all()
    return [SupplyRequestResponse.model_validate(req) for req in requests]

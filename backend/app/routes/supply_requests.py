"""
Supply request management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_permission
from app.models.user import User
from app.models.supply_request import SupplyRequest, SupplyRequestStatus
from app.models.product import Product
from app.models.store import Store
from app.schemas.reports import (
    SupplyRequestCreate, SupplyRequestResponse,
    SupplyRequestApprove, SupplyRequestDecline
)
from typing import List

router = APIRouter(prefix="/api/supply-requests", tags=["supply_requests"])


@router.post("/", response_model=SupplyRequestResponse)
async def create_supply_request(
    request_data: SupplyRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a supply request
    Clerks can request more products
    """
    # Verify product exists
    product = db.query(Product).filter(Product.id == request_data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Verify store exists
    store = db.query(Store).filter(Store.id == request_data.store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Create supply request
    new_request = SupplyRequest(
        product_id=request_data.product_id,
        store_id=request_data.store_id,
        requested_by=current_user.id,
        quantity_requested=request_data.quantity_requested,
        reason=request_data.reason,
        status=SupplyRequestStatus.PENDING
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return SupplyRequestResponse.model_validate(new_request)


@router.get("/", response_model=List[SupplyRequestResponse])
async def list_supply_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 10,
    status: str = None,
    store_id: int = None
):
    """
    List supply requests
    Clerks see their own, admins see all in their store
    """
    query = db.query(SupplyRequest)
    
    # If clerk, only show their requests
    if current_user.role == "clerk":
        query = query.filter(SupplyRequest.requested_by == current_user.id)
    elif current_user.role == "admin":
        # Admin sees requests for their store only
        if current_user.store_id:
            query = query.filter(SupplyRequest.store_id == current_user.store_id)
    
    # Filter by status if provided
    if status:
        query = query.filter(SupplyRequest.status == status)
    
    # Filter by store if provided
    if store_id:
        query = query.filter(SupplyRequest.store_id == store_id)
    
    requests = query.offset(skip).limit(limit).all()
    return [SupplyRequestResponse.model_validate(req) for req in requests]


@router.get("/{request_id}", response_model=SupplyRequestResponse)
async def get_supply_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get supply request details
    """
    supply_request = db.query(SupplyRequest).filter(SupplyRequest.id == request_id).first()
    
    if not supply_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supply request not found"
        )
    
    # Check permissions
    if current_user.role == "clerk" and supply_request.requested_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other clerks' requests"
        )
    
    return SupplyRequestResponse.model_validate(supply_request)


@router.post("/{request_id}/approve")
async def approve_supply_request(
    request_id: int,
    approval_data: SupplyRequestApprove,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db)
):
    """
    Approve a supply request
    Only admins can approve
    """
    supply_request = db.query(SupplyRequest).filter(SupplyRequest.id == request_id).first()
    
    if not supply_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supply request not found"
        )
    
    if supply_request.status != SupplyRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending requests can be approved"
        )
    
    supply_request.status = SupplyRequestStatus.APPROVED
    supply_request.admin_notes = approval_data.admin_notes
    supply_request.approved_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(supply_request)
    
    return {
        "message": "Supply request approved successfully",
        "request": SupplyRequestResponse.model_validate(supply_request)
    }


@router.post("/{request_id}/decline")
async def decline_supply_request(
    request_id: int,
    decline_data: SupplyRequestDecline,
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db)
):
    """
    Decline a supply request
    Only admins can decline
    """
    supply_request = db.query(SupplyRequest).filter(SupplyRequest.id == request_id).first()
    
    if not supply_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supply request not found"
        )
    
    if supply_request.status != SupplyRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending requests can be declined"
        )
    
    supply_request.status = SupplyRequestStatus.DECLINED
    supply_request.admin_notes = decline_data.admin_notes
    supply_request.approved_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(supply_request)
    
    return {
        "message": "Supply request declined successfully",
        "request": SupplyRequestResponse.model_validate(supply_request)
    }


@router.get("/pending/all")
async def get_pending_requests(
    current_user: User = Depends(check_permission("admin")),
    db: Session = Depends(get_db)
):
    """
    Get all pending supply requests for admin's store
    Only admins can view
    """
    if current_user.store_id:
        requests = db.query(SupplyRequest).filter(
            SupplyRequest.store_id == current_user.store_id,
            SupplyRequest.status == SupplyRequestStatus.PENDING
        ).all()
    else:
        requests = db.query(SupplyRequest).filter(
            SupplyRequest.status == SupplyRequestStatus.PENDING
        ).all()
    
    return [SupplyRequestResponse.model_validate(req) for req in requests]

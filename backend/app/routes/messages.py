"""Messaging routes for sending notifications."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.store import Store
from app.models.user import User, UserRole
from app.schemas.messages import MessageCreate, MessageRecipientResponse
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _recipient_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip()


@router.get("/recipients", response_model=list[MessageRecipientResponse])
async def list_message_recipients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.ADMIN.value:
        query = db.query(User).filter(User.is_active.is_(True))
        recipients = query.filter(
            ((User.role == UserRole.CLERK.value) & (User.store_id == current_user.store_id))
            | (User.role == UserRole.SUPERUSER.value)
        ).all()
    elif current_user.role == UserRole.SUPERUSER.value:
        store_ids = [
            row.id
            for row in db.query(Store.id).filter(Store.merchant_id == current_user.id).all()
        ]
        recipients = (
            db.query(User)
            .filter(
                User.is_active.is_(True),
                User.role == UserRole.ADMIN.value,
                User.store_id.in_(store_ids) if store_ids else False,
            )
            .all()
        )
    elif current_user.role == UserRole.CLERK.value:
        recipients = (
            db.query(User)
            .filter(
                User.is_active.is_(True),
                User.role == UserRole.ADMIN.value,
                User.store_id == current_user.store_id,
            )
            .all()
        )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to message.")

    return [
        MessageRecipientResponse(
            id=user.id,
            name=_recipient_name(user),
            email=user.email,
            role=user.role,
            store_id=user.store_id,
        )
        for user in recipients
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def send_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipient = db.query(User).filter(User.id == payload.recipient_id, User.is_active.is_(True)).first()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")

    if current_user.role == UserRole.ADMIN.value:
        allowed = (
            (recipient.role == UserRole.CLERK.value and recipient.store_id == current_user.store_id)
            or recipient.role == UserRole.SUPERUSER.value
        )
    elif current_user.role == UserRole.SUPERUSER.value:
        store = db.query(Store).filter(Store.id == recipient.store_id).first()
        allowed = recipient.role == UserRole.ADMIN.value and store and store.merchant_id == current_user.id
    elif current_user.role == UserRole.CLERK.value:
        allowed = (
            recipient.role == UserRole.ADMIN.value
            and recipient.store_id == current_user.store_id
        )
    else:
        allowed = False

    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot message this user.")

    sender_name = _recipient_name(current_user)
    create_notification(
        db,
        user_id=recipient.id,
        category="message",
        title=f"New message from {sender_name}",
        message=payload.message,
        store_id=recipient.store_id,
    )
    db.commit()
    return {"message": "Message sent."}

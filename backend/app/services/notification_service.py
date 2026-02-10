"""
Notification and inventory timeline helper functions.
"""
from typing import Iterable, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.inventory import Inventory
from app.models.inventory_event import InventoryEvent
from app.models.notification import Notification
from app.models.store import Store
from app.models.stock_threshold import StockThreshold
from app.models.user import User


def create_inventory_event(
    db: Session,
    *,
    inventory_id: Optional[int],
    product_id: int,
    store_id: int,
    actor_id: int,
    event_type: str,
    old_quantity_in_stock: Optional[int] = None,
    new_quantity_in_stock: Optional[int] = None,
    old_payment_status: Optional[str] = None,
    new_payment_status: Optional[str] = None,
    details: Optional[str] = None,
) -> InventoryEvent:
    event = InventoryEvent(
        inventory_id=inventory_id,
        product_id=product_id,
        store_id=store_id,
        actor_id=actor_id,
        event_type=event_type,
        old_quantity_in_stock=old_quantity_in_stock,
        new_quantity_in_stock=new_quantity_in_stock,
        old_payment_status=old_payment_status,
        new_payment_status=new_payment_status,
        details=details,
    )
    db.add(event)
    return event


def create_notification(
    db: Session,
    *,
    user_id: int,
    category: str,
    title: str,
    message: str,
    store_id: Optional[int] = None,
    product_id: Optional[int] = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        store_id=store_id,
        product_id=product_id,
        category=category,
        title=title,
        message=message,
    )
    db.add(notification)
    return notification


def _get_store_admins_and_superusers(db: Session, store_id: int) -> list[User]:
    store = db.query(Store).filter(Store.id == store_id).first()
    merchant_id = store.merchant_id if store else None
    return (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            ((User.role == "admin") & (User.store_id == store_id))
            | ((User.role == "superuser") & (User.id == merchant_id)),
        )
        .all()
    )


def notify_users(
    db: Session,
    *,
    users: Iterable[User],
    category: str,
    title: str,
    message: str,
    store_id: Optional[int] = None,
    product_id: Optional[int] = None,
) -> None:
    for user in users:
        create_notification(
            db,
            user_id=user.id,
            category=category,
            title=title,
            message=message,
            store_id=store_id,
            product_id=product_id,
        )


def notify_supply_request_pending(
    db: Session,
    *,
    store_id: int,
    product_id: int,
    quantity_requested: int,
    requested_by_name: str,
) -> None:
    users = _get_store_admins_and_superusers(db, store_id)
    notify_users(
        db,
        users=users,
        category="pending_supply_request",
        title="Supply request pending approval",
        message=f"{requested_by_name} requested {quantity_requested} units.",
        store_id=store_id,
        product_id=product_id,
    )


def notify_supply_request_status(
    db: Session,
    *,
    requester_id: int,
    store_id: int,
    product_id: int,
    status: str,
    admin_notes: Optional[str] = None,
) -> None:
    message = f"Your supply request was {status}."
    if admin_notes:
        message = f"{message} Notes: {admin_notes}"
    create_notification(
        db,
        user_id=requester_id,
        category="supply_request_status",
        title=f"Supply request {status}",
        message=message,
        store_id=store_id,
        product_id=product_id,
    )


def notify_unpaid_inventory(
    db: Session,
    *,
    store_id: int,
    product_id: int,
    quantity_in_stock: int,
) -> None:
    users = _get_store_admins_and_superusers(db, store_id)
    notify_users(
        db,
        users=users,
        category="unpaid_inventory",
        title="Inventory marked unpaid",
        message=f"An inventory record with {quantity_in_stock} units is unpaid.",
        store_id=store_id,
        product_id=product_id,
    )


def _get_threshold(db: Session, product_id: int, store_id: int) -> int:
    store_specific = (
        db.query(StockThreshold)
        .filter(StockThreshold.product_id == product_id, StockThreshold.store_id == store_id)
        .first()
    )
    if store_specific:
        return store_specific.min_quantity

    product_default = (
        db.query(StockThreshold)
        .filter(StockThreshold.product_id == product_id, StockThreshold.store_id.is_(None))
        .first()
    )
    if product_default:
        return product_default.min_quantity

    return settings.low_stock_default_threshold


def notify_low_stock_if_needed(
    db: Session,
    *,
    inventory: Inventory,
) -> None:
    threshold = _get_threshold(db, inventory.product_id, inventory.store_id)
    if inventory.quantity_in_stock > threshold:
        return

    users = _get_store_admins_and_superusers(db, inventory.store_id)
    notify_users(
        db,
        users=users,
        category="low_stock",
        title="Low stock alert",
        message=f"Product #{inventory.product_id} is at {inventory.quantity_in_stock} units (threshold {threshold}).",
        store_id=inventory.store_id,
        product_id=inventory.product_id,
    )

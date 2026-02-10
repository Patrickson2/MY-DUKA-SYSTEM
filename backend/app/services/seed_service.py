"""Seed helpers for demo credentials used by frontend integration."""
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import inventory, supply_request  # register relationships
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.store import Store
from app.models.user import User

DEMO_STORE = {
    "name": "Downtown Store",
    "location": "Nairobi",
    "description": "Default seeded store",
}

DEMO_USERS = [
    {
        "email": "merchant@myduka.com",
        "first_name": "John",
        "last_name": "Merchant",
        "password": "merchant123",
        "role": "superuser",
    },
    {
        "email": "admin@myduka.com",
        "first_name": "Jane",
        "last_name": "Admin",
        "password": "admin123",
        "role": "admin",
    },
    {
        "email": "clerk@myduka.com",
        "first_name": "Mike",
        "last_name": "Clerk",
        "password": "clerk123",
        "role": "clerk",
    },
]

DEMO_PRODUCTS = [
    {
        "name": "Rice - 5kg",
        "sku": "RICE-5KG",
        "buying_price": 450,
        "selling_price": 600,
        "description": "Grains",
    },
    {
        "name": "Cooking Oil - 2L",
        "sku": "OIL-2L",
        "buying_price": 280,
        "selling_price": 350,
        "description": "Oils",
    },
]

DEMO_SUPPLIERS = [
    {
        "name": "Fresh Foods Ltd",
        "contact_name": "Sarah Wanjiku",
        "phone": "+254700000111",
        "email": "sarah@freshfoods.example",
        "address": "Industrial Area, Nairobi",
    },
    {
        "name": "Green Harvest Distributors",
        "contact_name": "Ahmed Ali",
        "phone": "+254700000222",
        "email": "ahmed@greenharvest.example",
        "address": "Mombasa Road, Nairobi",
    },
]


def _ensure_default_store(db: Session, merchant_id: int | None) -> Store:
    store = db.query(Store).filter(Store.name == DEMO_STORE["name"]).first()
    if store:
        if merchant_id and store.merchant_id is None:
            store.merchant_id = merchant_id
            db.commit()
            db.refresh(store)
        return store

    store = Store(merchant_id=merchant_id, **DEMO_STORE)
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


def _ensure_demo_products(db: Session, merchant_id: int | None) -> None:
    for payload in DEMO_PRODUCTS:
        exists = db.query(Product).filter(Product.sku == payload["sku"]).first()
        if exists:
            if merchant_id and exists.merchant_id is None:
                exists.merchant_id = merchant_id
            continue
        db.add(Product(merchant_id=merchant_id, **payload))
    db.commit()


def _ensure_demo_suppliers(db: Session, store_id: int) -> None:
    for payload in DEMO_SUPPLIERS:
        exists = db.query(Supplier).filter(Supplier.name == payload["name"], Supplier.store_id == store_id).first()
        if exists:
            continue
        db.add(Supplier(store_id=store_id, **payload))
    db.commit()


def seed_demo_users(db: Session) -> None:
    """Ensure demo users and baseline data exist for local development."""
    merchant = db.query(User).filter(User.email == DEMO_USERS[0]["email"]).first()
    if not merchant:
        merchant = User(
            email=DEMO_USERS[0]["email"],
            first_name=DEMO_USERS[0]["first_name"],
            last_name=DEMO_USERS[0]["last_name"],
            hashed_password=hash_password(DEMO_USERS[0]["password"]),
            role=DEMO_USERS[0]["role"],
            is_active=True,
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)

    store = _ensure_default_store(db, merchant.id if merchant else None)

    for user_data in DEMO_USERS:
        user = db.query(User).filter(User.email == user_data["email"]).first()
        if user:
            if user.role in {"admin", "clerk"} and user.store_id is None:
                user.store_id = store.id
            continue

        new_user = User(
            email=user_data["email"],
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            hashed_password=hash_password(user_data["password"]),
            role=user_data["role"],
            is_active=True,
            store_id=store.id if user_data["role"] in {"admin", "clerk"} else None,
        )
        db.add(new_user)

    db.commit()
    _ensure_demo_products(db, merchant.id if merchant else None)
    _ensure_demo_suppliers(db, store.id)

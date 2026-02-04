"""Seed helpers for demo credentials used by frontend integration."""
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.product import Product
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


def _ensure_default_store(db: Session) -> Store:
    store = db.query(Store).filter(Store.name == DEMO_STORE["name"]).first()
    if store:
        return store

    store = Store(**DEMO_STORE)
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


def _ensure_demo_products(db: Session) -> None:
    for payload in DEMO_PRODUCTS:
        exists = db.query(Product).filter(Product.sku == payload["sku"]).first()
        if exists:
            continue
        db.add(Product(**payload))
    db.commit()


def seed_demo_users(db: Session) -> None:
    """Ensure demo users and baseline data exist for local development."""
    store = _ensure_default_store(db)

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
    _ensure_demo_products(db)

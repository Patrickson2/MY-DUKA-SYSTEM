"""
Seed helpers for demo credentials used by frontend integration.
"""
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User


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


def seed_demo_users(db: Session) -> None:
    """
    Ensure demo users exist for frontend login while backend APIs are integrated.
    """
    for user_data in DEMO_USERS:
        exists = db.query(User).filter(User.email == user_data["email"]).first()
        if exists:
            continue

        user = User(
            email=user_data["email"],
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            hashed_password=hash_password(user_data["password"]),
            role=user_data["role"],
            is_active=True,
        )
        db.add(user)

    db.commit()

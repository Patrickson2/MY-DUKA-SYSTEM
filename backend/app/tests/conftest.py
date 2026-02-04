import uuid
import sys
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import Base, SessionLocal, engine
from app.core.security import create_access_token, hash_password
from app.models.user import User
from main import app

engine.echo = False


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def reset_db():
    """Give each test a clean sqlite database."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user_factory(db):
    def _create_user(role="clerk", password="password123", **kwargs):
        user = User(
            email=kwargs.get("email", f"{uuid.uuid4().hex[:8]}@myduka.com"),
            first_name=kwargs.get("first_name", "Test"),
            last_name=kwargs.get("last_name", "User"),
            hashed_password=hash_password(password),
            role=role,
            is_active=kwargs.get("is_active", True),
            store_id=kwargs.get("store_id"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _create_user


@pytest.fixture
def auth_headers():
    def _headers(user):
        token = create_access_token({"sub": user.id})
        return {"Authorization": f"Bearer {token}"}

    return _headers

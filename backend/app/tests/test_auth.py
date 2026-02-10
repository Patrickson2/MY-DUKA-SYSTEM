import pytest
from app.models.store import Store

pytestmark = pytest.mark.anyio


async def test_health_check_returns_healthy(client):
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


async def test_register_then_login_and_get_me(client):
    email = "merchant@myduka.com"

    register = await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "first_name": "Mike",
            "last_name": "Clerk",
            "password": "clerk12345",
        },
    )
    assert register.status_code == 200, register.text
    assert register.json()["user"]["role"] == "superuser"

    login = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "clerk12345"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]

    me = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == email


async def test_login_with_invalid_credentials_returns_401(client, user_factory):
    user_factory(email="admin@myduka.com", role="admin", password="admin123")

    response = await client.post(
        "/api/auth/login",
        json={"email": "admin@myduka.com", "password": "wrong"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


async def test_refresh_token_rotates_and_returns_new_tokens(client, user_factory):
    user_factory(email="admin@myduka.com", role="admin", password="admin123")

    login = await client.post(
        "/api/auth/login",
        json={"email": "admin@myduka.com", "password": "admin123"},
    )
    assert login.status_code == 200
    old_refresh = login.json()["refresh_token"]

    refresh = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert refresh.status_code == 200
    payload = refresh.json()
    assert payload["access_token"]
    assert payload["refresh_token"]
    assert payload["refresh_token"] != old_refresh

    refresh_old = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert refresh_old.status_code == 401


async def test_logout_revokes_refresh_token(client, user_factory):
    user_factory(email="clerk@myduka.com", role="clerk", password="clerk12345")

    login = await client.post(
        "/api/auth/login",
        json={"email": "clerk@myduka.com", "password": "clerk12345"},
    )
    assert login.status_code == 200
    refresh_token = login.json()["refresh_token"]

    logout = await client.post(
        "/api/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert logout.status_code == 200

    refresh = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh.status_code == 401


async def test_superuser_can_invite_admin_and_register_with_token(client, db, user_factory, auth_headers):
    merchant = user_factory(email="merchant@myduka.com", role="superuser", password="merchant123")
    store = Store(name="Downtown", location="Nairobi")
    db.add(store)
    db.commit()
    db.refresh(store)

    invite = await client.post(
        "/api/users/admin-invites",
        headers=auth_headers(merchant),
        json={"email": "new-admin@myduka.com", "store_id": store.id},
    )
    assert invite.status_code == 200, invite.text
    invite_token = invite.json()["invite_token"]

    register = await client.post(
        "/api/auth/admin-invite/register",
        json={
            "invite_token": invite_token,
            "first_name": "New",
            "last_name": "Admin",
            "password": "AdminPass123",
        },
    )
    assert register.status_code == 200, register.text
    assert register.json()["user"]["role"] == "admin"
    assert register.json()["user"]["store_id"] == store.id

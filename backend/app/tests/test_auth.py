import pytest

pytestmark = pytest.mark.anyio


async def test_health_check_returns_healthy(client):
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


async def test_register_then_login_and_get_me(client):
    email = "clerk@myduka.com"

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
    assert register.json()["user"]["role"] == "clerk"

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

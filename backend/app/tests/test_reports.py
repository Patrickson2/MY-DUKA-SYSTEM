import pytest

pytestmark = pytest.mark.anyio


async def test_list_stores_requires_authentication(client):
    response = await client.get("/api/stores/")
    assert response.status_code == 401


async def test_admin_can_create_and_list_stores(client, user_factory, auth_headers):
    admin = user_factory(email="admin@myduka.com", role="admin", password="admin123")
    headers = auth_headers(admin)

    create = await client.post(
        "/api/stores/",
        headers=headers,
        json={
            "name": "Westlands Branch",
            "location": "Westlands, Nairobi",
            "phone": "+254700000000",
            "email": "westlands@myduka.com",
        },
    )
    assert create.status_code == 200, create.text

    listing = await client.get("/api/stores/", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["name"] == "Westlands Branch"


async def test_clerk_cannot_create_store(client, user_factory, auth_headers):
    clerk = user_factory(email="clerk@myduka.com", role="clerk", password="clerk123")

    response = await client.post(
        "/api/stores/",
        headers=auth_headers(clerk),
        json={"name": "Nope", "location": "Nowhere"},
    )

    assert response.status_code == 403

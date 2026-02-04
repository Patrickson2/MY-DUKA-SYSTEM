import pytest

from app.models.inventory import Inventory
from app.models.product import Product
from app.models.store import Store
from app.models.supply_request import SupplyRequest

pytestmark = pytest.mark.anyio


async def test_list_stores_requires_authentication(client):
    response = await client.get("/api/stores/")
    assert response.status_code == 401


async def test_superuser_can_create_and_list_stores(client, user_factory, auth_headers):
    merchant = user_factory(email="merchant@myduka.com", role="superuser", password="merchant123")
    headers = auth_headers(merchant)

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


async def test_admin_cannot_create_store(client, user_factory, auth_headers):
    admin = user_factory(email="admin@myduka.com", role="admin", password="admin123")

    response = await client.post(
        "/api/stores/",
        headers=auth_headers(admin),
        json={"name": "Nope", "location": "Nowhere"},
    )

    assert response.status_code == 403


async def test_clerk_cannot_create_store(client, user_factory, auth_headers):
    clerk = user_factory(email="clerk@myduka.com", role="clerk", password="clerk123")

    response = await client.post(
        "/api/stores/",
        headers=auth_headers(clerk),
        json={"name": "Nope", "location": "Nowhere"},
    )

    assert response.status_code == 403


async def test_admin_store_scope_blocks_other_store_access(client, db, user_factory, auth_headers):
    admin = user_factory(email="scoped-admin@myduka.com", role="admin")
    first_store = Store(name="A", location="Nairobi")
    second_store = Store(name="B", location="Mombasa")
    db.add(first_store)
    db.add(second_store)
    db.commit()
    db.refresh(first_store)
    db.refresh(second_store)

    admin.store_id = first_store.id
    db.commit()

    allowed = await client.get(f"/api/stores/{first_store.id}", headers=auth_headers(admin))
    denied = await client.get(f"/api/stores/{second_store.id}", headers=auth_headers(admin))

    assert allowed.status_code == 200
    assert denied.status_code == 403


def _seed_basic_dashboard_data(db, clerk_user, suffix="A"):
    store = Store(name="Downtown Store", location="Nairobi")
    product = Product(
        name=f"Rice - 5kg {suffix}",
        sku=f"RICE-5KG-{suffix}",
        buying_price=450,
        selling_price=600,
    )
    db.add(store)
    db.add(product)
    db.commit()
    db.refresh(store)
    db.refresh(product)

    inventory = Inventory(
        product_id=product.id,
        store_id=store.id,
        created_by=clerk_user.id,
        quantity_received=100,
        quantity_in_stock=80,
        quantity_spoilt=2,
        payment_status="unpaid",
        buying_price=450,
        selling_price=600,
    )
    request = SupplyRequest(
        product_id=product.id,
        store_id=store.id,
        requested_by=clerk_user.id,
        quantity_requested=20,
        reason="Top up stock",
        status="pending",
    )
    db.add(inventory)
    db.add(request)
    db.commit()
    return store


async def test_admin_dashboard_returns_expected_shape(client, db, user_factory, auth_headers):
    admin = user_factory(email="admin-dashboard@myduka.com", role="admin")
    clerk = user_factory(email="clerk-dashboard@myduka.com", role="clerk")
    store = _seed_basic_dashboard_data(db, clerk, "A")

    admin.store_id = store.id
    clerk.store_id = store.id
    db.commit()

    response = await client.get(
        "/api/reports/admin/dashboard",
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    data = response.json()
    assert {"stats", "supply_requests", "payment_status", "clerks"} <= set(data.keys())
    assert data["stats"]["active_clerks"] == 1
    assert data["stats"]["pending_requests"] == 1
    assert data["stats"]["unpaid_products"] == 1


async def test_clerk_dashboard_returns_only_clerk_records(
    client, db, user_factory, auth_headers
):
    clerk_a = user_factory(email="clerk-a@myduka.com", role="clerk")
    clerk_b = user_factory(email="clerk-b@myduka.com", role="clerk")
    _seed_basic_dashboard_data(db, clerk_a, "A")
    _seed_basic_dashboard_data(db, clerk_b, "B")

    response = await client.get(
        "/api/reports/clerk/dashboard",
        headers=auth_headers(clerk_a),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["stats"]["total_products"] == 1
    assert len(data["products"]) == 1


async def test_merchant_dashboard_requires_superuser(
    client, db, user_factory, auth_headers
):
    admin = user_factory(email="admin-no-merchant@myduka.com", role="admin")
    denied = await client.get(
        "/api/reports/merchant/dashboard",
        headers=auth_headers(admin),
    )
    assert denied.status_code == 403

    superuser = user_factory(email="merchant@myduka.com", role="superuser")
    clerk = user_factory(email="clerk-merchant@myduka.com", role="clerk")
    _seed_basic_dashboard_data(db, clerk, "C")

    allowed = await client.get(
        "/api/reports/merchant/dashboard",
        headers=auth_headers(superuser),
    )
    assert allowed.status_code == 200
    payload = allowed.json()
    assert {"stats", "performance", "payment_summary", "stores", "admins"} <= set(
        payload.keys()
    )

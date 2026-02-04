import pytest

from app.models.product import Product
from app.models.store import Store
from app.models.supply_request import SupplyRequest

pytestmark = pytest.mark.anyio


def _seed_store_and_product(db, suffix="N1"):
    store = Store(name=f"Store-{suffix}", location="Nairobi")
    product = Product(
        name=f"Sugar {suffix}",
        sku=f"SUGAR-{suffix}",
        buying_price=100,
        selling_price=140,
    )
    db.add(store)
    db.add(product)
    db.commit()
    db.refresh(store)
    db.refresh(product)
    return store, product


async def test_supply_request_generates_admin_notification(client, db, user_factory, auth_headers):
    admin = user_factory(email="notify-admin@myduka.com", role="admin")
    clerk = user_factory(email="notify-clerk@myduka.com", role="clerk")
    store, product = _seed_store_and_product(db, "N2")
    admin.store_id = store.id
    clerk.store_id = store.id
    db.commit()

    create_request = await client.post(
        "/api/supply-requests/",
        headers=auth_headers(clerk),
        json={
            "product_id": product.id,
            "store_id": store.id,
            "quantity_requested": 20,
            "reason": "Need restock",
        },
    )
    assert create_request.status_code == 201

    notifications = await client.get("/api/notifications/?unread_only=true", headers=auth_headers(admin))
    assert notifications.status_code == 200
    categories = {item["category"] for item in notifications.json()}
    assert "pending_supply_request" in categories


async def test_supply_request_approval_notifies_clerk(client, db, user_factory, auth_headers):
    admin = user_factory(email="approve-admin@myduka.com", role="admin")
    clerk = user_factory(email="approve-clerk@myduka.com", role="clerk")
    store, product = _seed_store_and_product(db, "N3")
    admin.store_id = store.id
    clerk.store_id = store.id
    db.commit()

    req = SupplyRequest(
        product_id=product.id,
        store_id=store.id,
        requested_by=clerk.id,
        quantity_requested=10,
        reason="Please approve",
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    approve = await client.post(
        f"/api/supply-requests/{req.id}/approve",
        headers=auth_headers(admin),
        json={"admin_notes": "Approved"},
    )
    assert approve.status_code == 200

    notifications = await client.get("/api/notifications/", headers=auth_headers(clerk))
    assert notifications.status_code == 200
    categories = {item["category"] for item in notifications.json()}
    assert "supply_request_status" in categories


async def test_low_stock_unpaid_and_history_events(client, db, user_factory, auth_headers):
    admin = user_factory(email="stock-admin@myduka.com", role="admin")
    clerk = user_factory(email="stock-clerk@myduka.com", role="clerk")
    store, product = _seed_store_and_product(db, "N4")
    admin.store_id = store.id
    clerk.store_id = store.id
    db.commit()

    created = await client.post(
        "/api/inventory/",
        headers=auth_headers(clerk),
        json={
            "product_id": product.id,
            "store_id": store.id,
            "quantity_received": 5,
            "quantity_in_stock": 5,
            "quantity_spoilt": 0,
            "payment_status": "unpaid",
            "buying_price": 120,
            "selling_price": 150,
            "remarks": "Low stock test",
        },
    )
    assert created.status_code == 201

    history = await client.get(
        f"/api/inventory/history/product/{product.id}",
        headers=auth_headers(clerk),
    )
    assert history.status_code == 200
    assert len(history.json()) >= 1
    assert history.json()[0]["event_type"] == "created"

    admin_notifications = await client.get("/api/notifications/", headers=auth_headers(admin))
    assert admin_notifications.status_code == 200
    categories = {item["category"] for item in admin_notifications.json()}
    assert "low_stock" in categories
    assert "unpaid_inventory" in categories

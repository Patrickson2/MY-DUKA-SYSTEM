import pytest

from app.models.inventory import Inventory
from app.models.product import Product
from app.models.store import Store

pytestmark = pytest.mark.anyio


def _seed_product_store(db, suffix=""):
    product = Product(
        name=f"Rice {suffix}",
        sku=f"SKU-{suffix or '001'}",
        buying_price=100.0,
        selling_price=150.0,
    )
    store = Store(name="Downtown", location="Nairobi")
    db.add(product)
    db.add(store)
    db.commit()
    db.refresh(product)
    db.refresh(store)
    return product, store


async def test_create_inventory_requires_authentication(client, db):
    product, store = _seed_product_store(db)

    response = await client.post(
        "/api/inventory/",
        json={
            "product_id": product.id,
            "store_id": store.id,
            "quantity_received": 10,
            "quantity_in_stock": 10,
            "quantity_spoilt": 0,
            "payment_status": "paid",
            "buying_price": 100,
            "selling_price": 150,
        },
    )

    assert response.status_code == 401


async def test_clerk_can_record_inventory(client, db, user_factory, auth_headers):
    clerk = user_factory(email="clerk1@myduka.com", role="clerk", password="clerk123")
    product, store = _seed_product_store(db)

    response = await client.post(
        "/api/inventory/",
        headers=auth_headers(clerk),
        json={
            "product_id": product.id,
            "store_id": store.id,
            "quantity_received": 10,
            "quantity_in_stock": 10,
            "quantity_spoilt": 0,
            "payment_status": "paid",
            "buying_price": 100,
            "selling_price": 150,
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["product_id"] == product.id


async def test_clerk_inventory_list_shows_only_own_records(
    client, db, user_factory, auth_headers
):
    clerk_a = user_factory(email="a@myduka.com", role="clerk", password="clerk123")
    clerk_b = user_factory(email="b@myduka.com", role="clerk", password="clerk123")

    product_a, store = _seed_product_store(db, "A")
    product_b, _ = _seed_product_store(db, "B")

    db.add(
        Inventory(
            product_id=product_a.id,
            store_id=store.id,
            created_by=clerk_a.id,
            quantity_received=5,
            quantity_in_stock=5,
            quantity_spoilt=0,
            payment_status="paid",
            buying_price=100,
            selling_price=150,
        )
    )
    db.add(
        Inventory(
            product_id=product_b.id,
            store_id=store.id,
            created_by=clerk_b.id,
            quantity_received=7,
            quantity_in_stock=7,
            quantity_spoilt=0,
            payment_status="unpaid",
            buying_price=90,
            selling_price=140,
        )
    )
    db.commit()

    response = await client.get(
        "/api/inventory/",
        headers=auth_headers(clerk_a),
    )

    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["product_id"] == product_a.id

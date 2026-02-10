import pytest

from app.models.inventory import Inventory
from app.models.product import Product
from app.models.store import Store
from app.models.supplier import Supplier


@pytest.mark.anyio
async def test_create_supplier(client, db, user_factory, auth_headers):
    store = Store(name="Test Store", location="Nairobi")
    db.add(store)
    db.commit()
    db.refresh(store)

    admin = user_factory(role="admin", store_id=store.id)
    payload = {"name": "Fresh Supplies", "store_id": store.id}
    response = await client.post("/api/suppliers/", json=payload, headers=auth_headers(admin))

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Fresh Supplies"
    assert data["store_id"] == store.id


@pytest.mark.anyio
async def test_receive_purchase_order_creates_inventory(client, db, user_factory, auth_headers):
    store = Store(name="Ops Store", location="Kisumu")
    db.add(store)
    db.commit()
    db.refresh(store)

    product = Product(
        name="Test Rice",
        sku="TEST-RICE",
        buying_price=100,
        selling_price=150,
        description="Test",
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    supplier = Supplier(name="Ops Supplier", store_id=store.id)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    admin = user_factory(role="admin", store_id=store.id)

    order_payload = {
        "supplier_id": supplier.id,
        "store_id": store.id,
        "items": [
            {"product_id": product.id, "quantity": 5, "unit_cost": 90, "unit_price": 140}
        ],
    }
    create_resp = await client.post(
        "/api/purchase-orders/", json=order_payload, headers=auth_headers(admin)
    )
    assert create_resp.status_code == 200
    order_id = create_resp.json()["id"]

    receive_resp = await client.post(
        f"/api/purchase-orders/{order_id}/status",
        json={"status": "received"},
        headers=auth_headers(admin),
    )
    assert receive_resp.status_code == 200
    assert receive_resp.json()["status"] == "received"

    inventory = db.query(Inventory).filter(Inventory.product_id == product.id).all()
    assert sum(item.quantity_in_stock for item in inventory) == 5

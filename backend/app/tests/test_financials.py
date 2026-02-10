import pytest

from app.models.inventory import Inventory
from app.models.product import Product
from app.models.store import Store


@pytest.mark.anyio
async def test_sales_and_financial_summary(client, db, user_factory, auth_headers):
    store = Store(name="Finance Store", location="Nakuru")
    db.add(store)
    db.commit()
    db.refresh(store)

    product = Product(
        name="Test Sugar",
        sku="TEST-SUGAR",
        buying_price=80,
        selling_price=120,
        description="Test product",
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    admin = user_factory(role="admin", store_id=store.id)

    inventory = Inventory(
        product_id=product.id,
        store_id=store.id,
        created_by=admin.id,
        quantity_received=10,
        quantity_in_stock=10,
        quantity_spoilt=0,
        payment_status="paid",
        buying_price=product.buying_price,
        selling_price=product.selling_price,
    )
    db.add(inventory)
    db.commit()

    sale_resp = await client.post(
        "/api/sales/",
        json={"store_id": store.id, "product_id": product.id, "quantity": 2},
        headers=auth_headers(admin),
    )
    assert sale_resp.status_code == 200

    expense_resp = await client.post(
        "/api/expenses/",
        json={"store_id": store.id, "category": "Rent", "amount": 50},
        headers=auth_headers(admin),
    )
    assert expense_resp.status_code == 200

    summary_resp = await client.get("/api/analytics/financial-summary", headers=auth_headers(admin))
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["total_sales"] > 0
    assert summary["total_expenses"] >= 50

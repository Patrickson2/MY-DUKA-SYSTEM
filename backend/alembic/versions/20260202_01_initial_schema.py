"""initial schema for core tables

Revision ID: 20260202_01
Revises:
Create Date: 2026-02-09 09:20:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260202_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("merchant_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stores_id"), "stores", ["id"], unique=False)
    op.create_index(op.f("ix_stores_name"), "stores", ["name"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("store_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("merchant_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sku", sa.String(length=100), nullable=False),
        sa.Column("buying_price", sa.Float(), nullable=False),
        sa.Column("selling_price", sa.Float(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku"),
    )
    op.create_index(op.f("ix_products_id"), "products", ["id"], unique=False)
    op.create_index(op.f("ix_products_name"), "products", ["name"], unique=False)
    op.create_index(op.f("ix_products_sku"), "products", ["sku"], unique=False)

    op.create_table(
        "inventory",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("quantity_received", sa.Integer(), nullable=False),
        sa.Column("quantity_in_stock", sa.Integer(), nullable=False),
        sa.Column("quantity_spoilt", sa.Integer(), nullable=False),
        sa.Column("payment_status", sa.String(length=20), nullable=True),
        sa.Column("buying_price", sa.Float(), nullable=False),
        sa.Column("selling_price", sa.Float(), nullable=False),
        sa.Column("remarks", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_inventory_id"), "inventory", ["id"], unique=False)
    op.create_index(op.f("ix_inventory_product_id"), "inventory", ["product_id"], unique=False)
    op.create_index(op.f("ix_inventory_store_id"), "inventory", ["store_id"], unique=False)
    op.create_index(op.f("ix_inventory_created_by"), "inventory", ["created_by"], unique=False)

    op.create_table(
        "supply_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("requested_by", sa.Integer(), nullable=False),
        sa.Column("quantity_requested", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_supply_requests_id"), "supply_requests", ["id"], unique=False)
    op.create_index(op.f("ix_supply_requests_product_id"), "supply_requests", ["product_id"], unique=False)
    op.create_index(op.f("ix_supply_requests_store_id"), "supply_requests", ["store_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_supply_requests_store_id"), table_name="supply_requests")
    op.drop_index(op.f("ix_supply_requests_product_id"), table_name="supply_requests")
    op.drop_index(op.f("ix_supply_requests_id"), table_name="supply_requests")
    op.drop_table("supply_requests")

    op.drop_index(op.f("ix_inventory_created_by"), table_name="inventory")
    op.drop_index(op.f("ix_inventory_store_id"), table_name="inventory")
    op.drop_index(op.f("ix_inventory_product_id"), table_name="inventory")
    op.drop_index(op.f("ix_inventory_id"), table_name="inventory")
    op.drop_table("inventory")

    op.drop_index(op.f("ix_products_sku"), table_name="products")
    op.drop_index(op.f("ix_products_name"), table_name="products")
    op.drop_index(op.f("ix_products_id"), table_name="products")
    op.drop_table("products")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

    op.drop_index(op.f("ix_stores_name"), table_name="stores")
    op.drop_index(op.f("ix_stores_id"), table_name="stores")
    op.drop_table("stores")

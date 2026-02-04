"""add inventory events notifications and stock thresholds

Revision ID: 20260204_01
Revises: 20260203_01
Create Date: 2026-02-04 18:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260204_01"
down_revision: Union[str, None] = "20260203_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "inventory_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("inventory_id", sa.Integer(), nullable=True),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("old_quantity_in_stock", sa.Integer(), nullable=True),
        sa.Column("new_quantity_in_stock", sa.Integer(), nullable=True),
        sa.Column("old_payment_status", sa.String(length=20), nullable=True),
        sa.Column("new_payment_status", sa.String(length=20), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_inventory_events_id"), "inventory_events", ["id"], unique=False)
    op.create_index(
        op.f("ix_inventory_events_inventory_id"), "inventory_events", ["inventory_id"], unique=False
    )
    op.create_index(
        op.f("ix_inventory_events_product_id"), "inventory_events", ["product_id"], unique=False
    )
    op.create_index(op.f("ix_inventory_events_store_id"), "inventory_events", ["store_id"], unique=False)
    op.create_index(op.f("ix_inventory_events_actor_id"), "inventory_events", ["actor_id"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=True),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)
    op.create_index(op.f("ix_notifications_store_id"), "notifications", ["store_id"], unique=False)
    op.create_index(op.f("ix_notifications_product_id"), "notifications", ["product_id"], unique=False)

    op.create_table(
        "stock_thresholds",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=True),
        sa.Column("min_quantity", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stock_thresholds_id"), "stock_thresholds", ["id"], unique=False)
    op.create_index(
        op.f("ix_stock_thresholds_product_id"), "stock_thresholds", ["product_id"], unique=False
    )
    op.create_index(op.f("ix_stock_thresholds_store_id"), "stock_thresholds", ["store_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_stock_thresholds_store_id"), table_name="stock_thresholds")
    op.drop_index(op.f("ix_stock_thresholds_product_id"), table_name="stock_thresholds")
    op.drop_index(op.f("ix_stock_thresholds_id"), table_name="stock_thresholds")
    op.drop_table("stock_thresholds")

    op.drop_index(op.f("ix_notifications_product_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_store_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_table("notifications")

    op.drop_index(op.f("ix_inventory_events_actor_id"), table_name="inventory_events")
    op.drop_index(op.f("ix_inventory_events_store_id"), table_name="inventory_events")
    op.drop_index(op.f("ix_inventory_events_product_id"), table_name="inventory_events")
    op.drop_index(op.f("ix_inventory_events_inventory_id"), table_name="inventory_events")
    op.drop_index(op.f("ix_inventory_events_id"), table_name="inventory_events")
    op.drop_table("inventory_events")

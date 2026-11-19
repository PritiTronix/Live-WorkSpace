"""Add display_name, phone, and slack_handle to users table

Revision ID: 011_add_user_profile_fields
Revises: 010_remove_organization_plan_default
Create Date: 2026-11-17
"""
from alembic import op, context
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "011_add_user_profile_fields"
down_revision = "010_remove_organization_plan_default"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    existing_cols = set()
    if inspector and inspector.has_table("users"):
        existing_cols = {c["name"] for c in inspector.get_columns("users")}

    columns_to_add = [
        ("display_name", sa.Column("display_name", sa.String(255), nullable=True)),
        ("phone", sa.Column("phone", sa.String(50), nullable=True)),
        ("slack_handle", sa.Column("slack_handle", sa.String(100), nullable=True)),
    ]

    for col_name, col_obj in columns_to_add:
        if col_name not in existing_cols:
            op.add_column("users", col_obj)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    existing_cols = set()
    if inspector and inspector.has_table("users"):
        existing_cols = {c["name"] for c in inspector.get_columns("users")}

    columns_to_drop = ["slack_handle", "phone", "display_name"]
    for col_name in columns_to_drop:
        if col_name in existing_cols:
            op.drop_column("users", col_name)

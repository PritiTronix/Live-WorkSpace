"""Add timezone, last_active_at, and on_call_role to users

Revision ID: 007_add_member_profile_fields
Revises: 006_add_search_indexes
Create Date: 2026-11-17
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "007_add_member_profile_fields"
down_revision = "006_add_search_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    try:
        op.add_column("users", sa.Column("timezone", sa.String(50), nullable=True))
    except Exception:
        pass
    try:
        op.add_column("users", sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True))
    except Exception:
        pass
    try:
        op.add_column("users", sa.Column("on_call_role", sa.String(100), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_column("users", "on_call_role")
    except Exception:
        pass
    try:
        op.drop_column("users", "last_active_at")
    except Exception:
        pass
    try:
        op.drop_column("users", "timezone")
    except Exception:
        pass

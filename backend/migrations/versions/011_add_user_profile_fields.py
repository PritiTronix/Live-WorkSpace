"""Add display_name, phone, and slack_handle to users table

Revision ID: 011_add_user_profile_fields
Revises: 010_remove_organization_plan_default
Create Date: 2026-11-17
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "011_add_user_profile_fields"
down_revision = "010_remove_organization_plan_default"
branch_labels = None
depends_on = None


def upgrade() -> None:
    try:
        op.add_column("users", sa.Column("display_name", sa.String(255), nullable=True))
    except Exception:
        pass
    try:
        op.add_column("users", sa.Column("phone", sa.String(50), nullable=True))
    except Exception:
        pass
    try:
        op.add_column("users", sa.Column("slack_handle", sa.String(100), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_column("users", "slack_handle")
    except Exception:
        pass
    try:
        op.drop_column("users", "phone")
    except Exception:
        pass
    try:
        op.drop_column("users", "display_name")
    except Exception:
        pass

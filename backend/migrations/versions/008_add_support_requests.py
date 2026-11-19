"""Add support_requests table for user problem reports and support inquiries

Revision ID: 008_add_support_requests
Revises: 007_add_member_profile_fields
Create Date: 2026-11-17
"""
from alembic import op, context
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "008_add_support_requests"
down_revision = "007_add_member_profile_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None
    has_table = inspector.has_table("support_requests") if inspector else False

    if not has_table:
        op.create_table(
            "support_requests",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("subject", sa.String(200), nullable=False),
            sa.Column("category", sa.String(50), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("status", sa.String(50), nullable=False, server_default="open"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_support_requests_user_id", "support_requests", ["user_id"])
        op.create_index("ix_support_requests_organization_id", "support_requests", ["organization_id"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("support_requests")}
        if "ix_support_requests_user_id" not in existing_indexes:
            op.create_index("ix_support_requests_user_id", "support_requests", ["user_id"])
        if "ix_support_requests_organization_id" not in existing_indexes:
            op.create_index("ix_support_requests_organization_id", "support_requests", ["organization_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None
    has_table = inspector.has_table("support_requests") if inspector else False

    if has_table:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("support_requests")}
        if "ix_support_requests_organization_id" in existing_indexes:
            op.drop_index("ix_support_requests_organization_id", table_name="support_requests")
        if "ix_support_requests_user_id" in existing_indexes:
            op.drop_index("ix_support_requests_user_id", table_name="support_requests")
        op.drop_table("support_requests")

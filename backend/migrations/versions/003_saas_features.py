"""Add SaaS models: notifications, workspace_settings, user_invitations, and rca_records

Revision ID: 003_saas_features
Revises: 002_tasks
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = "003_saas_features"
down_revision = "002_tasks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("type", sa.String(50), nullable=False, server_default="info"),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("link", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_org_id", "notifications", ["organization_id"])

    # 2. workspace_settings
    op.create_table(
        "workspace_settings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("allow_member_invites", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("enforce_2fa", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("sla_warning_threshold_pct", sa.Integer, nullable=False, server_default="80"),
        sa.Column("auto_close_resolved_days", sa.Integer, nullable=False, server_default="7"),
        sa.Column("custom_fields_json", sa.JSON, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # 3. user_invitations
    op.create_table(
        "user_invitations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="member"),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(255), unique=True, nullable=False),
        sa.Column("invited_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_user_invitations_token", "user_invitations", ["token"])

    # 4. rca_records
    op.create_table(
        "rca_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ticket_id", sa.String(36), sa.ForeignKey("tickets.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("root_cause", sa.Text, nullable=False),
        sa.Column("preventive_action", sa.Text, nullable=False),
        sa.Column("timeline", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("approved_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("rca_records")
    op.drop_table("user_invitations")
    op.drop_table("workspace_settings")
    op.drop_table("notifications")

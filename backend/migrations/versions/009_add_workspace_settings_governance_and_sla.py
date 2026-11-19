"""Add workspace settings governance and SLA policy columns

Revision ID: 009_add_workspace_settings_governance_and_sla
Revises: 008_add_support_requests
Create Date: 2026-11-17
"""
from alembic import op, context
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "009_add_workspace_settings_governance_and_sla"
down_revision = "008_add_support_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    # 1. Add governance columns to workspace_settings if not already present
    existing_ws_cols = set()
    if inspector and inspector.has_table("workspace_settings"):
        existing_ws_cols = {c["name"] for c in inspector.get_columns("workspace_settings")}

    columns_to_add = [
        ("working_schedule", sa.Column("working_schedule", sa.String(255), nullable=True)),
        ("timezone", sa.Column("timezone", sa.String(100), nullable=True)),
        ("holidays_observed", sa.Column("holidays_observed", sa.Integer(), nullable=True)),
        ("pause_on_hold", sa.Column("pause_on_hold", sa.Boolean(), nullable=True)),
        ("sla_config", sa.Column("sla_config", sa.Text(), nullable=True)),
        ("notification_config", sa.Column("notification_config", sa.Text(), nullable=True)),
        ("appearance_config", sa.Column("appearance_config", sa.Text(), nullable=True)),
        ("created_at", sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True)),
    ]

    for col_name, col_obj in columns_to_add:
        if col_name not in existing_ws_cols:
            op.add_column("workspace_settings", col_obj)

    # 2. Add additive sla_policies table for dedicated relational SLA policy records
    has_sla_table = inspector.has_table("sla_policies") if inspector else False
    if not has_sla_table:
        op.create_table(
            "sla_policies",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(150), nullable=False),
            sa.Column("severity", sa.String(50), nullable=False),  # blocker, critical, major, minor
            sa.Column("response_time_minutes", sa.Integer(), nullable=False),
            sa.Column("resolution_time_minutes", sa.Integer(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("escalation_rules_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_sla_policies_org_id", "sla_policies", ["organization_id"])
        op.create_index("ix_sla_policies_severity", "sla_policies", ["severity"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("sla_policies")}
        existing_cols = {c["name"] for c in inspector.get_columns("sla_policies")}
        if "ix_sla_policies_org_id" not in existing_indexes and "organization_id" in existing_cols:
            op.create_index("ix_sla_policies_org_id", "sla_policies", ["organization_id"])
        if "ix_sla_policies_severity" not in existing_indexes and "severity" in existing_cols:
            op.create_index("ix_sla_policies_severity", "sla_policies", ["severity"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    has_sla_table = inspector.has_table("sla_policies") if inspector else False
    if has_sla_table:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("sla_policies")}
        if "ix_sla_policies_severity" in existing_indexes:
            op.drop_index("ix_sla_policies_severity", table_name="sla_policies")
        if "ix_sla_policies_org_id" in existing_indexes:
            op.drop_index("ix_sla_policies_org_id", table_name="sla_policies")
        op.drop_table("sla_policies")

    existing_ws_cols = set()
    if inspector and inspector.has_table("workspace_settings"):
        existing_ws_cols = {c["name"] for c in inspector.get_columns("workspace_settings")}

    columns_to_drop = [
        "created_at",
        "appearance_config",
        "notification_config",
        "sla_config",
        "pause_on_hold",
        "holidays_observed",
        "timezone",
        "working_schedule",
    ]
    for col_name in columns_to_drop:
        if col_name in existing_ws_cols:
            op.drop_column("workspace_settings", col_name)

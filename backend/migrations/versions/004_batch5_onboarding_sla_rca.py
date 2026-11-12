"""Add onboarding_completed to users and add SLA policies, rules, timers, escalations, RCAs, versions, and action items

Revision ID: 004_batch5_onboarding_sla_rca
Revises: 003_auth_tokens
Create Date: 2026-11-12
"""
from alembic import op
import sqlalchemy as sa

revision = "004_batch5_onboarding_sla_rca"
down_revision = "003_auth_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. User onboarding flag
    op.add_column("users", sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # 2. SLA Policies table
    op.create_table(
        "sla_policies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tier", sa.String(100), nullable=False, server_default="standard"),
        sa.Column("business_hours_only", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # 3. SLA Rules table
    op.create_table(
        "sla_rules",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("policy_id", sa.String(36), sa.ForeignKey("sla_policies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("priority", sa.String(50), nullable=False),
        sa.Column("response_time_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("resolution_time_minutes", sa.Integer(), nullable=False, server_default="240"),
        sa.Column("escalation_tier", sa.String(50), nullable=False, server_default="tier_1"),
        sa.Column("organization_id", sa.String(36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 4. SLA Timers table
    op.create_table(
        "sla_timers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ticket_id", sa.String(36), nullable=True, index=True),
        sa.Column("policy_id", sa.String(36), sa.ForeignKey("sla_policies.id"), nullable=True),
        sa.Column("rule_id", sa.String(36), sa.ForeignKey("sla_rules.id"), nullable=True),
        sa.Column("timer_type", sa.String(50), nullable=False, server_default="first_response"),
        sa.Column("status", sa.String(50), nullable=False, server_default="on_track"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("target_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("breached_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paused_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("elapsed_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 5. SLA Escalations table
    op.create_table(
        "sla_escalations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("timer_id", sa.String(36), sa.ForeignKey("sla_timers.id", ondelete="CASCADE"), nullable=True),
        sa.Column("ticket_id", sa.String(36), nullable=True),
        sa.Column("escalation_tier", sa.String(50), nullable=False, server_default="tier_1"),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("acknowledged_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 6. RCAs table
    op.create_table(
        "rcas",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("rca_number", sa.String(50), unique=True, index=True, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("incident_date", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("severity", sa.String(50), nullable=False, server_default="major"),
        sa.Column("service_affected", sa.String(100), nullable=False),
        sa.Column("outage_duration_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("customer_impact", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("five_whys", sa.Text(), nullable=True),
        sa.Column("timeline_events", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("ticket_id", sa.String(36), nullable=True, index=True),
        sa.Column("lead_investigator_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # 7. RCA Versions table
    op.create_table(
        "rca_versions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("rca_id", sa.String(36), sa.ForeignKey("rcas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("snapshot_data", sa.Text(), nullable=False),
        sa.Column("changelog", sa.Text(), nullable=True),
        sa.Column("author_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 8. RCA Action Items table
    op.create_table(
        "rca_action_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("rca_id", sa.String(36), sa.ForeignKey("rcas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("assignee_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("priority", sa.String(50), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(50), nullable=False, server_default="todo"),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("rca_action_items")
    op.drop_table("rca_versions")
    op.drop_table("rcas")
    op.drop_table("sla_escalations")
    op.drop_table("sla_timers")
    op.drop_table("sla_rules")
    op.drop_table("sla_policies")
    op.drop_column("users", "onboarding_completed")

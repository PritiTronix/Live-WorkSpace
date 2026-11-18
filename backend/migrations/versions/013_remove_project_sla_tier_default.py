"""Remove default value for sla_tier column in projects table

Revision ID: 013_remove_project_sla_tier_default
Revises: 012_add_project_milestones_and_sprints
Create Date: 2026-11-18
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "013_remove_project_sla_tier_default"
down_revision = "012_add_project_milestones_and_sprints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove server default from sla_tier column so it defaults strictly to NULL
    with op.batch_alter_table("projects") as batch_op:
        batch_op.alter_column(
            "sla_tier",
            existing_type=sa.String(length=100),
            server_default=None,
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.alter_column(
            "sla_tier",
            existing_type=sa.String(length=100),
            server_default="Standard SaaS Tier 1",
            nullable=True,
        )

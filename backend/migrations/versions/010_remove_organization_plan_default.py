"""Remove default value for plan column in organizations table

Revision ID: 010_remove_organization_plan_default
Revises: 009_add_workspace_settings_governance_and_sla
Create Date: 2026-11-17
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "010_remove_organization_plan_default"
down_revision = "009_add_workspace_settings_governance_and_sla"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove server default from plan column so plan defaults strictly to NULL
    with op.batch_alter_table("organizations") as batch_op:
        batch_op.alter_column(
            "plan",
            existing_type=sa.String(length=50),
            server_default=None,
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("organizations") as batch_op:
        batch_op.alter_column(
            "plan",
            existing_type=sa.String(length=50),
            server_default="Standard",
            nullable=True,
        )

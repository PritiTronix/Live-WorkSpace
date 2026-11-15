"""Add plan column to organizations table

Revision ID: 005_add_organization_plan
Revises: 004_add_onboarding_completed
Create Date: 2026-11-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "005_add_organization_plan"
down_revision = "004_add_onboarding_completed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("organizations") as batch_op:
        batch_op.add_column(
            sa.Column(
                "plan",
                sa.String(length=50),
                nullable=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("organizations") as batch_op:
        batch_op.drop_column("plan")

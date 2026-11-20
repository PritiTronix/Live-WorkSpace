"""Add industry_other column to organizations table

Revision ID: 017_add_organization_industry_other
Revises: 016_organization_onboarding_and_memberships
Create Date: 2026-11-20
"""
from alembic import op, context
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "017_add_organization_industry_other"
down_revision = "016_organization_onboarding_and_memberships"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    if inspector and inspector.has_table("organizations"):
        org_cols = {c["name"] for c in inspector.get_columns("organizations")}
        if "industry_other" not in org_cols:
            with op.batch_alter_table("organizations") as batch_op:
                batch_op.add_column(
                    sa.Column(
                        "industry_other",
                        sa.String(length=60),
                        nullable=True,
                    )
                )
    else:
        with op.batch_alter_table("organizations") as batch_op:
            batch_op.add_column(
                sa.Column(
                    "industry_other",
                    sa.String(length=60),
                    nullable=True,
                )
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    if inspector and inspector.has_table("organizations"):
        org_cols = {c["name"] for c in inspector.get_columns("organizations")}
        if "industry_other" in org_cols:
            with op.batch_alter_table("organizations") as batch_op:
                batch_op.drop_column("industry_other")
    else:
        with op.batch_alter_table("organizations") as batch_op:
            batch_op.drop_column("industry_other")

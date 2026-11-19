"""Add project_sprints and project_milestones tables

Revision ID: 012_add_project_milestones_and_sprints
Revises: 011_add_user_profile_fields
Create Date: 2026-11-17
"""
from alembic import op, context
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "012_add_project_milestones_and_sprints"
down_revision = "011_add_user_profile_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    # 1. Create project_sprints table if not exists
    has_sprints = inspector.has_table("project_sprints") if inspector else False
    if not has_sprints:
        op.create_table(
            "project_sprints",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
            sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("target_points", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("completed_points", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_project_sprints_project_id", "project_sprints", ["project_id"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("project_sprints")}
        if "ix_project_sprints_project_id" not in existing_indexes:
            op.create_index("ix_project_sprints_project_id", "project_sprints", ["project_id"])

    # 2. Create project_milestones table if not exists
    has_milestones = inspector.has_table("project_milestones") if inspector else False
    if not has_milestones:
        op.create_table(
            "project_milestones",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="planned"),
            sa.Column("progress_pct", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("owner_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_project_milestones_project_id", "project_milestones", ["project_id"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("project_milestones")}
        if "ix_project_milestones_project_id" not in existing_indexes:
            op.create_index("ix_project_milestones_project_id", "project_milestones", ["project_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    has_milestones = inspector.has_table("project_milestones") if inspector else False
    if has_milestones:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("project_milestones")}
        if "ix_project_milestones_project_id" in existing_indexes:
            op.drop_index("ix_project_milestones_project_id", table_name="project_milestones")
        op.drop_table("project_milestones")

    has_sprints = inspector.has_table("project_sprints") if inspector else False
    if has_sprints:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("project_sprints")}
        if "ix_project_sprints_project_id" in existing_indexes:
            op.drop_index("ix_project_sprints_project_id", table_name="project_sprints")
        op.drop_table("project_sprints")

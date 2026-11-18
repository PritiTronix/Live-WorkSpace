"""Add performance indexes for project overview and metrics queries

Revision ID: 014_add_project_overview_performance_indexes
Revises: 013_remove_project_sla_tier_default
Create Date: 2026-11-18
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "014_add_project_overview_performance_indexes"
down_revision = "013_remove_project_sla_tier_default"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Tasks performance indexes
    op.create_index(
        "ix_tasks_project_org",
        "tasks",
        ["project_id", "organization_id"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        "ix_tasks_project_status",
        "tasks",
        ["project_id", "status"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        "ix_tasks_project_assignee",
        "tasks",
        ["project_id", "assignee_id"],
        unique=False,
        if_not_exists=True,
    )

    # 2. Tickets performance indexes
    op.create_index(
        "ix_tickets_project_status",
        "tickets",
        ["project_id", "status"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        "ix_tickets_project_severity",
        "tickets",
        ["project_id", "severity"],
        unique=False,
        if_not_exists=True,
    )

    # 3. Project milestones index
    op.create_index(
        "ix_project_milestones_project_due",
        "project_milestones",
        ["project_id", "due_date"],
        unique=False,
        if_not_exists=True,
    )

    # 4. Project sprints index
    op.create_index(
        "ix_project_sprints_project_status",
        "project_sprints",
        ["project_id", "status"],
        unique=False,
        if_not_exists=True,
    )

    # 5. Project activities index
    op.create_index(
        "ix_project_activities_project_created",
        "project_activities",
        ["project_id", "created_at"],
        unique=False,
        if_not_exists=True,
    )

    # 6. Discussions and files project indexes
    op.create_index(
        "ix_discussions_project_id",
        "discussions",
        ["project_id"],
        unique=False,
        if_not_exists=True,
    )
    op.create_index(
        "ix_project_files_project_id",
        "project_files",
        ["project_id"],
        unique=False,
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("ix_project_files_project_id", table_name="project_files", if_exists=True)
    op.drop_index("ix_discussions_project_id", table_name="discussions", if_exists=True)
    op.drop_index("ix_project_activities_project_created", table_name="project_activities", if_exists=True)
    op.drop_index("ix_project_sprints_project_status", table_name="project_sprints", if_exists=True)
    op.drop_index("ix_project_milestones_project_due", table_name="project_milestones", if_exists=True)
    op.drop_index("ix_tickets_project_severity", table_name="tickets", if_exists=True)
    op.drop_index("ix_tickets_project_status", table_name="tickets", if_exists=True)
    op.drop_index("ix_tasks_project_assignee", table_name="tasks", if_exists=True)
    op.drop_index("ix_tasks_project_status", table_name="tasks", if_exists=True)
    op.drop_index("ix_tasks_project_org", table_name="tasks", if_exists=True)

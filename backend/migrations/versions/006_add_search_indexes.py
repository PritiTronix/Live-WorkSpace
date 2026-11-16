"""Add search indexes for title and name fields

Revision ID: 006_add_search_indexes
Revises: 005_add_organization_plan
Create Date: 2026-11-16
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "006_add_search_indexes"
down_revision = "005_add_organization_plan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    try:
        op.create_index("ix_projects_name", "projects", ["name"], unique=False)
    except Exception:
        pass
    try:
        op.create_index("ix_tickets_title", "tickets", ["title"], unique=False)
    except Exception:
        pass
    try:
        op.create_index("ix_tasks_title", "tasks", ["title"], unique=False)
    except Exception:
        pass
    try:
        op.create_index("ix_users_full_name", "users", ["full_name"], unique=False)
    except Exception:
        pass
    try:
        op.create_index("ix_discussions_title", "discussions", ["title"], unique=False)
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_index("ix_discussions_title", table_name="discussions")
    except Exception:
        pass
    try:
        op.drop_index("ix_users_full_name", table_name="users")
    except Exception:
        pass
    try:
        op.drop_index("ix_tasks_title", table_name="tasks")
    except Exception:
        pass
    try:
        op.drop_index("ix_tickets_title", table_name="tickets")
    except Exception:
        pass
    try:
        op.drop_index("ix_projects_name", table_name="projects")
    except Exception:
        pass

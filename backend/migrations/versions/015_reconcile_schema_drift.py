"""Reconcile schema drift for project_sprints, project_milestones, and support_requests

Revision ID: 015_reconcile_schema_drift
Revises: 014_add_project_overview_performance_indexes
Create Date: 2026-11-19
"""
from alembic import op, context
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "015_reconcile_schema_drift"
down_revision = "014_add_project_overview_performance_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    # (1) Create missing indexes idempotently
    if inspector:
        if inspector.has_table("project_sprints"):
            existing_sprint_indexes = {idx["name"] for idx in inspector.get_indexes("project_sprints")}
            if "ix_project_sprints_project_id" not in existing_sprint_indexes:
                op.create_index("ix_project_sprints_project_id", "project_sprints", ["project_id"])
        if inspector.has_table("project_milestones"):
            existing_milestone_indexes = {idx["name"] for idx in inspector.get_indexes("project_milestones")}
            if "ix_project_milestones_project_id" not in existing_milestone_indexes:
                op.create_index("ix_project_milestones_project_id", "project_milestones", ["project_id"])
    else:
        op.create_index("ix_project_sprints_project_id", "project_sprints", ["project_id"])
        op.create_index("ix_project_milestones_project_id", "project_milestones", ["project_id"])

    # (2) Set missing server defaults (ALTER COLUMN SET DEFAULT only)
    # project_sprints: status='active', target_points=0, completed_points=0, created_at=now()
    with op.batch_alter_table("project_sprints") as batch_op:
        batch_op.alter_column("status", server_default="active")
        batch_op.alter_column("target_points", server_default="0")
        batch_op.alter_column("completed_points", server_default="0")
        batch_op.alter_column("created_at", server_default=sa.func.now())

    # project_milestones: status='planned', progress_pct=0, created_at=now()
    with op.batch_alter_table("project_milestones") as batch_op:
        batch_op.alter_column("status", server_default="planned")
        batch_op.alter_column("progress_pct", server_default="0")
        batch_op.alter_column("created_at", server_default=sa.func.now())

    # support_requests: status='open', created_at=now()
    with op.batch_alter_table("support_requests") as batch_op:
        batch_op.alter_column("status", server_default="open")
        batch_op.alter_column("created_at", server_default=sa.func.now())

    # (3) Idempotent Foreign Key Alignment
    fk_alignments = [
        ("project_sprints", "project_id", "projects", "id", "CASCADE"),
        ("project_milestones", "project_id", "projects", "id", "CASCADE"),
        ("project_milestones", "owner_id", "users", "id", "SET NULL"),
        ("support_requests", "user_id", "users", "id", "CASCADE"),
        ("support_requests", "organization_id", "organizations", "id", "CASCADE"),
    ]

    for table_name, col_name, ref_table, ref_col, target_ondelete in fk_alignments:
        if inspector and inspector.has_table(table_name):
            fks = inspector.get_foreign_keys(table_name)
            target_fk = None
            for fk in fks:
                if fk["constrained_columns"] == [col_name] and fk["referred_table"] == ref_table:
                    target_fk = fk
                    break
            current_ondelete = (target_fk.get("options", {}).get("ondelete") or "NO ACTION").upper() if target_fk else None
            if current_ondelete != target_ondelete.upper():
                fk_name = target_fk["name"] if (target_fk and target_fk["name"]) else f"{table_name}_{col_name}_fkey"
                if target_fk and target_fk["name"]:
                    op.drop_constraint(fk_name, table_name, type_="foreignkey")
                op.create_foreign_key(
                    fk_name,
                    table_name,
                    ref_table,
                    [col_name],
                    [ref_col],
                    ondelete=target_ondelete,
                )
        elif not inspector:
            # Offline mode
            fk_name = f"{table_name}_{col_name}_fkey"
            op.drop_constraint(fk_name, table_name, type_="foreignkey")
            op.create_foreign_key(
                fk_name,
                table_name,
                ref_table,
                [col_name],
                [ref_col],
                ondelete=target_ondelete,
            )


def downgrade() -> None:
    # Downgrade foreign keys back to NO ACTION
    fk_reverts = [
        ("project_sprints", "project_id", "projects", "id", "NO ACTION"),
        ("project_milestones", "project_id", "projects", "id", "NO ACTION"),
        ("project_milestones", "owner_id", "users", "id", "NO ACTION"),
        ("support_requests", "user_id", "users", "id", "NO ACTION"),
        ("support_requests", "organization_id", "organizations", "id", "NO ACTION"),
    ]
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    for table_name, col_name, ref_table, ref_col, target_ondelete in fk_reverts:
        if inspector and inspector.has_table(table_name):
            fks = inspector.get_foreign_keys(table_name)
            target_fk = None
            for fk in fks:
                if fk["constrained_columns"] == [col_name] and fk["referred_table"] == ref_table:
                    target_fk = fk
                    break
            if target_fk and target_fk["name"]:
                op.drop_constraint(target_fk["name"], table_name, type_="foreignkey")
                op.create_foreign_key(
                    target_fk["name"],
                    table_name,
                    ref_table,
                    [col_name],
                    [ref_col],
                    ondelete=target_ondelete,
                )

    # Drop server defaults
    with op.batch_alter_table("support_requests") as batch_op:
        batch_op.alter_column("created_at", server_default=None)
        batch_op.alter_column("status", server_default=None)

    with op.batch_alter_table("project_milestones") as batch_op:
        batch_op.alter_column("created_at", server_default=None)
        batch_op.alter_column("progress_pct", server_default=None)
        batch_op.alter_column("status", server_default=None)

    with op.batch_alter_table("project_sprints") as batch_op:
        batch_op.alter_column("created_at", server_default=None)
        batch_op.alter_column("completed_points", server_default=None)
        batch_op.alter_column("target_points", server_default=None)
        batch_op.alter_column("status", server_default=None)

    # Drop indexes
    if inspector:
        if inspector.has_table("project_milestones"):
            existing_milestone_indexes = {idx["name"] for idx in inspector.get_indexes("project_milestones")}
            if "ix_project_milestones_project_id" in existing_milestone_indexes:
                op.drop_index("ix_project_milestones_project_id", table_name="project_milestones")
        if inspector.has_table("project_sprints"):
            existing_sprint_indexes = {idx["name"] for idx in inspector.get_indexes("project_sprints")}
            if "ix_project_sprints_project_id" in existing_sprint_indexes:
                op.drop_index("ix_project_sprints_project_id", table_name="project_sprints")

"""Add organization onboarding, memberships, join codes, join requests, and audit logs

Revision ID: 016_organization_onboarding_and_memberships
Revises: 015_reconcile_schema_drift
Create Date: 2026-11-19
"""
import uuid
from datetime import datetime, timezone
from alembic import op, context
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "016_organization_onboarding_and_memberships"
down_revision = "015_reconcile_schema_drift"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    # -----------------------------------------------------------------------
    # 1. Update organizations table columns
    # -----------------------------------------------------------------------
    if inspector and inspector.has_table("organizations"):
        org_cols = {c["name"] for c in inspector.get_columns("organizations")}
        with op.batch_alter_table("organizations") as batch_op:
            if "logo_path" not in org_cols:
                batch_op.add_column(sa.Column("logo_path", sa.String(length=500), nullable=True))
            if "industry" not in org_cols:
                batch_op.add_column(sa.Column("industry", sa.String(length=100), nullable=True))
            if "size_range" not in org_cols:
                batch_op.add_column(sa.Column("size_range", sa.String(length=50), nullable=True))
            if "created_by" not in org_cols:
                batch_op.add_column(sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
            if "updated_at" not in org_cols:
                batch_op.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    elif not inspector:
        with op.batch_alter_table("organizations") as batch_op:
            batch_op.add_column(sa.Column("logo_path", sa.String(length=500), nullable=True))
            batch_op.add_column(sa.Column("industry", sa.String(length=100), nullable=True))
            batch_op.add_column(sa.Column("size_range", sa.String(length=50), nullable=True))
            batch_op.add_column(sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
            batch_op.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))

    # -----------------------------------------------------------------------
    # 2. Create memberships table
    # -----------------------------------------------------------------------
    has_memberships = inspector.has_table("memberships") if inspector else False
    if not has_memberships:
        op.create_table(
            "memberships",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("role", sa.String(length=50), nullable=False, server_default="member"),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
            sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("user_id", "organization_id", name="uq_memberships_user_org"),
        )
        op.create_index("ix_memberships_user_id", "memberships", ["user_id"])
        op.create_index("ix_memberships_organization_id", "memberships", ["organization_id"])
        op.create_index("ix_memberships_status", "memberships", ["status"])

    # -----------------------------------------------------------------------
    # 3. Create organization_join_codes table
    # -----------------------------------------------------------------------
    has_join_codes = inspector.has_table("organization_join_codes") if inspector else False
    if not has_join_codes:
        op.create_table(
            "organization_join_codes",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("code_hash", sa.String(length=255), nullable=False),
            sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("max_uses", sa.Integer(), nullable=True),
            sa.Column("use_count", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_organization_join_codes_organization_id", "organization_join_codes", ["organization_id"])
        op.create_index("ix_organization_join_codes_code_hash", "organization_join_codes", ["code_hash"])
        op.create_index("ix_organization_join_codes_created_by", "organization_join_codes", ["created_by"])
        op.create_index("ix_organization_join_codes_expires_at", "organization_join_codes", ["expires_at"])
        op.create_index("ix_organization_join_codes_revoked_at", "organization_join_codes", ["revoked_at"])

    # -----------------------------------------------------------------------
    # 4. Create join_requests table
    # -----------------------------------------------------------------------
    has_join_requests = inspector.has_table("join_requests") if inspector else False
    if not has_join_requests:
        op.create_table(
            "join_requests",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
            sa.Column("message", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("decided_by", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("decision_reason", sa.String(length=500), nullable=True),
        )
        op.create_index("ix_join_requests_user_id", "join_requests", ["user_id"])
        op.create_index("ix_join_requests_organization_id", "join_requests", ["organization_id"])
        op.create_index("ix_join_requests_status", "join_requests", ["status"])

        # Partial unique index: only one pending request per (user, organization)
        dialect = bind.dialect.name
        if dialect == "postgresql":
            op.create_index(
                "ix_join_requests_user_org_pending",
                "join_requests",
                ["user_id", "organization_id"],
                unique=True,
                postgresql_where=sa.text("status = 'pending'"),
            )

    # -----------------------------------------------------------------------
    # 5. Create audit_logs table
    # -----------------------------------------------------------------------
    has_audit_logs = inspector.has_table("audit_logs") if inspector else False
    if not has_audit_logs:
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True),
            sa.Column("actor_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("action", sa.String(length=100), nullable=False),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_audit_logs_organization_id", "audit_logs", ["organization_id"])
        op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
        op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
        op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    # -----------------------------------------------------------------------
    # 6. Backfill existing users into memberships table (Idempotent)
    # -----------------------------------------------------------------------
    if not context.is_offline_mode():
        # Fetch existing memberships
        existing_mem_res = bind.execute(sa.text("SELECT user_id, organization_id FROM memberships")).fetchall()
        existing_pairs = {(r[0], r[1]) for r in existing_mem_res}

        # Fetch all users with an organization_id
        users_res = bind.execute(
            sa.text("SELECT id, role, organization_id, created_at FROM users WHERE organization_id IS NOT NULL")
        ).fetchall()

        memberships_backfilled = 0
        now_ts = datetime.now(timezone.utc)

        for u_id, u_role, u_org_id, u_created_at in users_res:
            if (u_id, u_org_id) not in existing_pairs:
                clean_role = (u_role or "").lower().strip()
                mapped_role = clean_role if clean_role in ("owner", "admin") else "member"
                mem_id = f"mem_{uuid.uuid4().hex[:8]}"
                joined_ts = u_created_at if u_created_at else now_ts

                bind.execute(
                    sa.text(
                        "INSERT INTO memberships (id, user_id, organization_id, role, status, joined_at) "
                        "VALUES (:id, :user_id, :org_id, :role, 'active', :joined_at)"
                    ),
                    {
                        "id": mem_id,
                        "user_id": u_id,
                        "org_id": u_org_id,
                        "role": mapped_role,
                        "joined_at": joined_ts,
                    },
                )
                existing_pairs.add((u_id, u_org_id))
                memberships_backfilled += 1

        # Check organizations without owners: assign creator or earliest user as owner
        orgs_res = bind.execute(sa.text("SELECT id FROM organizations")).fetchall()
        owners_assigned = 0

        for (o_id,) in orgs_res:
            owner_check = bind.execute(
                sa.text(
                    "SELECT id FROM memberships WHERE organization_id = :org_id AND role = 'owner' AND status = 'active'"
                ),
                {"org_id": o_id},
            ).fetchall()

            if not owner_check:
                # Find earliest user in that organization
                earliest_user = bind.execute(
                    sa.text(
                        "SELECT id FROM users WHERE organization_id = :org_id ORDER BY created_at ASC LIMIT 1"
                    ),
                    {"org_id": o_id},
                ).fetchone()

                if earliest_user:
                    e_uid = earliest_user[0]
                    # Update membership to owner
                    bind.execute(
                        sa.text(
                            "UPDATE memberships SET role = 'owner' WHERE user_id = :uid AND organization_id = :org_id"
                        ),
                        {"uid": e_uid, "org_id": o_id},
                    )
                    # Update users table role to owner
                    bind.execute(
                        sa.text("UPDATE users SET role = 'owner' WHERE id = :uid"),
                        {"uid": e_uid},
                    )
                    # Update organization created_by and updated_at
                    bind.execute(
                        sa.text(
                            "UPDATE organizations SET created_by = :uid, updated_at = created_at WHERE id = :org_id"
                        ),
                        {"uid": e_uid, "org_id": o_id},
                    )
                    owners_assigned += 1

        print(f"Backfill summary: {memberships_backfilled} memberships backfilled, {owners_assigned} owners assigned.")


def downgrade() -> None:
    pass

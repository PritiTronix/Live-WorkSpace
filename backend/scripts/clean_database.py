"""Database Cleaner & Reset Utility.

Industrial-grade cleanup script to wipe test data or prepare the database
for production deployment.

Safety: Requires explicit '--confirm' flag to prevent accidental execution.

Usage:
    # Wipe test data and reset to completely clean schema:
    python -m backend.scripts.clean_database --confirm

    # Wipe only transactional test records (tasks, tickets, discussions) while keeping users & orgs:
    python -m backend.scripts.clean_database --test-data-only --confirm
"""

import sys
import argparse
import asyncio
import logging
from sqlalchemy import text
from backend.app.database import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cleaner")

# Tables in safe deletion order (children first, then parents)
ALL_TABLES = [
    "discussion_comments",
    "discussions",
    "task_attachments",
    "task_comments",
    "tasks",
    "ticket_activities",
    "ticket_attachments",
    "ticket_comments",
    "rca_records",
    "tickets",
    "project_files",
    "project_activities",
    "project_invitations",
    "project_members",
    "projects",
    "notifications",
    "workspace_settings",
    "user_invitations",
    "users",
    "organizations",
]

TEST_DATA_TABLES = [
    "discussion_comments",
    "discussions",
    "task_attachments",
    "task_comments",
    "tasks",
    "ticket_activities",
    "ticket_attachments",
    "ticket_comments",
    "rca_records",
    "tickets",
    "project_files",
    "project_activities",
    "project_invitations",
    "project_members",
    "projects",
    "notifications",
]


async def clean_database(test_data_only: bool = False):
    tables = TEST_DATA_TABLES if test_data_only else ALL_TABLES
    mode_label = "Transactional Test Records" if test_data_only else "ALL Database Records (Full Wipe)"

    logger.warning(f"⚠️  COMMENCING DATABASE CLEANUP: {mode_label}")

    async with engine.begin() as conn:
        for table in tables:
            try:
                # Use TRUNCATE with CASCADE in PostgreSQL for fast, clean deletion
                await conn.execute(text(f'TRUNCATE TABLE "{table}" CASCADE;'))
                logger.info(f"  ✓ Cleaned table: {table}")
            except Exception as e:
                # Fallback to DELETE if TRUNCATE has foreign key constraints in SQLite or restricted PG
                try:
                    await conn.execute(text(f'DELETE FROM "{table}";'))
                    logger.info(f"  ✓ Deleted records from table: {table}")
                except Exception as ex:
                    logger.error(f"  ✗ Failed to clean {table}: {ex}")

    logger.info("✅ Database cleanup successfully completed.")


def main():
    parser = argparse.ArgumentParser(description="Clean or reset Neon PostgreSQL database.")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Mandatory confirmation flag required to execute cleanup.",
    )
    parser.add_argument(
        "--test-data-only",
        action="store_true",
        help="Only wipe tasks, tickets, files and discussions; preserve organizations and users.",
    )

    args = parser.parse_args()

    if not args.confirm:
        print("\n" + "=" * 70)
        print("❌ SAFETY GUARD: Accidental Execution Prevented.")
        print("To proceed with wiping database tables, you must provide the '--confirm' flag:")
        print("    python -m backend.scripts.clean_database --confirm")
        print("Or for test records only:")
        print("    python -m backend.scripts.clean_database --test-data-only --confirm")
        print("=" * 70 + "\n")
        sys.exit(1)

    asyncio.run(clean_database(test_data_only=args.test_data_only))


if __name__ == "__main__":
    main()

"""Database Migration Runner.

Executes Alembic migrations safely against Neon PostgreSQL.
Usage:
    python -m backend.scripts.run_migrations [--check]
"""

import sys
import argparse
import logging
from alembic.config import Config
from alembic import command
from backend.app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrations")


def run_migrations(check_only: bool = False):
    logger.info("Initializing Alembic configuration...")
    alembic_cfg = Config("alembic.ini")

    # Ensure sync URL is set for Alembic DDL commands
    db_url = settings.SYNC_DATABASE_URL or settings.DATABASE_URL
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)

    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    if check_only:
        logger.info("Checking current database migration revision...")
        command.current(alembic_cfg)
        return

    logger.info("Applying all database migrations forward to HEAD...")
    try:
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ Database migrations applied successfully to HEAD.")
    except Exception as e:
        logger.error(f"❌ Migration error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run or inspect database migrations.")
    parser.add_argument("--check", action="store_true", help="Only check current migration version without upgrading.")
    args = parser.parse_args()
    run_migrations(check_only=args.check)

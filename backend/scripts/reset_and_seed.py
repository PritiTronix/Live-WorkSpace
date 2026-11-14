"""Complete Test-to-Production Orchestration Tool.

Safely wipes test data, verifies Alembic schema migrations, reseeds canonical
enterprise entities, and audits the environment.

Safety: Requires explicit '--confirm' flag.

Usage:
    python -m backend.scripts.reset_and_seed --confirm
"""

import sys
import argparse
import asyncio
import logging
from backend.scripts.clean_database import clean_database
from backend.scripts.run_migrations import run_migrations
from backend.scripts.seed_database import main as run_seed
from backend.scripts.verify_database import verify_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("orchestrator")


async def run_orchestration():
    logger.info("=" * 60)
    logger.info("STEP 1: Cleaning existing test records...")
    await clean_database(test_data_only=False)

    logger.info("=" * 60)
    logger.info("STEP 2: Verifying & running database migrations...")
    run_migrations(check_only=False)

    logger.info("=" * 60)
    logger.info("STEP 3: Seeding canonical enterprise dataset & credentials...")
    await run_seed()

    logger.info("=" * 60)
    logger.info("STEP 4: Auditing database health & validating credentials...")
    await verify_database()

    logger.info("=" * 60)
    logger.info("🎉 Database orchestration completed successfully. Ready for production.")


def main():
    parser = argparse.ArgumentParser(description="Clean, migrate, seed and verify database.")
    parser.add_argument("--confirm", action="store_true", help="Confirmation flag required.")
    args = parser.parse_args()

    if not args.confirm:
        print("\n" + "=" * 70)
        print("❌ SAFETY GUARD: Accidental Execution Prevented.")
        print("To proceed with resetting and seeding the database, provide '--confirm':")
        print("    python -m backend.scripts.reset_and_seed --confirm")
        print("=" * 70 + "\n")
        sys.exit(1)

    asyncio.run(run_orchestration())


if __name__ == "__main__":
    main()

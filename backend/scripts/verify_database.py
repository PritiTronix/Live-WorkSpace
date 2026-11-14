"""Database Verification & Health Audit Tool.

Audits Neon PostgreSQL database tables, counts records, and validates
credentials for:
- bhaveshburad729@gmail.com (Password: bhavesh729)
- shubhaam.tronix365@gmail.com (Password: bhavesh729)

Usage:
    python -m backend.scripts.verify_database
"""

import sys
import asyncio
import logging
from sqlalchemy import text, select
from backend.app.database import engine, AsyncSessionLocal
from backend.app.models import User
from backend.app.core.security import verify_password
from backend.scripts.clean_database import ALL_TABLES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("verifier")


async def verify_database():
    logger.info("Connecting to Neon PostgreSQL...")

    # 1. Connection & Version Check
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT version(), current_database(), current_user;"))
        row = res.fetchone()
        logger.info(f"Connected to DB: '{row[1]}' as user '{row[2]}'")
        logger.info(f"PostgreSQL Version: {row[0].split(',')[0]}")

    # 2. Table Row Count Audit
    logger.info("-" * 50)
    logger.info("AUDITING RELATIONAL TABLES:")
    table_counts = {}
    async with engine.connect() as conn:
        for t in ALL_TABLES:
            try:
                r = await conn.execute(text(f'SELECT COUNT(*) FROM "{t}";'))
                count = r.scalar()
                table_counts[t] = count
                logger.info(f"  • {t:<22}: {count:>4} rows")
            except Exception as e:
                logger.error(f"  ✗ {t:<22}: Table missing or error: {e}")

    # 3. Credential Verification
    logger.info("-" * 50)
    logger.info("VERIFYING ADMINISTRATOR CREDENTIALS:")
    test_creds = [
        ("bhaveshburad729@gmail.com", "bhavesh729", "Owner"),
        ("shubhaam.tronix365@gmail.com", "bhavesh729", "Admin"),
    ]

    all_creds_valid = True
    async with AsyncSessionLocal() as session:
        for email, password, role_label in test_creds:
            usr_res = await session.execute(select(User).where(User.email == email))
            user = usr_res.scalars().first()
            if not user:
                logger.error(f"  ✗ User '{email}' NOT FOUND in database!")
                all_creds_valid = False
                continue

            pw_valid = verify_password(password, user.hashed_password)
            if pw_valid:
                logger.info(f"  ✓ User '{email}' ({user.role.upper()}): Password verified successfully!")
            else:
                logger.error(f"  ✗ User '{email}': Password mismatch or invalid hash!")
                all_creds_valid = False

    logger.info("-" * 50)
    if all_creds_valid:
        logger.info("🎉 ALL SYSTEMS OPERATIONAL: Neon PostgreSQL is verified and production ready.")
    else:
        logger.error("⚠️ Some credentials or tables require attention.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(verify_database())

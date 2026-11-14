"""Database Seeder & Initial Population Tool.

Seeds canonical enterprise data and provisions administrator credentials:
- Owner: bhaveshburad729@gmail.com (Password: bhavesh729)
- Admin: shubhaam.tronix365@gmail.com (Password: bhavesh729)

Usage:
    python -m backend.scripts.seed_database [--force-update-users]
"""

import sys
import asyncio
import logging
from sqlalchemy import select
from backend.app.database import AsyncSessionLocal
from backend.app.models import User, Organization
from backend.app.core.security import get_password_hash
from backend.app.seed import seed_initial_data_if_empty
from backend.app.seed_discussions_rca import seed_discussions_and_rca

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seeder")


async def update_or_create_primary_users():
    """Ensures bhaveshburad729@gmail.com and shubhaam.tronix365@gmail.com exist with password bhavesh729."""
    password_hash = get_password_hash("bhavesh729")

    async with AsyncSessionLocal() as db:
        # Check primary organization
        org_res = await db.execute(select(Organization))
        org = org_res.scalars().first()
        if not org:
            org = Organization(
                id="org_01",
                name="Acme Tech",
                slug="acme-tech",
            )
            db.add(org)
            await db.flush()
            logger.info("Created default organization: Acme Tech (org_01)")

        # 1. Bhavesh Burad (Owner)
        usr1_res = await db.execute(select(User).where(User.id == "usr_01"))
        u1 = usr1_res.scalars().first()
        if u1:
            u1.full_name = "Bhavesh Burad"
            u1.email = "bhaveshburad729@gmail.com"
            u1.hashed_password = password_hash
            u1.role = "owner"
            u1.title = "Founder & Lead Architect"
            u1.department = "Executive & Architecture"
            u1.email_verified = True
            u1.is_active = True
            logger.info("Updated existing user usr_01 -> bhaveshburad729@gmail.com (Password: bhavesh729)")
        else:
            u1 = User(
                id="usr_01",
                organization_id=org.id,
                email="bhaveshburad729@gmail.com",
                hashed_password=password_hash,
                full_name="Bhavesh Burad",
                role="owner",
                title="Founder & Lead Architect",
                department="Executive & Architecture",
                avatar_url="https://lh3.googleusercontent.com/aida-public/AB6AXuBnY9OXem7tY-WC7GGIxR_JEkjBZZxyuBB-0mDqrUE6lOeiD0P2SWK26K-s-lUh0dGTZQxOlxTGW32Ij8iX-yKRMXgzDt0JPxqs-W4ENCsT_-YF18QAkuRBiF1NWi2xyCndsZyOaB-aGeYQAJAQDzEst5nV9N0oxnz6Rvo0NjCyG9e7INBNDHklHz4AE2P5GSv5kMzjbQLQU9LlePz0mmrDeSZ-Q7RXH6M0-8zNYTNg",
                is_active=True,
                email_verified=True,
            )
            db.add(u1)
            logger.info("Created user usr_01 -> bhaveshburad729@gmail.com (Password: bhavesh729)")

        # 2. Shubham (Admin)
        usr2_res = await db.execute(select(User).where(User.id == "usr_02"))
        u2 = usr2_res.scalars().first()
        if u2:
            u2.full_name = "Shubham"
            u2.email = "shubhaam.tronix365@gmail.com"
            u2.hashed_password = password_hash
            u2.role = "admin"
            u2.title = "Co-Founder & Platform Lead"
            u2.department = "Platform & Reliability"
            u2.email_verified = True
            u2.is_active = True
            logger.info("Updated existing user usr_02 -> shubhaam.tronix365@gmail.com (Password: bhavesh729)")
        else:
            u2 = User(
                id="usr_02",
                organization_id=org.id,
                email="shubhaam.tronix365@gmail.com",
                hashed_password=password_hash,
                full_name="Shubham",
                role="admin",
                title="Co-Founder & Platform Lead",
                department="Platform & Reliability",
                avatar_url="https://lh3.googleusercontent.com/aida-public/AB6AXuAmt0YGYVVOxPr4ec8yeLMlH3eFipVV14C1qMrM6ZWl_Q3CsXSe8erXqQl5aoC-hylXdMtlpm7vAxewtZVSavdi540cHwdI20sNUsCMCCuak-zOLUoAcw0tZ70DFuiIx8Gb3wEnQn4Dk5w51h-GTXmS7PCFEawLwniAxRH1k2msgs1oH4D8Wa8mKn_ucl6LFJ6K4rpqwTBjlPjHt5Cq9qIpjIgWgzOnHZ7pEjeLmA8W",
                is_active=True,
                email_verified=True,
            )
            db.add(u2)
            logger.info("Created user usr_02 -> shubhaam.tronix365@gmail.com (Password: bhavesh729)")

        # Update secondary team users to have known password bhavesh729 as well
        other_users = (await db.execute(select(User).where(User.id.in_(["usr_03", "usr_04", "usr_05", "usr_06"])))).scalars().all()
        for ou in other_users:
            ou.hashed_password = password_hash

        await db.commit()
        logger.info("Primary credentials successfully synchronized.")


async def main():
    logger.info("Starting canonical database population process...")
    async with AsyncSessionLocal() as session:
        await seed_initial_data_if_empty(session)
    await seed_discussions_and_rca()
    await update_or_create_primary_users()
    logger.info("✅ Database seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(main())

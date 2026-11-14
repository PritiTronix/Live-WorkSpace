import asyncio
from datetime import timedelta
from sqlalchemy import select
from backend.app.database import AsyncSessionLocal
from backend.app.models import Discussion, DiscussionComment, RCARecord, Ticket
from backend.app.seed import utc_now


async def seed_discussions_and_rca():
    async with AsyncSessionLocal() as db:
        # Check if discussions exist
        d_res = await db.execute(select(Discussion))
        if not d_res.scalars().first():
            d1 = Discussion(
                id="disc_01",
                project_id="prj_01",
                author_id="usr_01",
                title="Authentication proxy failover architecture & zero-trust boundaries",
                content="RFC: As part of the Platform Revamp 2.0 milestone, we are transitioning all inbound requests to zero-trust gateway proxies.",
                category="Architecture",
                is_pinned=True,
                is_resolved=False,
                reactions='{"thumbs_up": ["usr_02", "usr_03"], "heart": ["usr_04"]}',
                created_at=utc_now() - timedelta(days=5),
                updated_at=utc_now() - timedelta(days=1),
            )
            db.add(d1)
            await db.flush()

            c1 = DiscussionComment(
                id="dcom_01",
                discussion_id=d1.id,
                author_id="usr_02",
                content="Looking great. SRE team ran synthetic load benchmarks on the proxy failover and observed < 4ms overhead.",
                created_at=utc_now() - timedelta(days=2),
            )
            db.add(c1)

            d2 = Discussion(
                id="disc_02",
                project_id="prj_01",
                author_id="usr_04",
                title="Design System v2 token migration and Tailwind theme synchronization",
                content="We have finalized all design tokens from the Google Stitch specifications. All status badges, buttons, and alert states now align with enterprise UX standards.",
                category="Design System",
                is_pinned=False,
                is_resolved=True,
                reactions='{"rocket": ["usr_01", "usr_05"]}',
                created_at=utc_now() - timedelta(days=3),
                updated_at=utc_now() - timedelta(days=1),
            )
            db.add(d2)
            await db.flush()

            c2 = DiscussionComment(
                id="dcom_02",
                discussion_id=d2.id,
                author_id="usr_05",
                content="Verified contrast ratios and dark mode tokens across all 72 screens. Full accessibility compliance confirmed.",
                created_at=utc_now() - timedelta(days=1),
            )
            db.add(c2)
            print("Seeded discussions and comments.")

        # Check if RCA records exist
        r_res = await db.execute(select(RCARecord))
        if not r_res.scalars().first():
            t_res = await db.execute(select(Ticket))
            tickets = t_res.scalars().all()
            ticket_by_num = {t.ticket_number: t.id for t in tickets}

            tkt_1028_id = ticket_by_num.get("TKT-1028", tickets[0].id if tickets else None)
            tkt_1031_id = ticket_by_num.get("TKT-1031", tickets[1].id if len(tickets) > 1 else tkt_1028_id)

            if tkt_1028_id:
                r1 = RCARecord(
                    id="rca_01",
                    ticket_id=tkt_1028_id,
                    organization_id="org_01",
                    author_id="usr_02",
                    title="RCA: Kafka partition lag spike during peak ingestion window",
                    incident_date=utc_now() - timedelta(days=2),
                    severity="CRITICAL",
                    five_whys='["Why 1: Consumer group lagged by >12,000 offsets during 14:00 peak.", "Why 2: Database writer thread pool saturated on unindexed foreign key lookups.", "Why 3: A schema migration added a non-indexed constraint to telemetry payload table.", "Why 4: Performance regression test pipeline did not enforce index verification.", "Why 5: Lacked automated Alembic lint rule requiring indexes on all join keys."]',
                    root_cause="Missing composite index on telemetry event correlation IDs caused database full table scan during batch commit cycles.",
                    immediate_mitigation="Scaled consumer partitions 2x and applied concurrent partial index directly via online DDL.",
                    preventative_actions='["Add automated CI index verification gate for all future migrations.", "Deploy real-time Prometheus alert on Kafka partition lag > 2,000 offsets.", "Tune PostgreSQL vacuum frequency on high-churn tables."]',
                    impact_summary="P99 ingestion latency degraded from 45ms to 1,200ms for a duration of 18 minutes. Zero data loss occurred.",
                    status="APPROVED",
                    approved_by_id="usr_01",
                    approved_at=utc_now() - timedelta(days=1),
                    created_at=utc_now() - timedelta(days=4),
                    updated_at=utc_now() - timedelta(days=1),
                )
                db.add(r1)

            if tkt_1031_id:
                r2 = RCARecord(
                    id="rca_02",
                    ticket_id=tkt_1031_id,
                    organization_id="org_01",
                    author_id="usr_01",
                    title="RCA: Payment webhook retry exhaustion under third-party gateway throttle",
                    incident_date=utc_now() - timedelta(days=5),
                    severity="HIGH",
                    five_whys='["Why 1: 342 webhook deliveries failed with HTTP 429 status.", "Why 2: Inbound rate limiter did not implement exponential backoff with jitter.", "Why 3: Retry queue processed all failures in synchronized 60-second bursts.", "Why 4: Retry configuration relied on static sleep interval instead of decorrelated jitter.", "Why 5: Gateway rate limiting documentation was not updated during last SDK upgrade."]',
                    root_cause="Synchronized retry bursts caused self-inflicted DDoS against payment gateway rate limits.",
                    immediate_mitigation="Enabled exponential backoff with full jitter in webhook dispatch worker pool.",
                    preventative_actions='["Implement circuit breaker pattern on third-party webhook dispatchers.", "Add webhook delivery latency dashboard in Datadog."]',
                    impact_summary="342 customer billing notification events delayed by up to 25 minutes. No monetary loss or duplicated transactions.",
                    status="DRAFT",
                    approved_by_id=None,
                    approved_at=None,
                    created_at=utc_now() - timedelta(days=3),
                    updated_at=utc_now() - timedelta(days=1),
                )
                db.add(r2)
            print("Seeded RCA records.")

        await db.commit()
    print("Seeding verification complete.")


if __name__ == "__main__":
    asyncio.run(seed_discussions_and_rca())

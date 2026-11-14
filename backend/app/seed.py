import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models import (
    Organization,
    User,
    Project,
    ProjectMember,
    ProjectInvitation,
    Task,
    Ticket,
    WorkspaceSetting,
    Notification,
    Discussion,
    DiscussionComment,
    RCARecord,
)
from backend.app.core.security import get_password_hash

logger = logging.getLogger(__name__)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def seed_initial_data_if_empty(db: AsyncSession) -> None:
    """Seeds the initial organization, users, projects, tasks and tickets if none exist."""
    org_res = await db.execute(select(Organization))
    existing_org = org_res.scalars().first()
    if existing_org:
        return

    # 1. Organization
    org = Organization(
        id="org_01",
        name="Acme Tech",
        slug="acme-tech",
        created_at=utc_now(),
    )
    db.add(org)
    await db.flush()

    # 2. Users (from Stitch design system and user directory)
    default_password_hash = get_password_hash("bhavesh729")

    users_data = [
        {
            "id": "usr_01",
            "full_name": "Bhavesh Burad",
            "email": "bhaveshburad729@gmail.com",
            "role": "owner",
            "title": "Founder & Lead Architect",
            "department": "Executive & Architecture",
            "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBnY9OXem7tY-WC7GGIxR_JEkjBZZxyuBB-0mDqrUE6lOeiD0P2SWK26K-s-lUh0dGTZQxOlxTGW32Ij8iX-yKRMXgzDt0JPxqs-W4ENCsT_-YF18QAkuRBiF1NWi2xyCndsZyOaB-aGeYQAJAQDzEst5nV9N0oxnz6Rvo0NjCyG9e7INBNDHklHz4AE2P5GSv5kMzjbQLQU9LlePz0mmrDeSZ-Q7RXH6M0-8zNYTNg",
        },
        {
            "id": "usr_02",
            "full_name": "Shubham",
            "email": "shubhaam.tronix365@gmail.com",
            "role": "admin",
            "title": "Co-Founder & Platform Lead",
            "department": "Platform & Reliability",
            "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuAmt0YGYVVOxPr4ec8yeLMlH3eFipVV14C1qMrM6ZWl_Q3CsXSe8erXqQl5aoC-hylXdMtlpm7vAxewtZVSavdi540cHwdI20sNUsCMCCuak-zOLUoAcw0tZ70DFuiIx8Gb3wEnQn4Dk5w51h-GTXmS7PCFEawLwniAxRH1k2msgs1oH4D8Wa8mKn_ucl6LFJ6K4rpqwTBjlPjHt5Cq9qIpjIgWgzOnHZ7pEjeLmA8W",
        },
        {
            "id": "usr_03",
            "full_name": "David K.",
            "email": "david.k@acmetech.io",
            "role": "member",
            "title": "DevOps & Cloud Infra Lead",
            "department": "Infrastructure",
            "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuDVWTSLNi0GXnptwfl_xCnCJDsc4HvgETwUC34jhvb60mvLuQD-1m8SbomgblI-1Khtgxz-YIFR_GrBMiCCjBMF57DId8aNCrd7Qv8VleUPw0yGTVYEw3IWylcDmjXxsqKaDb8KRDVn5QsnFKWWMQ53xl6FKVTau3ufkYrQqol-GISclAV0oH77YrosPTEFXR2BCzYI8l6DvnDWavrx4gi1Oeve7NBIjJbr1Rk0ZTuX",
        },
        {
            "id": "usr_04",
            "full_name": "Sarah Taylor",
            "email": "sarah.t@acmetech.io",
            "role": "member",
            "title": "Product Designer",
            "department": "Product & Design",
            "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuAZR3R45TSkuyi5-9-QC88ejJbDWv3yFmbIh5ihy1fn3yrKE07uN_LmJVpWhpYlHwziMyjPvtPpBj54idYhILVcQaT2Z_gtfSlDy6pVQqg9X2it2aDiY0MBSy3dn7OcXM7RWHA8yITcG8lNnLR767DovdLaIAQ00WCMNyHA9P5hENrqJnq9hjwwc7Cs5hFebTLKpZ1xXlbl01HrOx5OphfYB_U15TE1XpYYV5j_L_Re",
        },
        {
            "id": "usr_05",
            "full_name": "Priya Nair",
            "email": "priya.n@acmetech.io",
            "role": "member",
            "title": "Design Systems & QA Lead",
            "department": "Quality Assurance",
            "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuDYYntzmFAjm3wuBly0QW3jLNrYgJN-ny5Wmyvwgajwza2B-nhztl8J7zFdzQL4gyEvg5u8ej1zYdaslQTQz-LC0tllab3aCwoT4uWnA04u1FiSMCFF14XRwErs_Ea2d8CBIhi3Wa4fwcRIQaxVOtO7aGgSlodKu0ZwwOsZn65XKxr89y2woZbtimTNtWNihVGhNbQ_e3TPo11e6SJwRnCg9_JGeYfgRxqVX3Ke3gTa",
        },
        {
            "id": "usr_06",
            "full_name": "Devon Kim",
            "email": "devon.k@acmetech.io",
            "role": "member",
            "title": "Backend Engineer",
            "department": "Core Platform",
            "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBoWj1ju1XWke5tjANyLu2zZo0DGTKkTzV3CefyOnasARprzeqz2hDjOWNzczp9uhXK9G5QeeVtO-1RRkWVQjgh_7Ns4uADNeJm1tdWXLt_4VgZoRS4vvlSUEI2Ebd6HWFUEHQr5sEIX-ZAaXr6pcmiNsB_yy7-Opwx_Ab8Wef_EtW-Xqts1cwnm5_GmjMo762LskWa87YALUUQKaju7adpvgjYkLm3qOlvS0Kz-f7N",
        },
    ]

    users = {}
    for u in users_data:
        user_obj = User(
            id=u["id"],
            full_name=u["full_name"],
            email=u["email"],
            hashed_password=default_password_hash,
            role=u["role"],
            title=u["title"],
            department=u["department"],
            avatar_url=u["avatar_url"],
            is_active=True,
            email_verified=True,
            organization_id=org.id,
            created_at=utc_now() - timedelta(days=90),
        )
        db.add(user_obj)
        users[u["id"]] = user_obj

    await db.flush()

    # 3. Canonical Projects from Stitch Design
    now = utc_now()
    projects_data = [
        {
            "id": "prj_01",
            "name": "Platform Revamp 2.0",
            "key": "PLTFRM",
            "description": "Core enterprise auth refactoring, multi-tenant workspace isolation, and high-throughput proxy migration.",
            "status": "active",
            "icon": "rocket_launch",
            "color": "bg-btn-primary",
            "visibility": "organization",
            "sla_tier": "SLA Tier 1",
            "lead_id": "usr_01",
            "start_date": now - timedelta(days=30),
            "target_date": now + timedelta(days=105),
            "members": [
                {"user_id": "usr_01", "role": "owner", "access_scope": "Full Control"},
                {"user_id": "usr_02", "role": "maintainer", "access_scope": "Full Repository Write Access"},
                {"user_id": "usr_03", "role": "developer", "access_scope": "CI/CD & Staging Deploy Rights"},
                {"user_id": "usr_04", "role": "editor", "access_scope": "Design Specs Read / Write"},
                {"user_id": "usr_05", "role": "qa", "access_scope": "Issue Filing & Test Suite Admin"},
                {"user_id": "usr_06", "role": "developer", "access_scope": "Service API Branch Write Access"},
            ],
            "invitations": [
                {"email": "alex.r@external-partner.com", "role": "viewer"},
                {"email": "bot-sec-audit@internal.tronix365.net", "role": "viewer"},
            ],
            "tasks_count": (33, 42),
            "tickets": [
                {"ticket_number": "TKT-1025", "title": "Auth proxy latency spike on us-east cluster", "severity": "blocker", "status": "wip"},
                {"ticket_number": "TKT-1031", "title": "Payment Webhook retry queue exhaustion", "severity": "critical", "status": "open"},
                {"ticket_number": "TKT-1028", "title": "Kafka consumer lag exceeding 50k messages", "severity": "critical", "status": "wip"},
            ],
        },
        {
            "id": "prj_02",
            "name": "Auth Proxy Gateway",
            "key": "PROXY",
            "description": "Zero-trust reverse proxy deployment with mTLS identity verification and rate limiting algorithms.",
            "status": "active",
            "icon": "shield_person",
            "color": "bg-btn-primary",
            "visibility": "organization",
            "sla_tier": "Standard SaaS Tier 1",
            "lead_id": "usr_02",
            "start_date": now - timedelta(days=20),
            "target_date": now + timedelta(days=40),
            "members": [
                {"user_id": "usr_02", "role": "owner", "access_scope": "Full Control"},
                {"user_id": "usr_03", "role": "maintainer", "access_scope": "CI/CD & Staging Deploy Rights"},
                {"user_id": "usr_06", "role": "developer", "access_scope": "Full Repository Write Access"},
            ],
            "invitations": [],
            "tasks_count": (26, 28),
            "tickets": [
                {"ticket_number": "TKT-1019", "title": "Cross-region telemetry replication failover", "severity": "major", "status": "on_hold"},
                {"ticket_number": "TKT-1020", "title": "mTLS certificate expiration alert policy", "severity": "major", "status": "open"},
            ],
        },
        {
            "id": "prj_03",
            "name": "Data Pipeline v3",
            "key": "DATA",
            "description": "Real-time transactional log ingestion, stream aggregation via Kafka cluster, and Snowflake lakehouse sync.",
            "status": "on_hold",
            "icon": "database",
            "color": "bg-status-on-hold",
            "visibility": "restricted",
            "sla_tier": "Vendor Dependent",
            "lead_id": "usr_03",
            "start_date": now - timedelta(days=45),
            "target_date": now + timedelta(days=60),
            "members": [
                {"user_id": "usr_03", "role": "owner", "access_scope": "Full Control"},
                {"user_id": "usr_01", "role": "maintainer", "access_scope": "Full Repository Write Access"},
                {"user_id": "usr_06", "role": "developer", "access_scope": "Full Repository Write Access"},
            ],
            "invitations": [],
            "tasks_count": (25, 56),
            "tickets": [
                {"ticket_number": "TKT-1033", "title": "Kafka partition rebalance deadlock", "severity": "critical", "status": "open"},
                {"ticket_number": "TKT-1034", "title": "Snowflake bulk upload connector timeout", "severity": "critical", "status": "wip"},
            ],
        },
        {
            "id": "prj_04",
            "name": "Mobile App Client 2.0",
            "key": "MOBILE",
            "description": "Next-gen iOS and Android unified runtime with offline operational caches and biometric quick access.",
            "status": "planning",
            "icon": "phone_iphone",
            "color": "bg-status-open",
            "visibility": "organization",
            "sla_tier": "Discovery Milestone",
            "lead_id": "usr_04",
            "start_date": now + timedelta(days=5),
            "target_date": now + timedelta(days=120),
            "members": [
                {"user_id": "usr_04", "role": "owner", "access_scope": "Full Control"},
                {"user_id": "usr_01", "role": "maintainer", "access_scope": "Full Repository Write Access"},
                {"user_id": "usr_02", "role": "editor", "access_scope": "Full Repository Write Access"},
                {"user_id": "usr_05", "role": "qa", "access_scope": "Issue Filing & Test Suite Admin"},
            ],
            "invitations": [],
            "tasks_count": (5, 34),
            "tickets": [],
        },
        {
            "id": "prj_05",
            "name": "Design System & UI",
            "key": "DESIGN",
            "description": "Component token synchronization, WCAG AAA compliance testing, and unified micro-interaction primitives.",
            "status": "active",
            "icon": "design_services",
            "color": "bg-btn-primary",
            "visibility": "organization",
            "sla_tier": "100% Synced",
            "lead_id": "usr_05",
            "start_date": now - timedelta(days=40),
            "target_date": now + timedelta(days=30),
            "members": [
                {"user_id": "usr_05", "role": "owner", "access_scope": "Full Control"},
                {"user_id": "usr_04", "role": "maintainer", "access_scope": "Design Specs Read / Write"},
                {"user_id": "usr_02", "role": "developer", "access_scope": "Full Repository Write Access"},
            ],
            "invitations": [],
            "tasks_count": (17, 19),
            "tickets": [
                {"ticket_number": "TKT-1040", "title": "Contrast ratio failure in dark mode badges", "severity": "major", "status": "open"}
            ],
        },
        {
            "id": "prj_06",
            "name": "SOC-2 Type II Audit",
            "key": "AUDIT",
            "description": "Continuous evidence gathering, internal policy automation checks, and external penetration audits.",
            "status": "active",
            "icon": "verified_user",
            "color": "bg-btn-primary",
            "visibility": "restricted",
            "sla_tier": "Evidence Ready",
            "lead_id": "usr_01",
            "start_date": now - timedelta(days=60),
            "target_date": now + timedelta(days=90),
            "members": [
                {"user_id": "usr_01", "role": "owner", "access_scope": "Full Control"},
                {"user_id": "usr_02", "role": "admin", "access_scope": "Governance & Key Management"},
            ],
            "invitations": [],
            "tasks_count": (14, 22),
            "tickets": [],
        },
    ]

    for p in projects_data:
        proj = Project(
            id=p["id"],
            name=p["name"],
            key=p["key"],
            description=p["description"],
            status=p["status"],
            icon=p["icon"],
            color=p["color"],
            visibility=p["visibility"],
            sla_tier=p["sla_tier"],
            lead_id=p["lead_id"],
            start_date=p["start_date"],
            target_date=p["target_date"],
            is_archived=False,
            organization_id=org.id,
            created_at=p["start_date"],
            updated_at=p["start_date"] + timedelta(days=5),
        )
        db.add(proj)
        await db.flush()

        # Members
        for m in p["members"]:
            member_obj = ProjectMember(
                project_id=proj.id,
                user_id=m["user_id"],
                role=m["role"],
                access_scope=m["access_scope"],
                created_at=proj.created_at,
            )
            db.add(member_obj)

        # Invitations
        for inv in p["invitations"]:
            inv_obj = ProjectInvitation(
                project_id=proj.id,
                email=inv["email"],
                role=inv["role"],
                invited_by_id=proj.lead_id,
                status="pending",
                created_at=proj.created_at + timedelta(days=1),
            )
            db.add(inv_obj)

        # Tasks
        done_count, total_count = p["tasks_count"]
        for i in range(1, total_count + 1):
            is_done = i <= done_count
            task_status = "done" if is_done else ("in_progress" if i == done_count + 1 else "todo")
            task = Task(
                task_number=f"{proj.key}-{100 + i}",
                title=f"Sprint deliverable milestone component #{i} for {proj.name}",
                description=f"Automated deliverable ticket for {proj.key}",
                status=task_status,
                project_id=proj.id,
                assignee_id=proj.lead_id,
                reporter_id="usr_01",
                organization_id=org.id,
                created_at=proj.created_at + timedelta(hours=i),
            )
            db.add(task)

        # Tickets
        for t in p["tickets"]:
            ticket = Ticket(
                ticket_number=t["ticket_number"],
                title=t["title"],
                severity=t["severity"],
                status=t["status"],
                project_id=proj.id,
                created_at=proj.created_at + timedelta(days=2),
                updated_at=utc_now() - timedelta(minutes=15),
            )
            db.add(ticket)

    # 4. Workspace Settings
    setting = WorkspaceSetting(
        organization_id=org.id,
        working_schedule="24x7 Continuous Tier-1 Operations",
        timezone="UTC",
        holidays_observed=10,
        pause_on_hold=True,
        sla_config='{"p1_response_min": 15, "p1_resolve_min": 240, "p2_response_min": 60, "p2_resolve_min": 480}',
        notification_config='{"email_alerts": true, "in_app_toast": true, "sla_breach_sms": false}',
        appearance_config='{"theme": "system", "density": "comfortable"}',
    )
    db.add(setting)

    # 5. Notifications
    seed_notifs = [
        {
            "id": "notif_001",
            "type": "sla_breach",
            "title": "SLA Breach — TKT-1025",
            "body": "Auth proxy latency spike crossed SLA threshold. Immediate action required.",
            "is_read": False,
            "target_id": "TKT-1025",
            "target_type": "ticket",
            "target_route": "/workspace/tickets/TKT-1025",
        },
        {
            "id": "notif_002",
            "type": "ticket_assigned",
            "title": "Ticket Assigned — TKT-1031",
            "body": "Payment Webhook retry queue exhaustion has been assigned to you.",
            "is_read": False,
            "actor_id": "usr_02",
            "target_id": "TKT-1031",
            "target_type": "ticket",
            "target_route": "/workspace/tickets/TKT-1031",
        },
        {
            "id": "notif_003",
            "type": "mention",
            "title": "Mention in TKT-1028",
            "body": "David K. mentioned you: '@maya please review the Kafka lag investigation.'",
            "is_read": False,
            "actor_id": "usr_03",
            "target_id": "TKT-1028",
            "target_type": "ticket",
            "target_route": "/workspace/tickets/TKT-1028",
        },
        {
            "id": "notif_004",
            "type": "comment",
            "title": "New Comment — TKT-1019",
            "body": "Priya Nair added a comment on cross-region telemetry replication failover.",
            "is_read": True,
            "actor_id": "usr_05",
            "target_id": "TKT-1019",
            "target_type": "ticket",
            "target_route": "/workspace/tickets/TKT-1019",
        },
    ]
    for sn in seed_notifs:
        n_obj = Notification(
            id=sn["id"],
            user_id="usr_01",
            organization_id=org.id,
            type=sn["type"],
            title=sn["title"],
            body=sn["body"],
            is_read=sn["is_read"],
            actor_id=sn.get("actor_id"),
            target_id=sn.get("target_id"),
            target_type=sn.get("target_type"),
            target_route=sn.get("target_route"),
            created_at=utc_now() - timedelta(minutes=30),
        )
        db.add(n_obj)

    # 7. Canonical Discussions
    discussions_data = [
        {
            "id": "disc_01",
            "project_id": "prj_01",
            "author_id": "usr_01",
            "title": "Authentication proxy failover architecture & zero-trust boundaries",
            "content": "RFC: As part of the Platform Revamp 2.0 milestone, we are transitioning all inbound requests to zero-trust gateway proxies. Please review the proposed architecture diagrams and latency impact models.",
            "category": "Architecture",
            "is_pinned": True,
            "is_resolved": False,
            "reactions": '{"thumbs_up": ["usr_02", "usr_03"], "heart": ["usr_04"]}',
            "comments": [
                {
                    "id": "dcom_01",
                    "author_id": "usr_02",
                    "content": "Looking great. SRE team ran synthetic load benchmarks on the proxy failover and observed < 4ms overhead.",
                },
                {
                    "id": "dcom_02",
                    "author_id": "usr_03",
                    "content": "All CI/CD deployment pipelines have been updated to test against the new sandbox environment.",
                },
            ],
        },
        {
            "id": "disc_02",
            "project_id": "prj_01",
            "author_id": "usr_04",
            "title": "Design System v2 token migration and Tailwind theme synchronization",
            "content": "We have finalized all design tokens from the Google Stitch specifications. All status badges, buttons, and alert states now align with enterprise UX standards.",
            "category": "Design System",
            "is_pinned": False,
            "is_resolved": True,
            "reactions": '{"rocket": ["usr_01", "usr_05"]}',
            "comments": [
                {
                    "id": "dcom_03",
                    "author_id": "usr_05",
                    "content": "Verified contrast ratios and dark mode tokens across all 72 screens. Full accessibility compliance confirmed.",
                },
            ],
        },
    ]

    for d in discussions_data:
        comments_list = d.pop("comments", [])
        disc_obj = Discussion(
            id=d["id"],
            project_id=d["project_id"],
            author_id=d["author_id"],
            title=d["title"],
            content=d["content"],
            category=d["category"],
            is_pinned=d["is_pinned"],
            is_resolved=d["is_resolved"],
            reactions=d["reactions"],
            created_at=utc_now() - timedelta(days=5),
            updated_at=utc_now() - timedelta(days=1),
        )
        db.add(disc_obj)
        await db.flush()

        for c in comments_list:
            c_obj = DiscussionComment(
                id=c["id"],
                discussion_id=disc_obj.id,
                author_id=c["author_id"],
                content=c["content"],
                created_at=utc_now() - timedelta(days=2),
            )
            db.add(c_obj)

    # 8. Canonical RCA Records
    rca_data = [
        {
            "id": "rca_01",
            "ticket_id": "TKT-1028",
            "organization_id": org.id,
            "author_id": "usr_02",
            "title": "RCA: Kafka partition lag spike during peak ingestion window",
            "incident_date": utc_now() - timedelta(days=2),
            "severity": "CRITICAL",
            "five_whys": '["Why 1: Consumer group lagged by >12,000 offsets during 14:00 peak.", "Why 2: Database writer thread pool saturated on unindexed foreign key lookups.", "Why 3: A schema migration added a non-indexed constraint to telemetry payload table.", "Why 4: Performance regression test pipeline did not enforce index verification.", "Why 5: Lacked automated Alembic lint rule requiring indexes on all join keys."]',
            "root_cause": "Missing composite index on telemetry event correlation IDs caused database full table scan during batch commit cycles.",
            "immediate_mitigation": "Scaled consumer partitions 2x and applied concurrent partial index directly via online DDL.",
            "preventative_actions": '["Add automated CI index verification gate for all future migrations.", "Deploy real-time Prometheus alert on Kafka partition lag > 2,000 offsets.", "Tune PostgreSQL vacuum frequency on high-churn tables."]',
            "impact_summary": "P99 ingestion latency degraded from 45ms to 1,200ms for a duration of 18 minutes. Zero data loss occurred.",
            "status": "APPROVED",
            "approved_by_id": "usr_01",
            "approved_at": utc_now() - timedelta(days=1),
        },
        {
            "id": "rca_02",
            "ticket_id": "TKT-1031",
            "organization_id": org.id,
            "author_id": "usr_01",
            "title": "RCA: Payment webhook retry exhaustion under third-party gateway throttle",
            "incident_date": utc_now() - timedelta(days=5),
            "severity": "HIGH",
            "five_whys": '["Why 1: 342 webhook deliveries failed with HTTP 429 status.", "Why 2: Inbound rate limiter did not implement exponential backoff with jitter.", "Why 3: Retry queue processed all failures in synchronized 60-second bursts.", "Why 4: Retry configuration relied on static sleep interval instead of decorrelated jitter.", "Why 5: Gateway rate limiting documentation was not updated during last SDK upgrade."]',
            "root_cause": "Synchronized retry bursts caused self-inflicted DDoS against payment gateway rate limits.",
            "immediate_mitigation": "Enabled exponential backoff with full jitter in webhook dispatch worker pool.",
            "preventative_actions": '["Implement circuit breaker pattern on third-party webhook dispatchers.", "Add webhook delivery latency dashboard in Datadog."]',
            "impact_summary": "342 customer billing notification events delayed by up to 25 minutes. No monetary loss or duplicated transactions.",
            "status": "DRAFT",
            "approved_by_id": None,
            "approved_at": None,
        },
    ]

    for r in rca_data:
        rca_obj = RCARecord(
            id=r["id"],
            ticket_id=r["ticket_id"],
            organization_id=r["organization_id"],
            author_id=r["author_id"],
            title=r["title"],
            incident_date=r["incident_date"],
            severity=r["severity"],
            five_whys=r["five_whys"],
            root_cause=r["root_cause"],
            immediate_mitigation=r["immediate_mitigation"],
            preventative_actions=r["preventative_actions"],
            impact_summary=r["impact_summary"],
            status=r["status"],
            approved_by_id=r["approved_by_id"],
            approved_at=r["approved_at"],
            created_at=utc_now() - timedelta(days=4),
            updated_at=utc_now() - timedelta(days=1),
        )
        db.add(rca_obj)

    await db.commit()
    logger.info("Successfully seeded initial Live Workspace organization, users, projects, tasks, tickets, discussions, RCA, settings and notifications.")

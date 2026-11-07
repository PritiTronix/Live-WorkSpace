from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, status
from pydantic import BaseModel

router = APIRouter()


class SearchResultItem(BaseModel):
    id: str
    category: str
    title: str
    subtitle: Optional[str] = None
    meta: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    total_matches: int
    tickets: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    employees: List[Dict[str, Any]]


class RecentSearchRequest(BaseModel):
    query: str


# In-memory recent searches store
RECENT_SEARCHES = ["kafka consumer lag", "SRE on-call rotation", "TKT-1028"]


@router.get("", response_model=SearchResponse, summary="Perform multi-entity spotlight search")
async def search_entities(
    q: Optional[str] = Query(default="", description="Search query string"),
    category: Optional[str] = Query(default="all", description="Entity category filter"),
):
    query_str = (q or "").lower().strip()

    all_tickets = [
        {
            "id": "TKT-1025",
            "title": "Auth proxy latency spike on us-east cluster",
            "severity": "Blocker",
            "status": "In Progress",
            "assignee": "Aarav Mehta",
            "sla": "SLA Breached (-14m)",
        },
        {
            "id": "TKT-1031",
            "title": "Payment Webhook retry queue exhaustion",
            "severity": "Critical",
            "status": "Open",
            "assignee": "Maya Shah",
            "sla": "18m SLA remaining",
        },
        {
            "id": "TKT-1029",
            "title": "Edge Envoy gateway 504 gateway-timeout in EU-Central edge ingress",
            "severity": "Major",
            "status": "In Progress",
            "assignee": "Devon Kim",
            "sla": "SLA Safe (4h left)",
        },
    ]

    all_projects = [
        {
            "id": "PRJ-101",
            "title": "Platform Revamp 2.0",
            "lead": "Maya Shah",
            "progress": 78,
            "status": "On Track",
        }
    ]

    all_tasks = [
        {
            "id": "TASK-204",
            "title": "Refactor Auth Middleware for Multi-Tenant Support",
            "status": "In Progress",
            "sprint": "Sprint 42",
            "due": "Due: Today",
        }
    ]

    all_employees = [
        {
            "id": "EMP-01",
            "name": "Maya Shah",
            "title": "Lead SRE & Triage Lead",
            "email": "maya@acmetech.io",
            "status": "In Incident War Room",
        }
    ]

    def matches(item: dict) -> bool:
        if not query_str:
            return True
        return any(query_str in str(v).lower() for v in item.values())

    matched_tickets = [t for t in all_tickets if matches(t)] if category in ("all", "tickets") else []
    matched_projects = [p for p in all_projects if matches(p)] if category in ("all", "projects") else []
    matched_tasks = [tk for tk in all_tasks if matches(tk)] if category in ("all", "tasks") else []
    matched_employees = [e for e in all_employees if matches(e)] if category in ("all", "employees") else []

    total = len(matched_tickets) + len(matched_projects) + len(matched_tasks) + len(matched_employees)

    return SearchResponse(
        query=q or "",
        total_matches=total,
        tickets=matched_tickets,
        projects=matched_projects,
        tasks=matched_tasks,
        employees=matched_employees,
    )


@router.get("/recent", response_model=List[str], summary="Retrieve recent search history")
async def get_recent_searches():
    return RECENT_SEARCHES


@router.post("/recent", status_code=status.HTTP_201_CREATED, summary="Store a recent search term")
async def add_recent_search(req: RecentSearchRequest):
    term = req.query.strip()
    if term and term not in RECENT_SEARCHES:
        RECENT_SEARCHES.insert(0, term)
        if len(RECENT_SEARCHES) > 10:
            RECENT_SEARCHES.pop()
    return {"status": "success", "term": term}

from fastapi import APIRouter
from backend.app.routes.auth import router as auth_router
from backend.app.routes.users import router as users_router
from backend.app.routes.organizations import router as orgs_router
from backend.app.routes.projects import router as projects_router
from backend.app.routes.tasks import router as tasks_router
from backend.app.routes.tickets import router as tickets_router
from backend.app.routes.sla import router as sla_router
from backend.app.routes.rca import router as rca_router
from backend.app.routes.files import router as files_router
from backend.app.routes.discussions import router as discussions_router
from backend.app.routes.analytics import router as analytics_router
from backend.app.routes.audit_logs import router as audit_logs_router
from backend.app.routes.settings import router as settings_router
from backend.app.routes.dashboard import router as dashboard_router
from backend.app.routes.search import router as search_router
from backend.app.routes.notifications import router as notifications_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(orgs_router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(tickets_router, prefix="/tickets", tags=["Tickets"])
api_router.include_router(sla_router, prefix="/sla", tags=["SLA Management"])
api_router.include_router(rca_router, prefix="/rca", tags=["Root Cause Analysis"])
api_router.include_router(files_router, prefix="/files", tags=["Files"])
api_router.include_router(discussions_router, prefix="/discussions", tags=["Discussions"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics & Reports"])
api_router.include_router(audit_logs_router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(search_router, prefix="/search", tags=["Global Search"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])

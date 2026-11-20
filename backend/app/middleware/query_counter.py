import time
import logging
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy import event
from backend.app.database import engine
from backend.app.core.config import settings

logger = logging.getLogger("api.performance")
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    logger.addHandler(_handler)
logger.setLevel(logging.INFO)

_query_count_var: ContextVar[int] = ContextVar("query_count_var", default=-1)

# Hook into SQLAlchemy cursor execution to count queries per request
@event.listens_for(engine.sync_engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    count = _query_count_var.get()
    if count >= 0:
        _query_count_var.set(count + 1)


def get_current_query_count() -> int:
    """Return the total number of database queries executed in the current request context."""
    cnt = _query_count_var.get()
    return cnt if cnt >= 0 else 0


class DevQueryLoggingMiddleware(BaseHTTPMiddleware):
    """
    Development-only middleware that measures request duration and counts
    database queries executed during the request lifecycle.
    Logs method, path, duration in ms, and query count with zero request bodies or secrets.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if settings.ENVIRONMENT != "development" and not settings.DEBUG:
            return await call_next(request)

        token = _query_count_var.set(0)
        start_time = time.perf_counter()
        try:
            response = await call_next(request)
            return response
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            total_queries = _query_count_var.get()
            _query_count_var.reset(token)
            logger.info(
                f"[DEV-PERF] {request.method} {request.url.path} completed in {duration_ms:.2f}ms ({total_queries} DB queries)"
            )

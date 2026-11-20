import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from backend.app.core.config import settings

logger = logging.getLogger("tronix.error_handler")


class CatchAllErrorMiddleware(BaseHTTPMiddleware):
    """
    Catch-all error-handling middleware sitting inside CORSMiddleware.
    Catches unexpected exceptions, logs traceback on the server
    (excluding tokens, emails, or request bodies), and returns a JSON 500 response
    with CORS headers preserved from configured origins (never wildcard).
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            # Server-side logging of the exception traceback with method and path only
            # Explicitly avoiding any tokens, emails, or request bodies
            logger.error(
                "Unhandled error during request %s %s: %s",
                request.method,
                request.url.path,
                str(exc),
                exc_info=True,
            )

            # Determine CORS headers if request contains an Origin matching configured origins
            cors_headers = {}
            origin = request.headers.get("origin")
            if origin and settings.BACKEND_CORS_ORIGINS:
                configured_origins = [str(o).rstrip("/") for o in settings.BACKEND_CORS_ORIGINS]
                if origin.rstrip("/") in configured_origins:
                    cors_headers["Access-Control-Allow-Origin"] = origin
                    cors_headers["Access-Control-Allow-Credentials"] = "true"
                    cors_headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
                    cors_headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept, X-Requested-With"

            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "internal_error",
                        "message": "An internal server error occurred.",
                    }
                },
                headers=cors_headers if cors_headers else None,
            )

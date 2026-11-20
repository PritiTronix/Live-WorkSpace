import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.routes import api_router
from backend.app.database import engine, Base, AsyncSessionLocal, get_db
from backend.app.seed import seed_initial_data_if_empty
from backend.app.middleware import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    DevQueryLoggingMiddleware,
    CatchAllErrorMiddleware,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup completed.")
    yield
    # Shutdown tasks: dispose engine pool
    await engine.dispose()


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{settings.API_V1_PREFIX}/docs",
        redoc_url=f"{settings.API_V1_PREFIX}/redoc",
        lifespan=lifespan,
    )

    # CORS Configuration
    if settings.BACKEND_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Catch-all Error Handling Middleware (inside CORS middleware)
    application.add_middleware(CatchAllErrorMiddleware)

    # Enterprise Security Headers Middleware
    application.add_middleware(SecurityHeadersMiddleware)

    # Development-only request duration and query count logger
    application.add_middleware(DevQueryLoggingMiddleware)

    # Brute-force & Credential Stuffing Protection Middleware
    application.add_middleware(RateLimitMiddleware, max_requests=60, window_seconds=60)

    # Register API V1 Routers
    application.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @application.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        if isinstance(exc.detail, dict):
            code = exc.detail.get("code", "error")
            message = exc.detail.get("message", str(exc.detail))
        else:
            code = "organization_required" if exc.status_code == 403 and "organization" in str(exc.detail).lower() else "error"
            message = str(exc.detail)

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": message,
                },
                "detail": exc.detail,
            },
            headers=exc.headers,
        )

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed",
                },
                "detail": exc.errors(),
            },
        )

    # Secure ticket storage directory
    uploads_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(os.path.join(uploads_dir, "tickets"), exist_ok=True)
    os.makedirs(os.path.join(uploads_dir, "files"), exist_ok=True)
    os.makedirs(os.path.join(uploads_dir, "tasks"), exist_ok=True)
    os.makedirs(os.path.join(uploads_dir, "avatars"), exist_ok=True)

    @application.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0",
            "database": "PostgreSQL (Neon)",
        }

    @application.get("/health/db", tags=["Health"])
    async def db_health_check(db: AsyncSession = Depends(get_db)):
        result = await db.execute(text("SELECT 1"))
        return {
            "database_status": "connected",
            "check": result.scalar(),
            "dialect": "postgresql",
        }

    return application


app = create_application()

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.routes import api_router
from backend.app.database import engine, Base, AsyncSessionLocal, get_db
from backend.app.seed import seed_initial_data_if_empty
from backend.app.middleware import SecurityHeadersMiddleware, RateLimitMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks: automatically create database tables and seed if empty
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            try:
                await conn.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan VARCHAR(50)"))
            except Exception:
                try:
                    await conn.execute(text("ALTER TABLE organizations ADD COLUMN plan VARCHAR(50)"))
                except Exception:
                    pass
            for col_name, col_type in [
                ("display_name", "VARCHAR(255)"),
                ("phone", "VARCHAR(50)"),
                ("slack_handle", "VARCHAR(100)"),
            ]:
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                except Exception:
                    try:
                        await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    except Exception:
                        pass
        async with AsyncSessionLocal() as session:
            await seed_initial_data_if_empty(session)
            await session.commit()
        logger.info("Database initialized and verified on Neon PostgreSQL.")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise e
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

    # Enterprise Security Headers Middleware
    application.add_middleware(SecurityHeadersMiddleware)

    # Brute-force & Credential Stuffing Protection Middleware
    application.add_middleware(RateLimitMiddleware, max_requests=60, window_seconds=60)

    # Register API V1 Routers
    application.include_router(api_router, prefix=settings.API_V1_PREFIX)

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

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.routes import api_router
from backend.app.database import check_database_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Application startup without automatic DB migration/connect (per project rules)
    yield
    # Shutdown tasks (e.g. pool cleanup)


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

    # Register API V1 Routers
    application.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # Secure ticket storage directory
    uploads_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(os.path.join(uploads_dir, "tickets"), exist_ok=True)

    # Health check endpoints: report database as 'connected' or 'unavailable'
    @application.get(f"{settings.API_V1_PREFIX}/health", tags=["Health"])
    @application.get("/health", tags=["Health"])
    async def health_check():
        db_connected = await check_database_connection()
        return {
            "status": "ok",
            "database": "connected" if db_connected else "unavailable",
        }

    return application


app = create_application()

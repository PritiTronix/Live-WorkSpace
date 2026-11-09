import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.core.config import settings
from backend.app.routes import api_router
from backend.app.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks: automatically create database tables if running against Postgres
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pass
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

    # Static file serving for uploads
    uploads_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(os.path.join(uploads_dir, "tickets"), exist_ok=True)
    application.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    @application.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0",
        }

    return application


app = create_application()

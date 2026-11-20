import re
from typing import List, Optional, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Live Workspace SaaS API"
    DEBUG: bool = False

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "default_secret_key_change_in_production"
    JWT_SECRET: str = "default_jwt_secret_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Organization Onboarding
    REQUIRE_EMAIL_VERIFICATION: bool = True

    # Database (Neon PostgreSQL / Hosted PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/live_workspace"
    DATABASE_URL_POOLED: Optional[str] = None
    SYNC_DATABASE_URL: Optional[str] = None

    # S3 Object Storage (Neon S3 Compatible)
    STORAGE_PROVIDER: str = "local"  # "s3" or "local"
    AWS_ENDPOINT_URL_S3: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "ap-southeast-1"
    S3_BUCKET: str = "uploads"
    UPLOAD_DIR: str = "./uploads"
    MAX_ATTACHMENT_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB

    # Realtime / Subscriptions
    NEON_REALTIME_URL: Optional[str] = None
    NEON_REALTIME_SECRET: Optional[str] = None
    NEON_AUTH_BASE_URL: Optional[str] = None

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        return v

    @field_validator("DATABASE_URL", "DATABASE_URL_POOLED", mode="before")
    @classmethod
    def assemble_async_db_url(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        url = v.strip().strip('"').strip("'")
        if url.startswith("postgres://"):
            url = "postgresql+asyncpg://" + url[len("postgres://"):]
        elif url.startswith("postgresql://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]
        elif url.startswith("sqlite:///"):
            url = "sqlite+aiosqlite:///" + url[len("sqlite:///"):]

        # For asyncpg, normalize ssl parameter
        if "sslmode=require" in url and "ssl=" not in url:
            url = url.replace("sslmode=require", "ssl=require")
        # remove channel_binding if present since asyncpg url doesn't consume channel_binding
        url = re.sub(r"[&?]channel_binding=[^&]*", "", url)
        return url

    @field_validator("SYNC_DATABASE_URL", mode="before")
    @classmethod
    def assemble_sync_db_url(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        url = v.strip().strip('"').strip("'")
        if url.startswith("postgresql+asyncpg://"):
            url = "postgresql+psycopg2://" + url[len("postgresql+asyncpg://"):]
        elif url.startswith("postgres://"):
            url = "postgresql+psycopg2://" + url[len("postgres://"):]
        elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
            url = "postgresql+psycopg2://" + url[len("postgresql://"):]
        return url

    @model_validator(mode="after")
    def derive_database_urls(self) -> "Settings":
        """Automatically derives SYNC_DATABASE_URL and DATABASE_URL_POOLED from a single DATABASE_URL."""
        if not self.SYNC_DATABASE_URL and self.DATABASE_URL:
            raw = self.DATABASE_URL
            if raw.startswith("postgresql+asyncpg://"):
                sync_url = "postgresql+psycopg2://" + raw[len("postgresql+asyncpg://"):]
            elif raw.startswith("postgres://"):
                sync_url = "postgresql+psycopg2://" + raw[len("postgres://"):]
            elif raw.startswith("postgresql://") and not raw.startswith("postgresql+psycopg2://"):
                sync_url = "postgresql+psycopg2://" + raw[len("postgresql://"):]
            elif raw.startswith("sqlite+aiosqlite:///"):
                sync_url = "sqlite:///" + raw[len("sqlite+aiosqlite:///"):]
            else:
                sync_url = raw

            # Normalize SSL for psycopg2: replace ssl=require with sslmode=require
            if "ssl=require" in sync_url and "sslmode=require" not in sync_url:
                sync_url = sync_url.replace("ssl=require", "sslmode=require")
            self.SYNC_DATABASE_URL = sync_url

        if not self.DATABASE_URL_POOLED:
            self.DATABASE_URL_POOLED = self.DATABASE_URL

        return self

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

from typing import AsyncGenerator, Optional
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, DatabaseError, SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from backend.app.core.config import settings

_engine: Optional[AsyncEngine] = None
_sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None


class Base(DeclarativeBase):
    pass


def get_engine() -> Optional[AsyncEngine]:
    """Lazily instantiate and return the async SQLAlchemy engine if DATABASE_URL is configured."""
    global _engine
    url = (settings.DATABASE_URL or "").strip()
    if not url:
        return None
    if _engine is None:
        try:
            _engine = create_async_engine(
                url,
                echo=settings.DEBUG,
                future=True,
                pool_pre_ping=True,
            )
        except Exception:
            return None
    return _engine


def get_session_factory() -> Optional[async_sessionmaker[AsyncSession]]:
    """Lazily instantiate and return async sessionmaker bound to the engine."""
    global _sessionmaker
    engine = get_engine()
    if engine is None:
        return None
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
    return _sessionmaker


class _LazySessionProxy:
    """Proxy object for backwards-compatibility with AsyncSessionLocal imports."""
    def __call__(self, *args, **kwargs):
        factory = get_session_factory()
        if factory is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="database_unavailable",
            )
        return factory(*args, **kwargs)


AsyncSessionLocal = _LazySessionProxy()
engine = None  # Lazily accessed via get_engine()


async def check_database_connection() -> bool:
    """Check if the configured database is reachable by executing a lightweight ping."""
    eng = get_engine()
    if eng is None:
        return False
    try:
        async with eng.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency providing an async database session.
    Returns HTTP 503 with error code 'database_unavailable' when the database
    is not configured in the environment or cannot be reached.
    """
    factory = get_session_factory()
    if factory is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database_unavailable",
        )

    try:
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except (OperationalError, DatabaseError, OSError) as conn_err:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="database_unavailable",
                ) from conn_err
            except HTTPException:
                await session.rollback()
                raise
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    except (OperationalError, DatabaseError, OSError) as startup_err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database_unavailable",
        ) from startup_err

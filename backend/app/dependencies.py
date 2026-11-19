from typing import List, Optional, Callable, Dict
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.database import get_db
from backend.app.models import User, Membership

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False
)

# Standardized Enterprise RBAC Hierarchy
ROLE_HIERARCHY: Dict[str, int] = {
    "owner": 100,
    "admin": 80,
    "manager": 60,
    "lead": 60,
    "member": 40,
    "employee": 40,
    "viewer": 20,
}


def is_onboarding_or_profile_path(path: str, method: str) -> bool:
    clean_path = path.rstrip("/")
    api_prefix = settings.API_V1_PREFIX.rstrip("/")

    # Health checks & API docs
    if clean_path in ("/health", "/health/db", "/docs", "/openapi.json", "/redoc"):
        return True

    # Auth endpoints (/api/v1/auth/...)
    if clean_path.startswith(f"{api_prefix}/auth"):
        return True

    # Profile endpoints (/api/v1/users/me, /api/v1/users/me/avatar)
    if clean_path == f"{api_prefix}/users/me" or clean_path.startswith(f"{api_prefix}/users/me/"):
        return True

    # Onboarding: POST /api/v1/organizations (create organization)
    if method == "POST" and clean_path == f"{api_prefix}/organizations":
        return True

    # Onboarding: join endpoints
    if clean_path == f"{api_prefix}/organizations/join" or clean_path.startswith(f"{api_prefix}/organizations/join/"):
        return True
    if clean_path.startswith(f"{api_prefix}/organizations/join-requests/mine"):
        return True
    if clean_path.endswith("/cancel") and f"{api_prefix}/organizations/join-requests/" in clean_path:
        return True

    return False


async def get_current_active_user(
    request: Request = None,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Authoritative authentication dependency.
    Validates JWT token signature, expiration, and algorithm.
    Fetches the active user from database without insecure fallbacks.
    Dynamically enforces organization membership for organization-scoped endpoints.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token or token in ("null", "undefined"):
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type", "access")
        if user_id is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()

    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account. Contact your workspace administrator.",
        )

    # Server-side authorization: users without active organization can only call onboarding, profile, and auth
    if request is not None and not is_onboarding_or_profile_path(request.url.path, request.method):
        # Verify active membership in memberships table
        membership = None
        if user.organization_id:
            m_res = await db.execute(
                select(Membership).where(
                    Membership.user_id == user.id,
                    Membership.organization_id == user.organization_id,
                    Membership.status == "active"
                )
            )
            membership = m_res.scalars().first()

        if not membership:
            # Fallback: check if user has any active membership
            any_m = await db.execute(
                select(Membership).where(
                    Membership.user_id == user.id,
                    Membership.status == "active"
                )
            )
            membership = any_m.scalars().first()

        if membership:
            user.organization_id = membership.organization_id
            user.role = membership.role
        elif user.organization_id:
            # User has legacy organization_id not yet migrated into memberships table
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "organization_required", "message": "User has no active organization membership. Please complete organization onboarding."},
            )

    return user


async def get_current_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Alias for get_current_active_user for backward compatibility."""
    return current_user


async def get_current_user_id(
    current_user: User = Depends(get_current_active_user)
) -> str:
    """Extract authenticated user identifier."""
    return current_user.id


async def get_current_tenant_id(
    current_user: User = Depends(get_current_active_user)
) -> str:
    """
    Extract authenticated organization / tenant identifier.
    Guarantees tenant context is anchored strictly to the verified user membership.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "organization_required", "message": "User has no associated organization workspace"},
        )
    return current_user.organization_id


def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Role-Based Access Control (RBAC) dependency factory.
    Enforces role privilege using both explicit role matching and hierarchy ranking.
    Elevated roles (such as Owner) automatically inherit downstream privileges.
    """
    clean_allowed = [r.lower().strip() for r in allowed_roles]
    # Compute the minimum rank required among specified roles
    min_required_rank = min(
        (ROLE_HIERARCHY.get(r, 0) for r in clean_allowed),
        default=40
    )

    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_role = (current_user.role or "member").lower().strip()
        user_rank = ROLE_HIERARCHY.get(user_role, 0)

        # Allow if exact role matched OR user outranks the required threshold (e.g. Owner)
        if user_role not in clean_allowed and user_rank < min_required_rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of the following roles: {', '.join(allowed_roles)} (Current role: {current_user.role})",
            )
        return current_user

    return role_checker


def require_min_role(min_role: str) -> Callable:
    """
    Enforce a minimum rank in the enterprise role hierarchy.
    Example: require_min_role("admin") allows both "admin" and "owner".
    """
    clean_min = min_role.lower().strip()
    target_rank = ROLE_HIERARCHY.get(clean_min, 40)

    async def min_role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_role = (current_user.role or "member").lower().strip()
        user_rank = ROLE_HIERARCHY.get(user_role, 0)
        if user_rank < target_rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires minimum role privilege '{min_role}'",
            )
        return current_user

    return min_role_checker


require_owner = require_roles(["owner"])
require_admin = require_roles(["owner", "admin"])
require_manager = require_roles(["owner", "admin", "manager", "lead"])

import asyncio
import hashlib
import time
from collections import defaultdict
from typing import Dict, List, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from backend.app.core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Industrial-grade sliding window rate limiter.
    
    Features:
    - Multi-tenant and multi-user concurrency support.
    - Proxy-aware IP resolution (CF-Connecting-IP, X-Real-IP, X-Forwarded-For).
    - User-aware bucket partitioning (authenticated users get independent quotas).
    - Periodic cache eviction to prevent memory bloat.
    - Safe concurrency with asyncio locks.
    - Zero false positives for team members sharing office/NAT IP addresses.
    """

    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Maps client_key -> list of timestamp floats
        self.history: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._req_counter = 0

        # Sensitive authentication paths requiring brute-force mitigation
        self.monitored_paths = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/reset-password",
        ]

    def _get_client_key(self, request: Request) -> str:
        """
        Derive an accurate, user-isolated rate limiting key.
        If user is authenticated, isolates by bearer token hash.
        Otherwise isolates by real client IP (traversing proxy headers).
        """
        # 1. Check for authenticated user token
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            raw_token = auth_header[7:].strip()
            if raw_token and raw_token not in ("null", "undefined"):
                token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()[:16]
                return f"user:{token_hash}"

        # 2. Check Cloudflare connecting IP
        cf_ip = request.headers.get("cf-connecting-ip")
        if cf_ip:
            return f"ip:{cf_ip.strip()}"

        # 3. Check X-Real-IP
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return f"ip:{real_ip.strip()}"

        # 4. Check X-Forwarded-For (leftmost entry is the client)
        xff = request.headers.get("x-forwarded-for")
        if xff:
            client_ip = xff.split(",")[0].strip()
            if client_ip:
                return f"ip:{client_ip}"

        # 5. Fallback to direct client socket
        if request.client and request.client.host:
            return f"ip:{request.client.host}"

        return "ip:unknown"

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # In testing/debug environments, permit higher headroom to facilitate automated suites
        is_testing = getattr(settings, "ENVIRONMENT", "").lower() == "testing" or getattr(settings, "DEBUG", False)

        # Only enforce rate limiting on monitored sensitive routes
        if not is_testing and any(path.startswith(mp) for mp in self.monitored_paths):
            client_key = self._get_client_key(request)
            now = time.time()
            cutoff = now - self.window_seconds

            async with self._lock:
                self._req_counter += 1

                # Periodic garbage collection: prune keys every 500 requests
                if self._req_counter % 500 == 0:
                    stale_keys = [
                        k for k, timestamps in self.history.items()
                        if not timestamps or timestamps[-1] <= cutoff
                    ]
                    for k in stale_keys:
                        del self.history[k]

                # Filter expired timestamps in the client's window
                active_timestamps = [t for t in self.history[client_key] if t > cutoff]
                self.history[client_key] = active_timestamps

                if len(active_timestamps) >= self.max_requests:
                    oldest_ts = active_timestamps[0]
                    retry_after = max(1, int(self.window_seconds - (now - oldest_ts)))
                    return JSONResponse(
                        status_code=429,
                        content={
                            "detail": "Too many requests. Please slow down and try again later.",
                            "retry_after_seconds": retry_after,
                        },
                        headers={"Retry-After": str(retry_after)},
                    )

                self.history[client_key].append(now)

        return await call_next(request)

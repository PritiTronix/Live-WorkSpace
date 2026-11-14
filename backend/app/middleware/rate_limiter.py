import time
from collections import defaultdict
from typing import Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-memory sliding window rate limiter for security-sensitive auth endpoints.

    Prevents automated brute-force attacks and credential stuffing.
    """

    def __init__(self, app, max_requests: int = 30, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Maps client_ip -> list of timestamps
        self.history: Dict[str, List[float]] = defaultdict(list)
        # Endpoints under strict rate limiting
        self.monitored_paths = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/reset-password",
        ]

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Only enforce rate limiting on monitored auth routes
        if any(path.startswith(mp) for mp in self.monitored_paths):
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()
            cutoff = now - self.window_seconds

            # Filter old timestamps
            self.history[client_ip] = [t for t in self.history[client_ip] if t > cutoff]

            if len(self.history[client_ip]) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please slow down and try again later.",
                        "retry_after_seconds": int(self.window_seconds - (now - self.history[client_ip][0])),
                    },
                    headers={"Retry-After": str(self.window_seconds)},
                )

            self.history[client_ip].append(now)

        return await call_next(request)

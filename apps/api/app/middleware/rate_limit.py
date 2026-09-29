"""
Rate limiting middleware for API protection.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from app.infra.cache.factory import get_cache_store
from app.infra.rate_limit.base import FixedWindowLimiter, RateLimitPolicy
import logging

logger = logging.getLogger("rate_limit")


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if path in ("/api/v1/healthz", "/api/v1/readyz") or path.startswith("/docs"):
            return await call_next(request)

        store = get_cache_store()
        limiter = FixedWindowLimiter(store)

        client_ip = request.client.host if request.client else "127.0.0.1"
        subject = f"ip:{client_ip}"

        limit = RateLimitPolicy.GLOBAL_ANON_LIMIT
        window = RateLimitPolicy.WINDOW_15M

        if "/public" in path:
            limit = RateLimitPolicy.PUBLIC_JOIN_ANON_LIMIT
            window = RateLimitPolicy.WINDOW_1M

        try:
            res = await limiter.check(f"rl:{subject}", limit, window)
            if not res.allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": {
                            "code": "RATE_LIMITED",
                            "message": "Too many requests. Please try again later.",
                            "details": {"retry_after": res.retry_after},
                            "request_id": getattr(request.state, "request_id", ""),
                        }
                    },
                    headers={
                        "Retry-After": str(res.retry_after),
                        "X-RateLimit-Limit": str(res.limit),
                        "X-RateLimit-Remaining": str(res.remaining),
                    },
                )
        except Exception as err:
            # Fail open on cache error (availability > strictness)
            logger.warning(f"Rate limiting check failed: {err}")

        response = await call_next(request)
        return response

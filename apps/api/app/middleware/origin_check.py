"""
Origin check middleware for CSRF defense.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from app.core.config import get_settings


class OriginCheckMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            origin = request.headers.get("origin") or request.headers.get("referer")
            settings = get_settings()

            # Skip checking for dev/testing when no origin header is provided
            if origin:
                allowed = any(origin.startswith(allowed_origin) for allowed_origin in settings.allowed_origins_list)
                if not allowed:
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": {
                                "code": "CSRF_ORIGIN_DENIED",
                                "message": "Cross-origin request rejected.",
                                "details": {},
                                "request_id": getattr(request.state, "request_id", ""),
                            }
                        },
                    )

        return await call_next(request)

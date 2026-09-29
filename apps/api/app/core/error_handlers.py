"""
Standardized error envelope handlers for FastAPI.
Formats all application and validation errors uniformly.
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.exceptions import AppException, RateLimitError


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    status_code = status.HTTP_400_BAD_REQUEST

    if exc.code.endswith("_NOT_FOUND"):
        status_code = status.HTTP_404_NOT_FOUND
    elif exc.code in ("UNAUTHORIZED", "INVALID_TOKEN"):
        status_code = status.HTTP_401_UNAUTHORIZED
    elif exc.code == "FORBIDDEN":
        status_code = status.HTTP_403_FORBIDDEN
    elif exc.code in ("CONFLICT", "INVALID_TRANSITION", "MEETING_NOT_JOINABLE", "REQUEST_IN_PROGRESS"):
        status_code = status.HTTP_409_CONFLICT
    elif exc.code == "RATE_LIMITED":
        status_code = status.HTTP_429_TOO_MANY_REQUESTS

    headers = {}
    if isinstance(exc, RateLimitError):
        headers["Retry-After"] = str(exc.retry_after)

    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": exc.code,
                "message": str(exc),
                "details": exc.details,
                "request_id": request_id,
            }
        },
        headers=headers,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    errors = exc.errors()
    details = {
        "fields": [
            {
                "loc": err.get("loc", []),
                "msg": err.get("msg", ""),
                "type": err.get("type", ""),
            }
            for err in errors
        ]
    }
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload",
                "details": details,
                "request_id": request_id,
            }
        },
    )

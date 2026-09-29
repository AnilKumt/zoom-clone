"""
Domain exception hierarchy.
Each exception maps to an HTTP status code and error code in error_handlers.py.
"""


class AppException(Exception):
    """Base for all domain exceptions — carries a user-facing code."""

    def __init__(self, message: str, code: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.details = details or {}


class NotFoundError(AppException):
    def __init__(self, resource: str, identifier: str = "") -> None:
        super().__init__(f"{resource} not found", f"{resource.upper()}_NOT_FOUND")


class ConflictError(AppException):
    pass


class ForbiddenError(AppException):
    def __init__(self, action: str = "perform this action") -> None:
        super().__init__(f"Not allowed to {action}", "FORBIDDEN")


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(message, "UNAUTHORIZED")


class ValidationError(AppException):
    def __init__(self, message: str, details: dict | None = None) -> None:
        super().__init__(message, "VALIDATION_ERROR", details)


class InvalidTransitionError(AppException):
    """Meeting state machine: illegal transition attempted."""

    def __init__(self, from_state: str, to_state: str) -> None:
        super().__init__(
            f"Cannot transition meeting from {from_state} to {to_state}",
            "INVALID_TRANSITION",
        )


class MeetingNotJoinableError(AppException):
    """Raised when a meeting cannot be joined with a reason code."""

    def __init__(self, reason: str) -> None:
        super().__init__(
            f"Meeting is not joinable: {reason}",
            "MEETING_NOT_JOINABLE",
            {"reason": reason},
        )


class RateLimitError(AppException):
    def __init__(self, retry_after: int = 60) -> None:
        super().__init__(
            "Too many requests",
            "RATE_LIMITED",
            {"retry_after": retry_after},
        )
        self.retry_after = retry_after

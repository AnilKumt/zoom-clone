"""
Structured JSON logging configuration.
Every log entry includes request_id and user_id when available.
"""
import logging
import json
import time
from typing import Any


class JSONFormatter(logging.Formatter):
    """Format log records as single-line JSON for log aggregators."""

    def format(self, record: logging.LogRecord) -> str:
        log: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            log["exc"] = self.formatException(record.exc_info)
        # Include any extra fields attached by middleware
        for key in ("request_id", "user_id", "route", "latency_ms", "status"):
            if hasattr(record, key):
                log[key] = getattr(record, key)
        return json.dumps(log)


def configure_logging(debug: bool = False) -> None:
    level = logging.DEBUG if debug else logging.INFO
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(level=level, handlers=[handler], force=True)
    # Silence noisy uvicorn access logs (we have our own)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

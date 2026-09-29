"""
ID generation utilities.
ULID for internal IDs (sortable, URL-safe), 10-digit string for public meeting codes.
"""
import secrets
import time


def generate_ulid() -> str:
    """Generate a ULID-like ID: timestamp (10 chars) + random (16 chars)."""
    ts = format(int(time.time() * 1000), "013x")[:10]
    rand = secrets.token_hex(8)
    return (ts + rand).upper()


def generate_meeting_code() -> str:
    """Generate a 10-digit meeting code, uniformly distributed in [1_000_000_000, 9_999_999_999]."""
    return str(secrets.randbelow(9_000_000_000) + 1_000_000_000)


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_personal_meeting_id() -> str:
    """Generate a 10-digit personal meeting ID."""
    return generate_meeting_code()

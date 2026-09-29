# Security Architecture & Checklist

## 1. Authentication & Cookie Strategy

- **First-Party Cookies**: Next.js proxies `/api/*` to the FastAPI backend, so all cookies are issued and sent same-origin (`SameSite=Lax`). This completely bypasses Safari and Chrome 3rd-party cookie blocking issues.
- **httpOnly Cookies**: Access (`Path=/`, 15m TTL) and Refresh (`Path=/api/v1/auth`, 7d TTL) tokens cannot be read by JavaScript, eliminating XSS token theft.
- **Refresh Token Rotation & Reuse Detection**: Refresh tokens are single-use. If a token is reused (indicating theft), all active sessions for that user are immediately revoked.

## 2. OTP Security

1. **HMAC Storage**: OTPs are stored in Redis as `HMAC-SHA256(otp, secret)`. Even a Redis dump will not reveal valid OTP codes.
2. **Constant-Time Comparison**: `hmac.compare_digest` prevents timing attacks on code verification.
3. **Multi-Tier Rate Limiting & Lockouts**:
   - 60s resend cooldown.
   - 3 attempts maximum per code, then 30-minute lockout.
   - 3 requests per hour maximum, then 1-hour spam lockout.
4. **No User Enumeration**: `POST /auth/register/request-otp` and `POST /auth/password/forgot` always return `202 Accepted` regardless of whether the email is registered.

## 3. Server-Side Authorization

- **Host Controls**: The client hides UI buttons for non-hosts, but **every host command is strictly verified server-side** in `HostPermissionPolicy.can()`.
- **Banned User Protection**: Removed participants have their user_id / guest_key added to Redis `room:{code}:banned`. Re-join requests return `403 FORBIDDEN`.

## 4. OWASP Top 10 Protections

| Threat | Mitigation | Code Location |
|---|---|---|
| Injection | SQLAlchemy 2.0 ORM with parameterized queries | `app/db/` |
| Broken Auth | httpOnly cookies, Argon2id hashing, OTP lockouts | `app/core/security.py`, `app/modules/auth/` |
| Sensitive Data Exposure | Minimal JWT claims, HMAC OTPs | `app/core/security.py` |
| Security Misconfiguration | Strict security headers (CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff) | `app/middleware/security_headers.py` |
| Rate Limiting / DoS | Fixed-window rate limiting middleware with fail-open fallback | `app/middleware/rate_limit.py` |
| CSRF | `SameSite=Lax` cookies + Origin check middleware on mutations | `app/middleware/origin_check.py` |
| XSS | React auto-escaping, no `dangerouslySetInnerHTML`, chat rendered strictly as text | `apps/web/` |

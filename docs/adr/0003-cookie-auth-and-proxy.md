# ADR 0003: Cookie Auth via Next.js Proxy Rewrite

## Context
Cross-origin cookie delivery between Vercel (`*.vercel.app`) and backend hosts (`*.onrender.com`) suffers from 3rd-party cookie blocking in modern browsers (Safari ITP, Chrome Privacy Sandbox).

## Decision
We configure Next.js rewrites (`/api/:path* -> API_ORIGIN/api/:path*`) to proxy REST requests through the Next.js origin.

## Consequences
- Cookies are first-party with `SameSite=Lax` and `HttpOnly`.
- Immune to cross-site cookie restrictions.
- Zero CORS overhead on API requests.

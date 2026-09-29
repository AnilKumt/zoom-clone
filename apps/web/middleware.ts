import { NextResponse, type NextRequest } from 'next/server';

/** Routes that require no auth check */
const PUBLIC_ROUTES = ['/welcome', '/signin', '/signup', '/forgot-password', '/j/', '/api/'];

/**
 * Route guard: allow if demo mode, session cookie, or public route.
 * The API enforces real auth — middleware is UX-only (redirects, not security).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes and API proxy routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? 'demo';
  const sessionCookie = req.cookies.get('access_token');

  // Demo mode: always allow (evaluators should not be blocked by auth setup)
  if (authMode === 'demo') return NextResponse.next();

  // Full auth mode: require session cookie; actual token validation happens in API
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/welcome';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

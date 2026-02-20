import { NextRequest, NextResponse } from 'next/server';

// Routes that do NOT require authentication
const PUBLIC_PATHS = ['/login', '/api/'];

// This app belongs to tenant 1 (Lions Park)
const EXPECTED_TENANT_ID = '1';

// Site ID this frontend belongs to (Lions Park = 1)
const SITE_ID = 1;

function decodeTokenPayload(token: string): { tenantId?: string; siteId?: number | null } | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  const isPublic = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  if (isPublic) {
    return NextResponse.next();
  }

  // Check for site-scoped cookie first (token_s1 for Lions Park).
  // Fall back to tenant-scoped cookie (token_1) for unrestricted admin users.
  const tokenCookie =
    request.cookies.get(`token_s${SITE_ID}`) ??
    request.cookies.get(`token_${EXPECTED_TENANT_ID}`);

  if (!tokenCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeTokenPayload(tokenCookie.value);

  // Reject wrong tenant — clear both possible cookie names
  if (!payload || payload.tenantId !== EXPECTED_TENANT_ID) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(`token_s${SITE_ID}`);
    response.cookies.delete(`token_${EXPECTED_TENANT_ID}`);
    return response;
  }

  // Reject users restricted to a different site (siteId=null means unrestricted)
  if (payload.siteId !== null && payload.siteId !== undefined && payload.siteId !== SITE_ID) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
};

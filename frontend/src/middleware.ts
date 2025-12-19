import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * TIME Frontend Route Protection Middleware
 *
 * Protects admin and authenticated routes from unauthorized access.
 * Uses httpOnly cookies for secure token storage.
 */

// Public routes (no auth required) - ONLY these are accessible without login
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/admin-login',
  '/markets',
  '/learn',
];

// Routes that require admin privileges
const ADMIN_ROUTES = [
  '/admin',
  '/admin-portal',
  '/admin/health',
  '/gift-access',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookie (more secure than localStorage)
  const authToken = request.cookies.get('time_auth_token')?.value;
  const isAdmin = request.cookies.get('time_is_admin')?.value === 'true';

  // Also check for token in Authorization header for API compatibility
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const hasValidToken = !!(authToken || headerToken);

  // Check if route is public (no auth required)
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

  // Check if route requires admin access
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route)) && !pathname.startsWith('/admin-login');

  // ADMIN ROUTES - Require admin privileges
  if (isAdminRoute) {
    if (!hasValidToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin-login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin-login';
      url.searchParams.set('error', 'admin_required');
      return NextResponse.redirect(url);
    }
  }

  // ALL OTHER ROUTES (not public, not admin) - Require authentication
  if (!isPublicRoute && !isAdminRoute && !hasValidToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Add security headers
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Block legacy register routes
  if (pathname === '/register' || pathname === '/api/auth/register') {
    return new NextResponse(null, { status: 404 });
  }

  // Allow access to public landing page, login page, auth API routes, and public assets
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/mysurro-logo.png' ||
    pathname.startsWith('/screenshots/')
  ) {
    return NextResponse.next();
  }

  // Check for admin_user_id cookie
  const adminUserId = request.cookies.get('admin_user_id')?.value;

  // If no cookie and trying to access protected route, redirect to login
  if (!adminUserId && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|mysurro-logo.png).*)',
  ],
};

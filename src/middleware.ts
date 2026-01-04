/**
 * Next.js middleware for route protection
 * Redirects unauthenticated users to sign in page
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/auth/signin",
  "/auth/error",
];

/**
 * Check if a path is public
 */
function isPublicRoute(path: string): boolean {
  return publicRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow API routes and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get session
  const session = await auth();
  const isAuthenticated = !!session?.user;

  // Redirect authenticated users from landing page to Today
  if (pathname === "/" && isAuthenticated) {
    return NextResponse.redirect(new URL("/today", req.url));
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to signin
  if (!isAuthenticated) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};


import { NextResponse, type NextRequest } from "next/server";
import { matchesSuspiciousPath, isPublicStaticPath } from "@/lib/security-paths";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicStaticPath(pathname)) {
    return NextResponse.next();
  }

  if (matchesSuspiciousPath(pathname)) {
    return new NextResponse("404 Not Found", { status: 404 });
  }

  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession && (pathname.startsWith("/dashboard") || pathname.startsWith("/settings"))) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/:path*"] };
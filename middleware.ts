import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = (session?.user as any)?.role;

  // Unauthenticated → login (but don't redirect if already on a login page)
  if (!session) {
    if (pathname === "/login" || pathname === "/mentor") return NextResponse.next();
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin/mentor routes — students get booted to dashboard
  const isMentorOrAdmin = role === "ADMIN" || role === "MENTOR";
  if (pathname.startsWith("/admin") && !isMentorOrAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Mentor login page — if already admin/mentor, go to admin panel
  if (pathname === "/mentor" && isMentorOrAdmin) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Student login page — if already logged in, redirect to right place
  if (pathname === "/login" && session) {
    return NextResponse.redirect(
      new URL(isMentorOrAdmin ? "/admin" : "/dashboard", req.url)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/canais/:path*",
    "/login",
    "/mentor",
  ],
};

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = (session?.user as any)?.role;

  // Unauthenticated → login
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes — students get booted to dashboard
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Mentor login page — if already admin, go to admin panel
  if (pathname === "/mentor" && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Student login page — if already logged in, redirect to right place
  if (pathname === "/login" && session) {
    return NextResponse.redirect(
      new URL(role === "ADMIN" ? "/admin" : "/dashboard", req.url)
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

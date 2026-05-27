import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-config";

const ADMIN_COOKIE = "ror_admin_auth";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith(ADMIN_DASHBOARD_PATH)) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_DASHBOARD_SECRET;
  if (!secret) {
    return new NextResponse(null, { status: 404 });
  }

  const key = request.nextUrl.searchParams.get("key");
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;

  if (key === secret) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("key");
    const response = NextResponse.redirect(url);
    response.cookies.set(ADMIN_COOKIE, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: ADMIN_DASHBOARD_PATH,
    });
    return response;
  }

  if (cookie === secret) {
    return NextResponse.next();
  }

  return new NextResponse(null, { status: 404 });
}

export const config = {
  matcher: "/stats-x7k9m2",
};

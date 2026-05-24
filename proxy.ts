import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE_NAME = "insforge_access_token";
const REFRESH_COOKIE_NAME = "insforge_refresh_token";

export function proxy(request: NextRequest) {
  const hasSessionCookie =
    request.cookies.has(ACCESS_COOKIE_NAME) || request.cookies.has(REFRESH_COOKIE_NAME);

  if (!hasSessionCookie) {
    const url = request.nextUrl.clone();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/tasks/:path*", "/account/:path*"],
};

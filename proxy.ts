import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "sprintroom_session";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
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

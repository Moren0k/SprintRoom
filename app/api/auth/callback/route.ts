import { NextRequest, NextResponse } from "next/server";
import { createInsForgeServerClient } from "@/src/lib/insforge-server";
import { setInsForgeSessionCookies } from "@/src/lib/insforge-cookies";
import { createApplicationScope } from "@/src/server/application-scope";
import { UserId } from "@/src/domain/ids/user-id";
import { User } from "@/src/domain/aggregates/user";
import { EmailAddress } from "@/src/domain/value-objects/email-address";
import { PersonName } from "@/src/domain/value-objects/person-name";
import {
  checkRateLimit,
  getClientIp,
} from "@/src/server/rate-limit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit("callback", ip);
  if (!ipLimit.allowed) {
    return NextResponse.redirect(
      new URL("/login?error=rate_limited", request.url),
    );
  }
  const params = request.nextUrl.searchParams;
  const code = params.get("insforge_code");
  const errorParam = params.get("error");
  const next = params.get("next") ?? "/dashboard";

  if (errorParam !== null || code === null) {
    return NextResponse.redirect(
      new URL(`/login?error=${errorParam ?? "oauth_failed"}`, request.url),
    );
  }

  const codeVerifier = request.cookies.get("insforge_code_verifier")?.value;
  if (codeVerifier === undefined) {
    return NextResponse.redirect(new URL("/login?error=missing_verifier", request.url));
  }

  const insforge = createInsForgeServerClient();
  const { data, error: exchangeError } = await insforge.auth.exchangeOAuthCode(code, codeVerifier);

  if (exchangeError !== null || data === null) {
    return NextResponse.redirect(
      new URL(`/login?error=${exchangeError?.message ?? "exchange_failed"}`, request.url),
    );
  }

  const userInfo = data.user;
  if (userInfo === undefined || userInfo.email === undefined) {
    return NextResponse.redirect(new URL("/login?error=no_email", request.url));
  }

  const scope = createApplicationScope();
  const existingUser = await scope.repositories.users.getByEmail(userInfo.email.trim());

  if (existingUser === null) {
    const newUser = User.registerGoogleOAuth(
      UserId.from(userInfo.id),
      PersonName.create(userInfo.profile?.name ?? userInfo.email),
      EmailAddress.create(userInfo.email),
      `insforge:oauth:google:${userInfo.id}`,
      scope.clock.utcNow,
    );
    await scope.repositories.users.add(newUser);
    await scope.repositories.unitOfWork.saveChanges();
  }

  const response = NextResponse.redirect(new URL(readSafeNext(next), request.url));
  setInsForgeSessionCookies(
    (name, value, options) => {
      response.cookies.set(name, value, options);
    },
    data.accessToken,
    data.refreshToken ?? null,
  );

  response.cookies.delete("insforge_code_verifier");
  return response;
}

function readSafeNext(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

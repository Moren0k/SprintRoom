export const INSFORGE_ACCESS_COOKIE = "insforge_access_token";
export const INSFORGE_REFRESH_COOKIE = "insforge_refresh_token";

export const INSFORGE_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 15;
export const INSFORGE_REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function setInsForgeSessionCookies(
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void,
  accessToken: string,
  refreshToken: string | null,
): void {
  setCookie(INSFORGE_ACCESS_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: INSFORGE_ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  if (refreshToken !== null) {
    setCookie(INSFORGE_REFRESH_COOKIE, refreshToken, {
      ...cookieOptions,
      maxAge: INSFORGE_REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
  }
}

export function clearInsForgeSessionCookies(
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void,
): void {
  setCookie(INSFORGE_ACCESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  setCookie(INSFORGE_REFRESH_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

export function getAccessTokenFromCookies(cookieHeader: string | null): string | null {
  if (cookieHeader === null) return null;
  for (const cookie of cookieHeader.split(";")) {
    const eqIdx = cookie.indexOf("=");
    if (eqIdx === -1) continue;
    const name = cookie.slice(0, eqIdx).trim();
    if (name === INSFORGE_ACCESS_COOKIE) {
      const value = cookie.slice(eqIdx + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

export function getRefreshTokenFromCookies(cookieHeader: string | null): string | null {
  if (cookieHeader === null) return null;
  for (const cookie of cookieHeader.split(";")) {
    const eqIdx = cookie.indexOf("=");
    if (eqIdx === -1) continue;
    const name = cookie.slice(0, eqIdx).trim();
    if (name === INSFORGE_REFRESH_COOKIE) {
      const value = cookie.slice(eqIdx + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

export function createInsForgeAccessCookieHeader(accessToken: string, maxAgeSeconds: number): string {
  return createInsForgeCookieHeader(INSFORGE_ACCESS_COOKIE, accessToken, maxAgeSeconds);
}

export function createInsForgeRefreshCookieHeader(refreshToken: string, maxAgeSeconds: number): string {
  return createInsForgeCookieHeader(INSFORGE_REFRESH_COOKIE, refreshToken, maxAgeSeconds);
}

export function createInsForgeSessionCookieHeaders(
  accessToken: string,
  refreshToken: string | null,
): string[] {
  const headers = [
    createInsForgeAccessCookieHeader(
      accessToken,
      INSFORGE_ACCESS_COOKIE_MAX_AGE_SECONDS,
    ),
  ];
  if (refreshToken !== null) {
    headers.push(
      createInsForgeRefreshCookieHeader(
        refreshToken,
        INSFORGE_REFRESH_COOKIE_MAX_AGE_SECONDS,
      ),
    );
  }
  return headers;
}

export function createInsForgeExpiredCookieHeaders(): string[] {
  return [
    createInsForgeExpiredAccessCookieHeader(),
    createInsForgeExpiredRefreshCookieHeader(),
  ];
}

export function createInsForgeCookieHeader(
  name: string,
  value: string,
  maxAgeSeconds: number,
): string {
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function createInsForgeExpiredAccessCookieHeader(): string {
  return createInsForgeCookieHeader(INSFORGE_ACCESS_COOKIE, "", 0);
}

export function createInsForgeExpiredRefreshCookieHeader(): string {
  return createInsForgeCookieHeader(INSFORGE_REFRESH_COOKIE, "", 0);
}

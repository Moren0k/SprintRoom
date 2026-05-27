import { timingSafeEqual } from "node:crypto";
import { ApplicationError } from "../application";
import { getCsrfTokenFromCookies } from "../lib/insforge-cookies";

const CSRF_HEADER = "x-csrf-token";

export function assertSameOrigin(request: Request): void {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin !== null) {
    if (origin !== requestOrigin) {
      throw new ApplicationError("Origen no permitido para esta solicitud.");
    }
    return;
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none") {
    return;
  }

  throw new ApplicationError("No se pudo validar el origen de la solicitud.");
}

export function assertValidCsrfToken(request: Request): void {
  const csrfCookie = getCsrfTokenFromCookies(request.headers.get("cookie"));
  const csrfHeader = request.headers.get(CSRF_HEADER)?.trim() ?? "";
  if (csrfCookie === null || csrfHeader.length === 0) {
    throw new ApplicationError("Token CSRF faltante o invalido.");
  }

  const cookieBytes = Buffer.from(csrfCookie);
  const headerBytes = Buffer.from(csrfHeader);
  if (cookieBytes.length !== headerBytes.length || !timingSafeEqual(cookieBytes, headerBytes)) {
    throw new ApplicationError("Token CSRF faltante o invalido.");
  }
}

export function assertSameOriginMutation(request: Request): void {
  assertSameOrigin(request);
}

export function assertAuthenticatedMutation(request: Request): void {
  assertSameOrigin(request);
  assertValidCsrfToken(request);
}

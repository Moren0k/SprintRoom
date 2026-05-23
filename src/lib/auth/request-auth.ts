import { createRequestContext, type RequestContext } from "../../application/abstractions/request-context";
import type { UserRepository } from "../../application/abstractions/ports";
import { UserId } from "../../domain/ids/user-id";
import { HmacSessionTokenVerifier, SessionTokenError } from "./session-token";

export const SESSION_COOKIE_NAME = "sprintroom_session";

export type AuthenticationErrorCode =
  | "missing_token"
  | "invalid_token"
  | "expired_token"
  | "user_not_found";

export class AuthenticationError extends Error {
  constructor(
    readonly code: AuthenticationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export interface ResolveRequestContextDependencies {
  readonly userRepository: UserRepository;
  readonly sessionTokenVerifier?: HmacSessionTokenVerifier;
}

export async function resolveRequestContextFromRequest(
  request: Request,
  dependencies: ResolveRequestContextDependencies,
): Promise<RequestContext> {
  const token = getSessionTokenFromRequest(request);
  if (token === null) {
    throw new AuthenticationError("missing_token", "No se encontro una sesion activa.");
  }
  const verifier = dependencies.sessionTokenVerifier ?? new HmacSessionTokenVerifier();
  try {
    const payload = verifier.verify(token);
    const user = await dependencies.userRepository.getById(UserId.from(payload.sub));
    if (user === null) {
      throw new AuthenticationError("user_not_found", "El usuario de la sesion no existe.");
    }
    return createRequestContext(user.id, user.systemRole);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    if (error instanceof SessionTokenError) {
      throw new AuthenticationError(
        error.code === "expired" ? "expired_token" : "invalid_token",
        error.message,
      );
    }
    throw new AuthenticationError("invalid_token", "La sesion no es valida.");
  }
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ") === true) {
    const token = authorization.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }
  return parseCookieHeader(request.headers.get("cookie")).get(SESSION_COOKIE_NAME) ?? null;
}

export function createSessionCookieValue(token: string, maxAgeSeconds: number): string {
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function createExpiredSessionCookieValue(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (cookieHeader === null || cookieHeader.trim().length === 0) {
    return cookies;
  }
  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...valueParts] = cookie.trim().split("=");
    if (rawName.length === 0) continue;
    cookies.set(rawName, valueParts.join("="));
  }
  return cookies;
}

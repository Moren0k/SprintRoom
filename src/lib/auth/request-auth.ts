import { createRequestContext, type RequestContext } from "../../application/abstractions/request-context";
import type { Clock, UnitOfWork, UserRepository } from "../../application/abstractions/ports";
import { User } from "../../domain/aggregates/user";
import { UserId } from "../../domain/ids/user-id";
import { EmailAddress } from "../../domain/value-objects/email-address";
import { PersonName } from "../../domain/value-objects/person-name";
import { getAccessTokenFromCookies, getRefreshTokenFromCookies } from "../insforge-cookies";
import { createInsForgeServerClient } from "../insforge-server";

type InsForgeUser = { id: string; email: string; profile?: { name?: string } };

export interface RefreshedSessionTokens {
  readonly accessToken: string;
  readonly refreshToken: string | null;
}

export interface ResolvedRequestSession {
  readonly requestContext: RequestContext;
  readonly refreshedSessionTokens: RefreshedSessionTokens | null;
  readonly accessToken: string;
}

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
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
}

export async function resolveRequestContextFromRequest(
  request: Request,
  dependencies: ResolveRequestContextDependencies,
): Promise<RequestContext> {
  return (await resolveRequestSessionFromRequest(request, dependencies)).requestContext;
}

export async function resolveRequestSessionFromRequest(
  request: Request,
  dependencies: ResolveRequestContextDependencies,
): Promise<ResolvedRequestSession> {
  const accessToken = getAccessTokenFromRequest(request);
  if (accessToken === null) {
    const refreshed = await tryRefreshSession(request, dependencies);
    if (refreshed === null) {
      throw new AuthenticationError("missing_token", "No se encontro una sesion activa.");
    }
    return refreshed;
  }

  const insforge = createInsForgeServerClient(accessToken);
  const { data, error } = await insforge.auth.getCurrentUser();

  if (error !== null || data?.user === null || data.user === undefined) {
    const refreshed = await tryRefreshSession(request, dependencies);
    if (refreshed === null) {
      throw new AuthenticationError("invalid_token", "La sesion no es valida.");
    }
    return refreshed;
  }

  return {
    requestContext: await createContextForInsForgeUser(data.user as InsForgeUser, dependencies),
    refreshedSessionTokens: null,
    accessToken,
  };
}

async function createContextForInsForgeUser(
  insforgeUser: InsForgeUser,
  dependencies: ResolveRequestContextDependencies,
): Promise<RequestContext> {
  let sprintRoomUser = await dependencies.userRepository.getById(UserId.from(insforgeUser.id));

  if (sprintRoomUser === null) {
    sprintRoomUser = await dependencies.userRepository.getByEmail(insforgeUser.email.trim());
    if (sprintRoomUser !== null) {
      sprintRoomUser.updateProfile(
        sprintRoomUser.fullName,
        sprintRoomUser.email,
        dependencies.clock.utcNow,
      );
      await dependencies.unitOfWork.saveChanges();
    } else {
      sprintRoomUser = User.registerGoogleOAuth(
        UserId.from(insforgeUser.id),
        PersonName.create(insforgeUser.profile?.name ?? insforgeUser.email),
        EmailAddress.create(insforgeUser.email),
        `insforge:auto:${insforgeUser.id}`,
        dependencies.clock.utcNow,
      );
      await dependencies.userRepository.add(sprintRoomUser);
      await dependencies.unitOfWork.saveChanges();
    }
  }

  return createRequestContext(sprintRoomUser.id, sprintRoomUser.systemRole);
}

async function tryRefreshSession(
  request: Request,
  dependencies: ResolveRequestContextDependencies,
): Promise<ResolvedRequestSession | null> {
  const refreshToken = getRefreshTokenFromCookies(request.headers.get("cookie"));
  if (refreshToken === null) return null;

  const insforge = createInsForgeServerClient();
  const { data, error } = await insforge.auth.refreshSession({ refreshToken });
  if (
    error !== null ||
    data === null ||
    data.user === null ||
    data.user === undefined ||
    typeof data.accessToken !== "string" ||
    data.accessToken.length === 0
  ) {
    return null;
  }

  return {
    requestContext: await createContextForInsForgeUser(data.user as InsForgeUser, dependencies),
    refreshedSessionTokens: {
      accessToken: data.accessToken,
      refreshToken: typeof data.refreshToken === "string" && data.refreshToken.length > 0
        ? data.refreshToken
        : null,
    },
    accessToken: data.accessToken,
  };
}

export function getAccessTokenFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ") === true) {
    const token = authorization.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }
  return getAccessTokenFromCookies(request.headers.get("cookie"));
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

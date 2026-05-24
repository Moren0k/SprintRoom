import { cookies } from "next/headers";
import { Pbkdf2PasswordHasher } from "../lib/auth";
import { InsForgeAuditLogger } from "../lib/audit";
import { createInsForgeDatabaseGateway, createInsForgeRepositoryScope } from "../lib/insforge";
import { InsForgeDashboardReadModel } from "../lib/read-models";
import { readSprintRoomEnv } from "../lib/env";
import { SystemClock } from "../lib/system-clock";
import type { RequestContext } from "../application";
import { setInsForgeSessionCookies } from "../lib/insforge-cookies";
import {
  resolveRequestSessionFromRequest,
  type RefreshedSessionTokens,
} from "../lib/auth";

export interface ApplicationScope {
  readonly env: ReturnType<typeof readSprintRoomEnv>;
  readonly clock: SystemClock;
  readonly passwordHasher: Pbkdf2PasswordHasher;
  readonly repositories: ReturnType<typeof createInsForgeRepositoryScope>;
  readonly auditLogger: InsForgeAuditLogger;
  readonly dashboardReadModel: InsForgeDashboardReadModel;
}

export interface AuthenticatedApplicationScope extends ApplicationScope {
  readonly requestContext: RequestContext;
  readonly refreshedSessionTokens: RefreshedSessionTokens | null;
}

export function createApplicationScope(requestContext?: RequestContext): ApplicationScope {
  const env = readSprintRoomEnv();
  const clock = new SystemClock();
  const database = createInsForgeDatabaseGateway();
  const repositories = createInsForgeRepositoryScope(database, {
    actorId: requestContext?.userId,
    utcNow: () => clock.utcNow,
  });
  return {
    env,
    clock,
    passwordHasher: new Pbkdf2PasswordHasher(),
    repositories,
    auditLogger: new InsForgeAuditLogger(database),
    dashboardReadModel: new InsForgeDashboardReadModel(database),
  };
}

export async function createAuthenticatedApplicationScope(
  request: Request,
): Promise<AuthenticatedApplicationScope> {
  const unauthenticatedScope = createApplicationScope();
  const resolvedSession = await resolveRequestSessionFromRequest(request, {
    userRepository: unauthenticatedScope.repositories.users,
    unitOfWork: unauthenticatedScope.repositories.unitOfWork,
    clock: unauthenticatedScope.clock,
  });
  const { requestContext } = resolvedSession;
  await persistRefreshedSessionTokens(resolvedSession.refreshedSessionTokens);
  return {
    ...createApplicationScope(requestContext),
    requestContext,
    refreshedSessionTokens: resolvedSession.refreshedSessionTokens,
  };
}

async function persistRefreshedSessionTokens(
  tokens: RefreshedSessionTokens | null,
): Promise<void> {
  if (tokens === null) return;
  const cookieStore = await cookies();
  setInsForgeSessionCookies(
    (name, value, options) => {
      cookieStore.set(name, value, options);
    },
    tokens.accessToken,
    tokens.refreshToken,
  );
}

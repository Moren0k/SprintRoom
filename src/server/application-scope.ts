import { HmacSessionTokenFactory, HmacSessionTokenVerifier, Pbkdf2PasswordHasher } from "../lib/auth";
import { InsForgeAuditLogger } from "../lib/audit";
import { createInsForgeDatabaseGateway, createInsForgeRepositoryScope } from "../lib/insforge";
import { InsForgeDashboardReadModel } from "../lib/read-models";
import { readSprintRoomEnv } from "../lib/env";
import { SystemClock } from "../lib/system-clock";
import type { RequestContext } from "../application";
import { resolveRequestContextFromRequest } from "../lib/auth";

export interface ApplicationScope {
  readonly env: ReturnType<typeof readSprintRoomEnv>;
  readonly clock: SystemClock;
  readonly passwordHasher: Pbkdf2PasswordHasher;
  readonly sessionTokenFactory: HmacSessionTokenFactory;
  readonly sessionTokenVerifier: HmacSessionTokenVerifier;
  readonly repositories: ReturnType<typeof createInsForgeRepositoryScope>;
  readonly auditLogger: InsForgeAuditLogger;
  readonly dashboardReadModel: InsForgeDashboardReadModel;
}

export interface AuthenticatedApplicationScope extends ApplicationScope {
  readonly requestContext: RequestContext;
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
    sessionTokenFactory: new HmacSessionTokenFactory(env),
    sessionTokenVerifier: new HmacSessionTokenVerifier(env),
    repositories,
    auditLogger: new InsForgeAuditLogger(database),
    dashboardReadModel: new InsForgeDashboardReadModel(database),
  };
}

export async function createAuthenticatedApplicationScope(
  request: Request,
): Promise<AuthenticatedApplicationScope> {
  const unauthenticatedScope = createApplicationScope();
  const requestContext = await resolveRequestContextFromRequest(request, {
    userRepository: unauthenticatedScope.repositories.users,
    sessionTokenVerifier: unauthenticatedScope.sessionTokenVerifier,
  });
  return {
    ...createApplicationScope(requestContext),
    requestContext,
  };
}

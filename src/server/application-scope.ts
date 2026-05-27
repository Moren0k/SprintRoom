import { cookies } from "next/headers";
import { Pbkdf2PasswordHasher } from "../lib/auth";
import { InsForgeAuditLogger } from "../lib/audit";
import {
  InsForgeUserRepository,
  createAdminInsForgeDatabaseGateway,
  createInsForgeDatabaseGateway,
  createInsForgeRepositoryScope,
  createSprintRoomInsForgeClient,
} from "../lib/insforge";
import { InsForgeDashboardReadModel } from "../lib/read-models";
import { readSprintRoomEnv } from "../lib/env";
import { SystemClock } from "../lib/system-clock";
import type { RequestContext } from "../application";
import { ensureCsrfCookie, getCsrfTokenFromCookies, setInsForgeSessionCookies } from "../lib/insforge-cookies";
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

function buildApplicationScope(
  database: ReturnType<typeof createInsForgeDatabaseGateway>,
  userDatabase: ReturnType<typeof createInsForgeDatabaseGateway> = database,
  requestContext?: RequestContext,
): ApplicationScope {
  const env = readSprintRoomEnv();
  const clock = new SystemClock();
  const repositories = createInsForgeRepositoryScope(database, {
    actorId: requestContext?.userId,
    utcNow: () => clock.utcNow,
  });
  const users = new InsForgeUserRepository(userDatabase, repositories.unitOfWork);
  return {
    env,
    clock,
    passwordHasher: new Pbkdf2PasswordHasher(),
    repositories: {
      ...repositories,
      users,
    },
    auditLogger: new InsForgeAuditLogger(database),
    dashboardReadModel: new InsForgeDashboardReadModel(database, userDatabase),
  };
}

export function createAdminApplicationScope(requestContext?: RequestContext): ApplicationScope {
  const database = createAdminInsForgeDatabaseGateway();
  return buildApplicationScope(database, database, requestContext);
}

export async function createAuthenticatedApplicationScope(
  request: Request,
): Promise<AuthenticatedApplicationScope> {
  const adminScope = createAdminApplicationScope();
  const resolvedSession = await resolveRequestSessionFromRequest(request, {
    userRepository: adminScope.repositories.users,
    unitOfWork: adminScope.repositories.unitOfWork,
    clock: adminScope.clock,
  });
  const { requestContext } = resolvedSession;
  await persistRefreshedSessionTokens(resolvedSession.refreshedSessionTokens);
  await ensureAuthenticatedCsrfCookie();
  const database = createInsForgeDatabaseGateway(
    createSprintRoomInsForgeClient({ accessToken: resolvedSession.accessToken }),
  );
  const adminDatabase = createAdminInsForgeDatabaseGateway();
  return {
    ...buildApplicationScope(database, adminDatabase, requestContext),
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

async function ensureAuthenticatedCsrfCookie(): Promise<void> {
  const cookieStore = await cookies();
  ensureCsrfCookie(
    (name, value, options) => {
      cookieStore.set(name, value, options);
    },
    getCsrfTokenFromCookies(cookieStore.toString()),
  );
}

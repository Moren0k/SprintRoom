import type { SystemRole } from "../../domain/enums/system-role";
import type { UserId } from "../../domain/ids/user-id";

/**
 * Contexto de ejecucion de un comando o query: identifica al usuario actual
 * y su rol global. Equivale al `RequestContext` de la implementacion previa.
 */
export interface RequestContext {
  readonly userId: UserId;
  readonly systemRole: SystemRole;
}

export function createRequestContext(userId: UserId, systemRole: SystemRole): RequestContext {
  return { userId, systemRole };
}

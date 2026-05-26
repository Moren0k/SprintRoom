import { createHash } from "node:crypto";
import type { InsForgeDatabaseGateway, QueryFilter } from "../insforge/database-gateway";
import type { ProjectKeyRow } from "../insforge/schema";
import type { KeyHasher } from "../../application/abstractions/ports";

export class McpAuthenticationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "McpAuthenticationError";
  }
}

export interface ProjectKeyResolution {
  readonly projectId: string;
  readonly keyId: string;
}

export function hashProjectKey(key: string): string {
  return createHash("sha256").update(key, "utf-8").digest("hex");
}

export class Sha256KeyHasher implements KeyHasher {
  hash(key: string): string {
    return hashProjectKey(key);
  }
}

export async function resolveProjectKey(
  database: InsForgeDatabaseGateway,
  projectKey: string,
): Promise<ProjectKeyResolution> {
  if (projectKey.length === 0) {
    throw new McpAuthenticationError(
      "missing_project_key",
      "PROJECT_KEY es obligatorio. Enviala en el header X-Project-Key.",
    );
  }

  const keyHash = hashProjectKey(projectKey);

  const filters: ReadonlyArray<QueryFilter> = [
    { operator: "eq", column: "key_hash", value: keyHash },
  ];

  const row = await database.selectOne<ProjectKeyRow>("project_keys", filters);

  if (row === null) {
    throw new McpAuthenticationError(
      "invalid_project_key",
      "La PROJECT_KEY proporcionada no es valida o no pertenece a ningun proyecto.",
    );
  }

  if (!row.is_active) {
    throw new McpAuthenticationError(
      "project_key_inactive",
      "La PROJECT_KEY esta desactivada. Contacta al administrador del proyecto.",
    );
  }

  return { projectId: row.project_id, keyId: row.id };
}

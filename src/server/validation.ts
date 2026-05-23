import { ApplicationError } from "../application";
import { ProjectRole } from "../domain/enums/project-role";
import { SystemRole } from "../domain/enums/system-role";
import type { JsonObject } from "./http";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireString(body: JsonObject, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError(`El campo ${key} es obligatorio.`);
  }
  return value;
}

export function optionalString(body: JsonObject, key: string, fallback = ""): string {
  const value = body[key];
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "string") {
    throw new ApplicationError(`El campo ${key} debe ser texto.`);
  }
  return value;
}

export function optionalStringArray(body: JsonObject, key: string): string[] {
  const value = body[key];
  if (value === undefined || value === null) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string" && item.trim().length > 0)
  ) {
    throw new ApplicationError(`El campo ${key} debe ser un arreglo de texto.`);
  }
  return value;
}

export function requireUuid(value: string, fieldName: string): string {
  if (!UUID_REGEX.test(value)) {
    throw new ApplicationError(`El campo ${fieldName} debe ser un UUID valido.`);
  }
  return value;
}

export function requireUuidString(body: JsonObject, key: string): string {
  return requireUuid(requireString(body, key), key);
}

export function optionalUuidArray(body: JsonObject, key: string): string[] {
  return optionalStringArray(body, key).map((value, index) =>
    requireUuid(value, `${key}[${index}]`),
  );
}

export function parseSystemRole(value: unknown): SystemRole {
  if (value === SystemRole.Member || value === SystemRole.Administrator) {
    return value;
  }
  throw new ApplicationError("El rol global indicado no es valido.");
}

export function parseProjectRole(value: unknown): ProjectRole {
  if (
    value === ProjectRole.Viewer ||
    value === ProjectRole.Contributor ||
    value === ProjectRole.Maintainer ||
    value === ProjectRole.Owner
  ) {
    return value;
  }
  throw new ApplicationError("El rol de proyecto indicado no es valido.");
}

export interface InitialMemberInput {
  readonly userId: string;
  readonly projectRole: ProjectRole;
}

export function optionalInitialMembers(body: JsonObject): InitialMemberInput[] {
  const value = body.initialMembers;
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ApplicationError("El campo initialMembers debe ser un arreglo.");
  }
  return value.map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new ApplicationError("Cada miembro inicial debe ser un objeto.");
    }
    const member = item as JsonObject;
    return {
      userId: requireUuidString(member, "userId"),
      projectRole: parseProjectRole(member.projectRole),
    };
  });
}

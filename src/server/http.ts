import { NextResponse } from "next/server";
import { ApplicationError } from "../application";
import { DomainError } from "../domain";
import { AuthenticationError } from "../lib/auth";
import { PersistenceError, PersistenceMappingError } from "../lib/insforge";

export type JsonObject = Record<string, unknown>;

export function ok(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function created(data: unknown): NextResponse {
  return ok(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export async function readJsonObject(request: Request): Promise<JsonObject> {
  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ApplicationError("El cuerpo de la peticion debe ser un objeto JSON.");
  }
  return body as JsonObject;
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AuthenticationError) {
    return errorResponse(error.message, 401, error.code);
  }
  if (error instanceof ApplicationError || error instanceof DomainError) {
    return errorResponse(error.message, 400, "business_error");
  }
  if (error instanceof PersistenceError || error instanceof PersistenceMappingError) {
    return errorResponse("No fue posible completar la operacion solicitada.", 503, "persistence_error");
  }
  if (error instanceof Error && error.message.startsWith("Falta la variable de entorno")) {
    return errorResponse(error.message, 500, "configuration_error");
  }
  return errorResponse("Error interno del servidor.", 500, "internal_error");
}

function errorResponse(message: string, status: number, code: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

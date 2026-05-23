import { createHmac, timingSafeEqual } from "node:crypto";
import type { SessionTokenFactory } from "../../application/abstractions/ports";
import type { User } from "../../domain/aggregates/user";
import { SystemRole, type SystemRole as SystemRoleType } from "../../domain/enums/system-role";
import { readSprintRoomEnv, type SprintRoomEnv } from "../env";

export type SessionTokenErrorCode = "malformed" | "invalid_signature" | "expired";

export class SessionTokenError extends Error {
  constructor(
    readonly code: SessionTokenErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SessionTokenError";
  }
}

export interface SessionTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly systemRole: SystemRoleType;
  readonly iat: number;
  readonly exp: number;
}

export class HmacSessionTokenFactory implements SessionTokenFactory {
  constructor(private readonly env: SprintRoomEnv = readSprintRoomEnv()) {}

  create(user: User): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: SessionTokenPayload = {
      sub: user.id,
      email: user.email.value,
      systemRole: user.systemRole,
      iat: issuedAt,
      exp: issuedAt + this.env.sessionTokenTtlSeconds,
    };
    return signPayload(payload, this.env.sessionTokenSecret);
  }
}

export class HmacSessionTokenVerifier {
  constructor(private readonly env: SprintRoomEnv = readSprintRoomEnv()) {}

  verify(token: string): SessionTokenPayload {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new SessionTokenError("malformed", "El token de sesion no tiene un formato valido.");
    }
    const [header, payload, signature] = parts;
    const expectedSignature = sign(`${header}.${payload}`, this.env.sessionTokenSecret);
    if (!safeEquals(signature, expectedSignature)) {
      throw new SessionTokenError("invalid_signature", "La firma del token de sesion no es valida.");
    }
    const parsedHeader = parseJsonObject(header);
    if (parsedHeader.alg !== "HS256" || parsedHeader.typ !== "JWT") {
      throw new SessionTokenError("malformed", "El encabezado del token de sesion no es valido.");
    }
    const parsed = parseSessionTokenPayload(payload);
    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      throw new SessionTokenError("expired", "El token de sesion expiro.");
    }
    return parsed;
  }
}

function signPayload(payload: SessionTokenPayload, secret: string): string {
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const body = encodeJson(payload);
  return `${header}.${body}.${sign(`${header}.${body}`, secret)}`;
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "base64url");
  const rightBuffer = Buffer.from(right, "base64url");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseSessionTokenPayload(value: string): SessionTokenPayload {
  const parsed = parseJsonObject(value);
  if (
    typeof parsed.sub !== "string" ||
    typeof parsed.email !== "string" ||
    (parsed.systemRole !== SystemRole.Member && parsed.systemRole !== SystemRole.Administrator) ||
    typeof parsed.iat !== "number" ||
    typeof parsed.exp !== "number"
  ) {
    throw new SessionTokenError("malformed", "El contenido del token de sesion no es valido.");
  }
  return parsed as unknown as SessionTokenPayload;
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new SessionTokenError("malformed", "El token de sesion no tiene un formato valido.");
  }
}

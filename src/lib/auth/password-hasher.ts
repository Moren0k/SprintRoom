import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import type { PasswordHasher } from "../../application/abstractions/ports";

const ALGORITHM = "pbkdf2_sha256";
const ITERATIONS = 310_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export class Pbkdf2PasswordHasher implements PasswordHasher {
  hash(plainTextPassword: string): string {
    const normalized = this.normalizePassword(plainTextPassword);
    const salt = randomBytes(16).toString("base64url");
    const key = pbkdf2Sync(normalized, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("base64url");
    return `${ALGORITHM}$${ITERATIONS}$${salt}$${key}`;
  }

  verify(plainTextPassword: string, passwordHash: string): boolean {
    if (plainTextPassword.trim().length === 0) {
      return false;
    }
    const parts = passwordHash.split("$");
    if (parts.length !== 4 || parts[0] !== ALGORITHM) {
      return false;
    }
    const iterations = Number.parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations <= 0) {
      return false;
    }
    const expected = Buffer.from(parts[3], "base64url");
    const actual = pbkdf2Sync(
      this.normalizePassword(plainTextPassword),
      parts[2],
      iterations,
      expected.length,
      DIGEST,
    );
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private normalizePassword(plainTextPassword: string): string {
    if (plainTextPassword.trim().length === 0) {
      throw new Error("La contraseña es obligatoria.");
    }
    return plainTextPassword;
  }
}

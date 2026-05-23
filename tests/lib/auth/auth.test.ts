import { describe, expect, it } from "vitest";
import type { UserRepository } from "../../../src/application/abstractions/ports";
import { User } from "../../../src/domain/aggregates/user";
import { AccountOrigin } from "../../../src/domain/enums/account-origin";
import { SystemRole } from "../../../src/domain/enums/system-role";
import type { UserId } from "../../../src/domain/ids/user-id";
import { UserId as UserIdFactory } from "../../../src/domain/ids/user-id";
import { EmailAddress } from "../../../src/domain/value-objects/email-address";
import { PersonName } from "../../../src/domain/value-objects/person-name";
import { Pbkdf2PasswordHasher } from "../../../src/lib/auth/password-hasher";
import {
  AuthenticationError,
  createSessionCookieValue,
  resolveRequestContextFromRequest,
} from "../../../src/lib/auth/request-auth";
import {
  HmacSessionTokenFactory,
  HmacSessionTokenVerifier,
  SessionTokenError,
} from "../../../src/lib/auth/session-token";
import type { SprintRoomEnv } from "../../../src/lib/env";

const env: SprintRoomEnv = {
  insforgeUrl: "https://example.insforge.app",
  insforgeAnonKey: "anon",
  insforgeApiKey: "api-key",
  sessionTokenSecret: "test-secret-with-enough-entropy",
  sessionTokenTtlSeconds: 60,
};

class FakeUserRepository implements UserRepository {
  constructor(private readonly users: ReadonlyArray<User>) {}

  async add(): Promise<void> {}

  async getById(userId: UserId): Promise<User | null> {
    return this.users.find((user) => user.id === userId) ?? null;
  }

  async getByEmail(normalizedEmail: string): Promise<User | null> {
    return this.users.find((user) => user.email.value === normalizedEmail) ?? null;
  }

  async getByIds(userIds: ReadonlyArray<UserId>): Promise<ReadonlyArray<User>> {
    const set = new Set(userIds);
    return this.users.filter((user) => set.has(user.id));
  }
}

function createUser(): User {
  return User.rehydrate(
    UserIdFactory.from("00000000-0000-0000-0000-000000000001"),
    PersonName.create("Session User"),
    EmailAddress.create("session@sprintroom.dev"),
    "hash::session",
    SystemRole.Administrator,
    AccountOrigin.PublicRegistration,
    new Date("2026-05-23T10:00:00.000Z"),
    new Date("2026-05-23T10:00:00.000Z"),
  );
}

describe("auth infrastructure", () => {
  it("hashes and verifies passwords with PBKDF2", () => {
    const hasher = new Pbkdf2PasswordHasher();
    const hash = hasher.hash("super-secret-password");

    expect(hash).toMatch(/^pbkdf2_sha256\$/);
    expect(hasher.verify("super-secret-password", hash)).toBe(true);
    expect(hasher.verify("wrong-password", hash)).toBe(false);
    expect(hasher.verify("super-secret-password", "malformed")).toBe(false);
  });

  it("creates, verifies and rejects invalid session tokens", () => {
    const user = createUser();
    const token = new HmacSessionTokenFactory(env).create(user);
    const payload = new HmacSessionTokenVerifier(env).verify(token);

    expect(payload).toMatchObject({
      sub: user.id,
      email: user.email.value,
      systemRole: SystemRole.Administrator,
    });
    expect(() => new HmacSessionTokenVerifier(env).verify(`${token}x`)).toThrow(SessionTokenError);

    const expiredToken = new HmacSessionTokenFactory({
      ...env,
      sessionTokenTtlSeconds: -1,
    }).create(user);
    expect(() => new HmacSessionTokenVerifier(env).verify(expiredToken)).toThrow(SessionTokenError);
  });

  it("resolves request context from bearer token or session cookie", async () => {
    const user = createUser();
    const token = new HmacSessionTokenFactory(env).create(user);
    const userRepository = new FakeUserRepository([user]);
    const sessionTokenVerifier = new HmacSessionTokenVerifier(env);

    const fromHeader = await resolveRequestContextFromRequest(
      new Request("https://sprintroom.dev/api/account", {
        headers: { authorization: `Bearer ${token}` },
      }),
      { userRepository, sessionTokenVerifier },
    );
    expect(fromHeader).toEqual({ userId: user.id, systemRole: user.systemRole });

    const fromCookie = await resolveRequestContextFromRequest(
      new Request("https://sprintroom.dev/api/account", {
        headers: { cookie: createSessionCookieValue(token, 60) },
      }),
      { userRepository, sessionTokenVerifier },
    );
    expect(fromCookie).toEqual({ userId: user.id, systemRole: user.systemRole });
  });

  it("fails with explicit authentication errors", async () => {
    await expect(
      resolveRequestContextFromRequest(new Request("https://sprintroom.dev/api/account"), {
        userRepository: new FakeUserRepository([]),
        sessionTokenVerifier: new HmacSessionTokenVerifier(env),
      }),
    ).rejects.toMatchObject(new AuthenticationError("missing_token", "No se encontro una sesion activa."));
  });
});

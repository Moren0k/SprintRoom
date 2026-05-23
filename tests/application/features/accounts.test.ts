import { describe, expect, it } from "vitest";
import { ApplicationError } from "../../../src/application/abstractions/application-error";
import {
  CreateAdministrativeUserHandler,
  LoginHandler,
  RegisterPublicUserHandler,
  UpdateCurrentUserProfileHandler,
} from "../../../src/application/features/accounts";
import { SystemRole } from "../../../src/domain/enums/system-role";
import { UserId } from "../../../src/domain/ids/user-id";
import {
  FakeClock,
  FakePasswordHasher,
  FakeSessionTokenFactory,
  FakeUnitOfWork,
  InMemoryUserRepository,
} from "../support/fakes";
import { TestData } from "../support/test-data";

describe("Accounts", () => {
  it("RegisterPublicUser should persist user and require redirect to login", async () => {
    const users = new InMemoryUserRepository();
    const unitOfWork = new FakeUnitOfWork();
    const handler = new RegisterPublicUserHandler(
      users,
      new FakePasswordHasher(),
      unitOfWork,
      new FakeClock(new Date()),
    );

    const result = await handler.handle({
      fullName: "Jhos",
      email: "jhos@example.com",
      password: "secret",
    });

    expect(result.requiresRedirectToLogin).toBe(true);
    expect(unitOfWork.saveChangesCalls).toBe(1);
    expect(typeof result.userId).toBe("string");
    expect(result.userId.length).toBeGreaterThan(0);
  });

  it("Login should return session token when password matches", async () => {
    const users = new InMemoryUserRepository();
    const user = TestData.createUser("User", "login@example.com");
    await users.add(user);
    const handler = new LoginHandler(
      users,
      new FakePasswordHasher(),
      new FakeSessionTokenFactory(),
    );

    const result = await handler.handle({
      email: "login@example.com",
      password: "secret",
    });

    expect(result.sessionToken.startsWith("token::")).toBe(true);
    expect(result.userId).toBe(user.id);
  });

  it("CreateAdministrativeUser should reject non administrator", async () => {
    const handler = new CreateAdministrativeUserHandler(
      new InMemoryUserRepository(),
      new FakePasswordHasher(),
      new FakeUnitOfWork(),
      new FakeClock(new Date()),
    );

    await expect(
      handler.handle({
        requestContext: { userId: UserId.new(), systemRole: SystemRole.Member },
        fullName: "Nuevo",
        email: "nuevo@example.com",
        password: "secret",
        systemRole: SystemRole.Member,
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("UpdateCurrentUserProfile should change full name and email", async () => {
    const users = new InMemoryUserRepository();
    const user = TestData.createUser("Antes", "antes@example.com");
    await users.add(user);
    const handler = new UpdateCurrentUserProfileHandler(
      users,
      new FakeUnitOfWork(),
      new FakeClock(new Date()),
    );

    const result = await handler.handle({
      requestContext: { userId: user.id, systemRole: user.systemRole },
      fullName: "Despues",
      email: "despues@example.com",
    });

    expect(result.fullName).toBe("Despues");
    expect(result.email).toBe("despues@example.com");
  });
});

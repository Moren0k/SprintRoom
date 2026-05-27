import { createInsForgeServerClient } from "@/src/lib/insforge-server";
import { createAdminApplicationScope } from "@/src/server/application-scope";
import { User } from "@/src/domain/aggregates/user";
import { EmailAddress } from "@/src/domain/value-objects/email-address";
import { PersonName } from "@/src/domain/value-objects/person-name";
import { ApplicationError } from "@/src/application";
import { readPasswordPolicyError } from "@/src/lib/auth/password-policy";
import { created, handleRouteError, readJsonObject } from "@/src/server/http";
import { requireString } from "@/src/server/validation";
import { assertSameOriginMutation } from "@/src/server/security";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/src/server/rate-limit";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const ip = getClientIp(request);
    const ipLimit = await checkRateLimit("register", ip);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetMs);

    const body = await readJsonObject(request);
    const fullName = requireString(body, "fullName").trim();
    const email = requireString(body, "email").trim();
    const password = requireString(body, "password");

    const passwordError = readPasswordPolicyError(password);
    if (passwordError !== null) {
      throw new ApplicationError(passwordError);
    }

    const emailLimit = await checkRateLimit("register", email);
    if (!emailLimit.allowed) return rateLimitResponse(emailLimit.resetMs);

    const existingByEmail = await createAdminApplicationScope().repositories.users.getByEmail(email);
    if (existingByEmail !== null) {
      throw new ApplicationError("Ya existe un usuario registrado con ese correo.");
    }

    const insforge = createInsForgeServerClient();
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name: fullName,
    });

    if (error !== null || data === null) {
      throw new ApplicationError(error?.message ?? "No se pudo crear la cuenta.");
    }

    const scope = createAdminApplicationScope();
    const newUser = User.registerPublic(
      PersonName.create(fullName),
      EmailAddress.create(email),
      `insforge:email:${data.user?.id ?? email}`,
      scope.clock.utcNow,
    );
    await scope.repositories.users.add(newUser);
    await scope.repositories.unitOfWork.saveChanges();

    return created({ userId: newUser.id, email, requiresRedirectToLogin: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

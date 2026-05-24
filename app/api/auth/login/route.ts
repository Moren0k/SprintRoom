import { createInsForgeServerClient } from "@/src/lib/insforge-server";
import { setInsForgeSessionCookies } from "@/src/lib/insforge-cookies";
import { createApplicationScope } from "@/src/server/application-scope";
import { User } from "@/src/domain/aggregates/user";
import { EmailAddress } from "@/src/domain/value-objects/email-address";
import { PersonName } from "@/src/domain/value-objects/person-name";
import { ApplicationError } from "@/src/application";
import { handleRouteError, ok, readJsonObject } from "@/src/server/http";
import { requireString } from "@/src/server/validation";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const email = requireString(body, "email").trim();
    const password = requireString(body, "password");

    const insforge = createInsForgeServerClient();
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });

    if (error !== null || data === null) {
      throw new ApplicationError("Credenciales invalidas.");
    }

    const scope = createApplicationScope();
    const existingUser = await scope.repositories.users.getByEmail(email);

    if (existingUser === null) {
      const newUser = User.registerPublic(
        PersonName.create(data.user?.profile?.name ?? email),
        EmailAddress.create(email),
        `insforge:email:${data.user.id}`,
        scope.clock.utcNow,
      );
      await scope.repositories.users.add(newUser);
      await scope.repositories.unitOfWork.saveChanges();
    }

    const response = ok({ userId: data.user.id, email, requiresRedirectToLogin: false });
    setInsForgeSessionCookies(
      (name, value, options) => {
        response.cookies.set(name, value, options);
      },
      data.accessToken,
      readRefreshToken(data),
    );
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}

function readRefreshToken(data: unknown): string | null {
  if (data === null || typeof data !== "object" || !("refreshToken" in data)) {
    return null;
  }
  const refreshToken = data.refreshToken;
  return typeof refreshToken === "string" && refreshToken.length > 0 ? refreshToken : null;
}

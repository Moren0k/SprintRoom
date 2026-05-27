import { createInsForgeServerClient } from "@/src/lib/insforge-server";
import { ApplicationError } from "@/src/application";
import { readPasswordPolicyError } from "@/src/lib/auth/password-policy";
import { handleRouteError, ok, readJsonObject } from "@/src/server/http";
import { assertSameOriginMutation } from "@/src/server/security";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/src/server/rate-limit";
import { requireString } from "@/src/server/validation";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const ipLimit = await checkRateLimit("recovery", getClientIp(request));
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetMs);

    const body = await readJsonObject(request);
    const email = requireString(body, "email").trim();
    const emailLimit = await checkRateLimit("recovery", email.toLowerCase());
    if (!emailLimit.allowed) return rateLimitResponse(emailLimit.resetMs);

    const code = requireString(body, "code").trim();
    const newPassword = requireString(body, "newPassword");
    const passwordError = readPasswordPolicyError(newPassword);
    if (passwordError !== null) {
      throw new ApplicationError(passwordError);
    }

    const insforge = createInsForgeServerClient();
    const { data, error: exchangeError } = await insforge.auth.exchangeResetPasswordToken({
      email,
      code,
    });
    if (exchangeError !== null || data?.token === undefined) {
      throw new ApplicationError(exchangeError?.message ?? "No fue posible validar el codigo de recuperacion.");
    }

    const { error } = await insforge.auth.resetPassword({
      newPassword,
      otp: data.token,
    });
    if (error !== null) {
      throw new ApplicationError(error.message ?? "No fue posible restablecer la contrasena.");
    }
    return ok({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

import { createInsForgeServerClient } from "@/src/lib/insforge-server";
import { ApplicationError } from "@/src/application";
import { created, handleRouteError, readJsonObject } from "@/src/server/http";
import { requireString } from "@/src/server/validation";
import { assertSameOriginMutation } from "@/src/server/security";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/src/server/rate-limit";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const ipLimit = await checkRateLimit("recovery", getClientIp(request));
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetMs);

    const body = await readJsonObject(request);
    const email = requireString(body, "email").trim();
    const emailLimit = await checkRateLimit("recovery", email.toLowerCase());
    if (!emailLimit.allowed) return rateLimitResponse(emailLimit.resetMs);

    const otp = requireString(body, "otp").trim();
    const insforge = createInsForgeServerClient();
    const { error } = await insforge.auth.verifyEmail({ email, otp });
    if (error !== null) {
      throw new ApplicationError(error.message ?? "No fue posible verificar el correo.");
    }
    return created({ verified: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

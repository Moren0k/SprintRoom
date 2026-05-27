import { createInsForgeExpiredCookieHeaders } from "@/src/lib/insforge-cookies";
import { handleRouteError, noContent } from "@/src/server/http";
import { assertAuthenticatedMutation } from "@/src/server/security";

export async function POST(request: Request): Promise<Response> {
  try {
    assertAuthenticatedMutation(request);
    const response = noContent();
    for (const cookieHeader of createInsForgeExpiredCookieHeaders()) {
      response.headers.append("Set-Cookie", cookieHeader);
    }
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}

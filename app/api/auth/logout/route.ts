import { createInsForgeExpiredCookieHeaders } from "@/src/lib/insforge-cookies";
import { noContent } from "@/src/server/http";

export async function POST(): Promise<Response> {
  const response = noContent();
  for (const cookieHeader of createInsForgeExpiredCookieHeaders()) {
    response.headers.append("Set-Cookie", cookieHeader);
  }
  return response;
}

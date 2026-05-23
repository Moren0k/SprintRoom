import { createExpiredSessionCookieValue } from "../../../../src/lib/auth";
import { noContent } from "../../../../src/server/http";

export async function POST(): Promise<Response> {
  const response = noContent();
  response.headers.set("Set-Cookie", createExpiredSessionCookieValue());
  return response;
}

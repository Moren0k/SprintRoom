import { createClient } from "@insforge/sdk";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getBrowserInsForgeClient(): ReturnType<typeof createClient> {
  if (browserClient === null) {
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? "";
    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? "";
    browserClient = createClient({ baseUrl, anonKey });
  }
  return browserClient;
}

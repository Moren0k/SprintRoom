import { createClient } from "@insforge/sdk";

export function createInsForgeServerClient(accessToken?: string) {
  const baseUrl = process.env.INSFORGE_URL;
  const anonKey = process.env.INSFORGE_ANON_KEY;
  if (baseUrl === undefined || anonKey === undefined) {
    throw new Error(
      "Falta configurar InsForge. Define INSFORGE_URL e INSFORGE_ANON_KEY.",
    );
  }
  return createClient({
    baseUrl,
    anonKey,
    isServerMode: true,
    edgeFunctionToken: accessToken,
  });
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createInsForgeServerClient } from "../insforge-server";

export async function initiateOAuth(provider: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (baseUrl === undefined) {
    throw new Error("Falta configurar NEXT_PUBLIC_APP_URL.");
  }

  const insforge = createInsForgeServerClient();
  const { data, error } = await insforge.auth.signInWithOAuth({
    provider,
    redirectTo: new URL("/api/auth/callback", baseUrl).toString(),
    skipBrowserRedirect: true,
  });

  if (error !== null || data?.url === undefined) {
    throw new Error(error?.message ?? "No se pudo iniciar sesion con el proveedor.");
  }

  const cookieStore = await cookies();
  if (data.codeVerifier !== undefined) {
    cookieStore.set("insforge_code_verifier", data.codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  redirect(data.url);
}

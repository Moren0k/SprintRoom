"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type { AuthResult } from "@/src/frontend/types";
import { Button, Card, ErrorBanner, Field, SuccessBanner, TextInput } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    window.setTimeout(() => {
      if (emailParam !== null) {
        setEmail(emailParam);
      }
      if (params.get("registered") === "1") {
        setNotice("Cuenta creada. Inicia sesion para continuar.");
      }
    }, 0);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || !password) {
      setError("Ingresa correo y contrasena.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest<AuthResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      router.replace(readSafeNextUrl() ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Inicia sesion"
      description="Accede a tus proyectos, historias de usuario y tareas."
      footer={
        <span>
          No tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-[var(--foreground)]">
            Registrate
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <SuccessBanner message={notice} />
        <ErrorBanner message={error} />
        <Field label="Correo electronico">
          <TextInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="equipo@sprintroom.app"
          />
        </Field>
        <Field label="Contrasena">
          <TextInput
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tu contrasena"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </AuthFrame>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setError("Completa el nombre, correo y una contrasena de minimo 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest<AuthResult>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });
      router.replace(
        `/login?registered=1&email=${encodeURIComponent(email.trim())}`,
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Crea tu cuenta"
      description="El registro publico crea una cuenta y luego te envia al inicio de sesion."
      footer={
        <span>
          Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-[var(--foreground)]">
            Inicia sesion
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <ErrorBanner message={error} />
        <Field label="Nombre completo">
          <TextInput
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ana Martinez"
          />
        </Field>
        <Field label="Correo electronico">
          <TextInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ana@empresa.com"
          />
        </Field>
        <Field label="Contrasena" hint="Minimo 8 caracteres.">
          <TextInput
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Crea una contrasena segura"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>
    </AuthFrame>
  );
}

function AuthFrame({
  title,
  description,
  footer,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly footer: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="orb-float-1 absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-[var(--orb-1)] blur-[120px]" />
        <div className="orb-float-2 absolute bottom-0 right-1/4 h-[360px] w-[360px] rounded-full bg-[var(--orb-2)] blur-[100px]" />
      </div>
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mx-auto mb-8 block text-center text-2xl font-semibold tracking-tight text-[var(--foreground)]"
        >
          SprintRoom
        </Link>
        <Card>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {description}
            </p>
          </div>
          {children}
          <p className="mt-6 text-center text-sm text-[var(--muted)]">{footer}</p>
        </Card>
      </div>
    </main>
  );
}

function readSafeNextUrl(): string | null {
  const next = new URLSearchParams(window.location.search).get("next");
  if (next === null || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  return next;
}

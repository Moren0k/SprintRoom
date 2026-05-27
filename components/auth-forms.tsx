"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type { AuthResult } from "@/src/frontend/types";
import { Button, Card, ErrorBanner, Field, SuccessBanner, TextInput } from "./ui";
import { initiateOAuth } from "@/src/lib/auth/oauth-actions";
import { PASSWORD_POLICY_HINT, readPasswordPolicyError } from "@/src/lib/auth/password-policy";
import { readSafeAppPath } from "@/src/lib/auth/safe-redirect";

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
      if (params.get("verified") === "1") {
        setNotice("Correo verificado. Ya puedes iniciar sesion.");
      }
      if (params.get("reset") === "1") {
        setNotice("Contrasena actualizada. Inicia sesion con la nueva credencial.");
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

  async function signInWithGoogle() {
    setError("");
    setNotice("");
    try {
      await initiateOAuth("google");
    } catch (err) {
      setError(getErrorMessage(err));
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
        <Button type="button" variant="secondary" className="w-full" disabled={loading} onClick={signInWithGoogle}>
          Continuar con Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--hairline)]" />
          <span>o ingresa con correo</span>
          <span className="h-px flex-1 bg-[var(--hairline)]" />
        </div>
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
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="font-medium text-[var(--foreground)] underline underline-offset-2">
            Olvide mi contrasena
          </Link>
        </div>
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
    const passwordError = readPasswordPolicyError(password);
    if (!fullName.trim() || !email.trim() || passwordError !== null) {
      setError(passwordError ?? "Completa el nombre y el correo.");
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
        `/verify-email?email=${encodeURIComponent(email.trim())}`,
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function registerWithGoogle() {
    setError("");
    try {
      await initiateOAuth("google");
    } catch (err) {
      setError(getErrorMessage(err));
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
        <Button type="button" variant="secondary" className="w-full" disabled={loading} onClick={registerWithGoogle}>
          Registrarme con Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--hairline)]" />
          <span>o crea una cuenta con correo</span>
          <span className="h-px flex-1 bg-[var(--hairline)]" />
        </div>
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
        <Field label="Contrasena" hint={PASSWORD_POLICY_HINT}>
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

export function VerifyEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
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
    }, 0);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || otp.trim().length !== 6) {
      setError("Ingresa el correo y el codigo de 6 digitos.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest<{ verified: true }>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      router.replace(`/login?verified=1&email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Ingresa tu correo para reenviar el codigo.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest<{ success: true }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setNotice("Te enviamos un nuevo codigo de verificacion.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Verifica tu correo"
      description="Te enviamos un codigo de 6 digitos. Ingresalo para activar tu cuenta."
      footer={<Link href="/login" className="font-medium text-[var(--foreground)]">Volver al inicio de sesion</Link>}
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
            placeholder="ana@empresa.com"
          />
        </Field>
        <Field label="Codigo de verificacion" hint="Revisa tu correo y copia el codigo de 6 digitos.">
          <TextInput
            inputMode="numeric"
            pattern="[0-9]{6}"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Verificando..." : "Verificar correo"}
        </Button>
        <Button type="button" variant="secondary" className="w-full" disabled={loading} onClick={resendCode}>
          Reenviar codigo
        </Button>
      </form>
    </AuthFrame>
  );
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Ingresa tu correo.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest<{ success: true }>("/api/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setStep("reset");
      setNotice("Te enviamos un codigo para restablecer tu contrasena.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const passwordError = readPasswordPolicyError(newPassword);
    if (!email.trim() || code.trim().length !== 6 || passwordError !== null) {
      setError(passwordError ?? "Ingresa el correo y el codigo de 6 digitos.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest<{ success: true }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), code: code.trim(), newPassword }),
      });
      router.replace(`/login?reset=1&email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      title="Recupera tu acceso"
      description="Solicita un codigo y define una nueva contrasena segura."
      footer={<Link href="/login" className="font-medium text-[var(--foreground)]">Volver al inicio de sesion</Link>}
    >
      <form onSubmit={step === "request" ? requestReset : resetPassword} className="space-y-4">
        <SuccessBanner message={notice} />
        <ErrorBanner message={error} />
        <Field label="Correo electronico">
          <TextInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ana@empresa.com"
          />
        </Field>
        {step === "reset" && (
          <>
            <Field label="Codigo de recuperacion">
              <TextInput
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
              />
            </Field>
            <Field label="Nueva contrasena" hint={PASSWORD_POLICY_HINT}>
              <TextInput
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Nueva contrasena segura"
              />
            </Field>
          </>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Procesando..." : step === "request" ? "Enviar codigo" : "Restablecer contrasena"}
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
  const safePath = readSafeAppPath(next, "");
  if (safePath.length === 0) {
    return null;
  }
  return safePath;
}

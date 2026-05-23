"use client";

import { useState, type FormEvent } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import { useSession } from "@/src/frontend/session-context";
import type { SystemRole, UserProfile } from "@/src/frontend/types";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  PageHeader,
  Select,
  SuccessBanner,
  TextInput,
} from "./ui";

export default function AccountClient() {
  const { user, refresh } = useSession();
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRole, setAdminRole] = useState<SystemRole>("Member");
  const [createdUserId, setCreatedUserId] = useState("");

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!fullName.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest<UserProfile>("/api/account", {
        method: "PATCH",
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim() }),
      });
      await refresh();
      setNotice("Perfil actualizado.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function createAdministrativeUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setCreatedUserId("");
    if (!adminName.trim() || !adminEmail.trim() || adminPassword.length < 8) {
      setError("Completa nombre, correo y una contrasena de minimo 8 caracteres.");
      return;
    }
    setBusy(true);
    try {
      const created = await apiRequest<{ userId: string; fullName: string; email: string }>(
        "/api/admin/users",
        {
          method: "POST",
          body: JSON.stringify({
            fullName: adminName.trim(),
            email: adminEmail.trim(),
            password: adminPassword,
            systemRole: adminRole,
          }),
        },
      );
      setCreatedUserId(created.userId);
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminRole("Member");
      setNotice("Usuario administrativo creado.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cuenta"
        title="Perfil y sesion"
        description="Datos del usuario autenticado resueltos por `/api/account`."
      />
      <ErrorBanner message={error} />
      <SuccessBanner message={notice} />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Mi perfil</h2>
          <form onSubmit={updateProfile} className="mt-5 space-y-4">
            <Field label="Nombre completo">
              <TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </Field>
            <Field label="Correo electronico">
              <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Button type="submit" disabled={busy}>Guardar perfil</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Datos de sesion</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <InfoRow label="Usuario ID" value={user.userId} />
            <InfoRow label="Rol global" value={user.systemRole} />
            <InfoRow label="Origen" value={user.origin} />
          </dl>
          <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
            Comparte el Usuario ID con propietarios de proyecto para que puedan agregarte como miembro. No existe endpoint de busqueda de usuarios por correo.
          </p>
        </Card>
      </section>

      {user.systemRole === "Administrator" && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Alta administrativa</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Flujo conectado a `POST /api/admin/users`. Disponible solo para administradores.
          </p>
          <form onSubmit={createAdministrativeUser} className="mt-5 grid gap-4 lg:grid-cols-2">
            <Field label="Nombre completo">
              <TextInput value={adminName} onChange={(event) => setAdminName(event.target.value)} />
            </Field>
            <Field label="Correo electronico">
              <TextInput type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} />
            </Field>
            <Field label="Contrasena">
              <TextInput type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
            </Field>
            <Field label="Rol global">
              <Select value={adminRole} onChange={(event) => setAdminRole(event.target.value as SystemRole)}>
                <option value="Member">Member</option>
                <option value="Administrator">Administrator</option>
              </Select>
            </Field>
            <div className="lg:col-span-2">
              <Button type="submit" disabled={busy}>Crear usuario</Button>
            </div>
          </form>
          {createdUserId.length > 0 && (
            <p className="mt-4 rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
              Usuario creado. UUID para agregar a proyectos: <span className="font-medium text-[var(--foreground)]">{createdUserId}</span>
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-all font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

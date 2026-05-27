"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type {
  McpProjectKeyCreated,
  McpProjectKeySummary,
  ProjectActivityEvent,
  ProjectDetail,
  ProjectMemberDetail,
  ProjectRole,
  UserStoryDetail,
  UserStorySummary,
} from "@/src/frontend/types";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  PageHeader,
  Pill,
  ProgressBar,
  Select,
  SuccessBanner,
  TextArea,
  TextInput,
} from "./ui";
import ProjectActivityClient from "./project-activity-client";

const PROJECT_ROLES: ProjectRole[] = ["Viewer", "Contributor", "Maintainer", "Owner"];

interface ProjectBundle {
  readonly project: ProjectDetail;
  readonly stories: UserStorySummary[];
}

type DeleteTarget =
  | { readonly kind: "project"; readonly name: string; readonly endpoint: string }
  | { readonly kind: "story"; readonly name: string; readonly endpoint: string }
  | { readonly kind: "key"; readonly name: string; readonly endpoint: string };

export default function ProjectDetailClient({
  projectId,
}: {
  readonly projectId: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [stories, setStories] = useState<UserStorySummary[]>([]);
  const [memberDetail, setMemberDetail] = useState<ProjectMemberDetail | null>(null);
  const [mcpKeys, setMcpKeys] = useState<McpProjectKeySummary[]>([]);
  const [newMcpKey, setNewMcpKey] = useState<McpProjectKeyCreated | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReference, setEditReference] = useState("");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<ProjectRole>("Contributor");
  const [storyTitle, setStoryTitle] = useState("");
  const [storyDescription, setStoryDescription] = useState("");
  const [mcpDescription, setMcpDescription] = useState("Agente IA del proyecto");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [confirmationName, setConfirmationName] = useState("");
  const [destructiveConfirmation, setDestructiveConfirmation] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [bundle, keys] = await Promise.all([
          fetchProjectBundle(projectId),
          fetchMcpKeys(projectId),
        ]);
        if (cancelled) return;
        applyBundle(bundle);
        setMcpKeys(keys);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function applyBundle(bundle: ProjectBundle) {
    setProject(bundle.project);
    setStories(bundle.stories);
    setEditName(bundle.project.name);
    setEditDescription(bundle.project.description);
    setEditReference(bundle.project.externalReference);
  }

  async function reload() {
    const [bundle, keys] = await Promise.all([
      fetchProjectBundle(projectId),
      fetchMcpKeys(projectId),
    ]);
    applyBundle(bundle);
    setMcpKeys(keys);
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runMutation("Proyecto actualizado.", async () => {
      const updated = await apiRequest<ProjectDetail>(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          externalReference: editReference.trim(),
        }),
      });
      setProject(updated);
    });
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberUserId.trim()) {
      setError("Ingresa el UUID del usuario a agregar.");
      return;
    }
    await runMutation("Miembro agregado.", async () => {
      await apiRequest(`/api/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({
          userId: memberUserId.trim(),
          projectRole: memberRole,
        }),
      });
      setMemberUserId("");
      await reload();
    });
  }

  async function removeMember(userId: string) {
    if (!window.confirm("Retirar este miembro del proyecto?")) return;
    await runMutation("Miembro retirado.", async () => {
      await apiRequest<void>(`/api/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
      });
      if (memberDetail?.userId === userId) setMemberDetail(null);
      await reload();
    });
  }

  async function loadMemberDetail(userId: string) {
    await runMutation("", async () => {
      const detail = await apiRequest<ProjectMemberDetail>(
        `/api/projects/${projectId}/members/${userId}`,
      );
      setMemberDetail(detail);
    });
  }

  async function createStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storyTitle.trim()) {
      setError("El titulo de la historia es obligatorio.");
      return;
    }
    await runMutation("Historia creada.", async () => {
      const story = await apiRequest<UserStoryDetail>(
        `/api/projects/${projectId}/user-stories`,
        {
          method: "POST",
          body: JSON.stringify({
            title: storyTitle.trim(),
            description: storyDescription.trim(),
          }),
        },
      );
      setStoryTitle("");
      setStoryDescription("");
      await reload();
      router.push(`/projects/${projectId}/stories/${story.userStoryId}`);
    });
  }

  async function createMcpKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mcpDescription.trim()) {
      setError("Ingresa una descripcion para la clave MCP.");
      return;
    }
    await runMutation("Clave MCP generada. Copiala ahora; no volvera a mostrarse.", async () => {
      const key = await apiRequest<McpProjectKeyCreated>(`/api/projects/${projectId}/mcp-keys`, {
        method: "POST",
        body: JSON.stringify({ description: mcpDescription.trim() }),
      });
      setNewMcpKey(key);
      setMcpKeys(await fetchMcpKeys(projectId));
    });
  }

  async function deactivateMcpKey(keyId: string) {
    await runMutation("Clave MCP desactivada.", async () => {
      await apiRequest<void>(`/api/projects/${projectId}/mcp-keys/${keyId}`, {
        method: "PATCH",
      });
      setMcpKeys(await fetchMcpKeys(projectId));
    });
  }

  function startDeleteKey(keyId: string, description: string) {
    setDeleteTarget({
      kind: "key",
      name: description,
      endpoint: `/api/projects/${projectId}/mcp-keys/${keyId}`,
    });
  }

  async function copyMcpPrompt(includeKey: boolean) {
    const prompt = buildMcpPrompt({
      projectName: project?.name ?? "este proyecto",
      projectKey: includeKey ? newMcpKey?.rawKey : undefined,
    });
    try {
      await navigator.clipboard.writeText(prompt);
      setNotice("Prompt MCP copiado.");
      setError("");
    } catch {
      setError("No fue posible copiar el prompt automaticamente.");
    }
  }

  async function confirmDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteTarget === null) return;
    await runMutation("Elemento eliminado.", async () => {
      await apiRequest<void>(deleteTarget.endpoint, {
        method: "DELETE",
        body: JSON.stringify({
          confirmationName: confirmationName.trim(),
          ...(deleteTarget.kind === "project" || deleteTarget.kind === "story"
            ? { destructiveConfirmation: destructiveConfirmation.trim() }
            : {}),
        }),
      });
      if (deleteTarget.kind === "project") {
        router.replace("/projects");
        return;
      }
      setDeleteTarget(null);
      setConfirmationName("");
      setDestructiveConfirmation("");
      await reload();
    });
  }

  async function runMutation(successMessage: string, action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (successMessage.length > 0) setNotice(successMessage);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock label="Cargando proyecto..." />;

  if (project === null) {
    return (
      <EmptyState
        title="Proyecto no disponible"
        description={error || "No fue posible cargar el detalle del proyecto."}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Proyecto"
        title={project.name}
        description={project.description || "Vista de historias de usuario del proyecto."}
        actions={
          <Button
            variant="danger"
            onClick={() =>
              setDeleteTarget({
                kind: "project",
                name: project.name,
                endpoint: `/api/projects/${project.projectId}`,
              })
            }
          >
            Eliminar proyecto
          </Button>
        }
      />
      <ErrorBanner message={error} />
      <SuccessBanner message={notice} />

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-5 md:col-span-2">
          <p className="text-sm text-[var(--muted)]">Avance del proyecto</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
            {Math.round(project.progress)}%
          </p>
          <div className="mt-4">
            <ProgressBar value={project.progress} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Historias</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
            {stories.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Tareas</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
            {project.taskCount}
          </p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Documentacion</h2>
            <form onSubmit={saveProject} className="mt-5 space-y-4">
              <Field label="Nombre">
                <TextInput value={editName} onChange={(event) => setEditName(event.target.value)} />
              </Field>
              <Field label="Descripcion">
                <TextArea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </Field>
              <Field label="Referencia externa">
                <TextInput
                  value={editReference}
                  onChange={(event) => setEditReference(event.target.value)}
                />
              </Field>
              <Button type="submit" disabled={busy}>
                Guardar cambios
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Miembros</h2>
            <div className="mt-4 space-y-3">
              {project.members.map((member) => (
                <div
                  key={member.userId}
                  className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{member.fullName}</p>
                      <p className="text-sm text-[var(--muted)]">{member.email}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{member.userId}</p>
                    </div>
                    <Pill>{member.projectRole}</Pill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => loadMemberDetail(member.userId)} disabled={busy}>
                      Ver carga
                    </Button>
                    <Button variant="ghost" onClick={() => removeMember(member.userId)} disabled={busy}>
                      Retirar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={addMember} className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <TextInput
                value={memberUserId}
                onChange={(event) => setMemberUserId(event.target.value)}
                placeholder="UUID del usuario"
              />
              <Select value={memberRole} onChange={(event) => setMemberRole(event.target.value as ProjectRole)}>
                {PROJECT_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </Select>
              <Button type="submit" disabled={busy}>Agregar</Button>
            </form>
          </Card>

          {memberDetail !== null && (
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Carga de {memberDetail.fullName}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{memberDetail.email}</p>
                </div>
                <Button variant="ghost" onClick={() => setMemberDetail(null)}>Cerrar</Button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Asignadas" value={memberDetail.totalAssignedTasks} />
                <MiniMetric label="Pendientes" value={memberDetail.pendingAssignedTasks} />
                <MiniMetric label="Completadas" value={memberDetail.completedAssignedTasks} />
              </div>
            </Card>
          )}

          <McpIntegrationCard
            projectId={projectId}
            busy={busy}
            keys={mcpKeys}
            newKey={newMcpKey}
            description={mcpDescription}
            onDescriptionChange={setMcpDescription}
            onCreate={createMcpKey}
            onDeactivate={deactivateMcpKey}
            onDelete={startDeleteKey}
            onCopyPrompt={copyMcpPrompt}
          />

          <ProjectActivityClient projectId={projectId} />
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Historias de usuario</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Selecciona una historia para abrir su tablero Kanban. Esta vista no muestra tareas directamente.
          </p>
          <form onSubmit={createStory} className="mt-5 space-y-4">
            <Field label="Nueva historia">
              <TextInput
                value={storyTitle}
                onChange={(event) => setStoryTitle(event.target.value)}
                placeholder="Como usuario quiero..."
              />
            </Field>
            <Field label="Descripcion">
              <TextArea
                value={storyDescription}
                onChange={(event) => setStoryDescription(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy}>Crear historia</Button>
          </form>

          <div className="mt-6 space-y-4">
            {stories.length === 0 ? (
              <EmptyState
                title="No hay historias"
                description="Crea la primera historia para entrar luego a su tablero de tareas."
              />
            ) : (
              stories.map((story) => (
                <div key={story.userStoryId} className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--background)]">
                  <Link
                    href={`/projects/${projectId}/stories/${story.userStoryId}`}
                    className="block p-4 outline-none transition hover:bg-[var(--glass)] focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/25"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-6 text-[var(--foreground)]">{story.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{story.description || "Sin descripcion."}</p>
                      </div>
                      <span className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--muted)]">
                        Abrir tablero
                      </span>
                    </div>
                    <div className="mt-4">
                      <ProgressBar value={story.progress} />
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {Math.round(story.progress)}% de avance
                      </p>
                    </div>
                  </Link>
                  <div className="border-t border-[var(--hairline)] px-4 py-3">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "story",
                          name: story.title,
                          endpoint: `/api/user-stories/${story.userStoryId}`,
                        })
                      }
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Eliminar {deleteLabel(deleteTarget.kind)}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Escribe exactamente <span className="font-semibold text-[var(--foreground)]">{deleteTarget.name}</span> para confirmar.
            </p>
            {(deleteTarget.kind === "project" || deleteTarget.kind === "story") && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-[var(--muted)]">
                Esta accion elimina tambien todas las historias y tareas relacionadas. Para la segunda confirmacion escribe exactamente <span className="font-semibold text-[var(--foreground)]">ELIMINAR TODO</span>.
              </p>
            )}
            <form onSubmit={confirmDelete} className="mt-5 space-y-4">
              <Field label="Nombre exacto">
                <TextInput value={confirmationName} onChange={(event) => setConfirmationName(event.target.value)} />
              </Field>
              {(deleteTarget.kind === "project" || deleteTarget.kind === "story") && (
                <Field label="Segunda confirmacion">
                  <TextInput
                    value={destructiveConfirmation}
                    onChange={(event) => setDestructiveConfirmation(event.target.value)}
                  />
                </Field>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => {
                  setDeleteTarget(null);
                  setConfirmationName("");
                  setDestructiveConfirmation("");
                }}>Cancelar</Button>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={
                    busy ||
                    confirmationName !== deleteTarget.name ||
                    ((deleteTarget.kind === "project" || deleteTarget.kind === "story") && destructiveConfirmation !== "ELIMINAR TODO")
                  }
                >Eliminar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

async function fetchProjectBundle(projectId: string): Promise<ProjectBundle> {
  const [project, stories] = await Promise.all([
    apiRequest<ProjectDetail>(`/api/projects/${projectId}`),
    apiRequest<UserStorySummary[]>(`/api/projects/${projectId}/user-stories`),
  ]);
  return { project, stories };
}

async function fetchMcpKeys(projectId: string): Promise<McpProjectKeySummary[]> {
  return apiRequest<McpProjectKeySummary[]>(`/api/projects/${projectId}/mcp-keys`);
}

function McpIntegrationCard({
  projectId,
  busy,
  keys,
  newKey,
  description,
  onDescriptionChange,
  onCreate,
  onDeactivate,
  onDelete,
  onCopyPrompt,
}: {
  readonly projectId: string;
  readonly busy: boolean;
  readonly keys: McpProjectKeySummary[];
  readonly newKey: McpProjectKeyCreated | null;
  readonly description: string;
  readonly onDescriptionChange: (value: string) => void;
  readonly onCreate: (event: FormEvent<HTMLFormElement>) => void;
  readonly onDeactivate: (keyId: string) => void;
  readonly onDelete: (keyId: string, description: string) => void;
  readonly onCopyPrompt: (includeKey: boolean) => void;
}) {
  const origin = typeof window === "undefined" ? "https://tu-dominio" : window.location.origin;

  const activeKeys = keys.filter((k) => k.isActive);
  const hasActiveKeys = activeKeys.length > 0;

  const [latestActivity, setLatestActivity] = useState<ProjectActivityEvent | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setActivityLoading(true);
      try {
        const data = await apiRequest<ReadonlyArray<ProjectActivityEvent>>(
          `/api/projects/${projectId}/activity?limit=1`,
        );
        if (!cancelled && data.length > 0) setLatestActivity(data[0]);
      } catch {
        /* activity is best-effort */
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Integracion con IA (MCP)</h2>
        <Pill className={hasActiveKeys ? "bg-emerald-500/10 text-emerald-600" : "opacity-60"}>
          {hasActiveKeys ? `${activeKeys.length} activa(s)` : "Sin clave"}
        </Pill>
      </div>

      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        Conecta agentes como OpenCode, Codex, Claude Code o Claude Desktop al backlog de este proyecto usando el protocolo MCP.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--hairline)] bg-[var(--background)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Endpoint</p>
          <p className="mt-0.5 truncate font-mono text-xs text-[var(--foreground)]">{origin}/api/mcp</p>
          <CopyButton value={`${origin}/api/mcp`} label="Copiar endpoint" />
        </div>
        <div className="rounded-lg border border-[var(--hairline)] bg-[var(--background)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            {activityLoading ? "Cargando actividad..." : latestActivity !== null ? "Ultima actividad" : "Sin actividad"}
          </p>
          {latestActivity !== null ? (
            <>
              <p className="mt-0.5 truncate text-xs text-[var(--foreground)]">
                {inferDescription(latestActivity.action, latestActivity.entityType, latestActivity.entityId)}
              </p>
              <p className="text-[10px] text-[var(--muted)]">{timeAgo(latestActivity.occurredOnUtc)}</p>
            </>
          ) : (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {activityLoading ? "..." : "Aun no hay eventos"}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={() => onCopyPrompt(false)}>
          Copiar prompt de instalacion
        </Button>
        <CopyButton value={`${origin}/api/mcp`} label="Copiar endpoint" />
      </div>

      <form onSubmit={onCreate} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <TextInput
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Descripcion de la clave"
        />
        <Button type="submit" disabled={busy || !description.trim()}>
          Generar PROJECT_KEY
        </Button>
      </form>

      {newKey !== null && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Clave generada. Copiala ahora.</p>
            <code className="mt-3 block break-all rounded-lg border border-[var(--hairline)] bg-[var(--background)] p-3 text-xs text-[var(--foreground)]">
              {newKey.rawKey}
            </code>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => copyText(newKey.rawKey)}>
                Copiar clave
              </Button>
              <Button type="button" variant="secondary" onClick={() => onCopyPrompt(true)}>
                Copiar prompt con clave
              </Button>
              <Button type="button" variant="ghost" onClick={() => onCopyPrompt(false)}>
                Copiar prompt seguro
              </Button>
            </div>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)] hover:opacity-80">
              Configuraciones listas para copiar
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] mb-1">OpenCode (opencode.json)</p>
                <pre className="overflow-x-auto rounded-lg border border-[var(--hairline)] bg-[var(--background)] p-3 text-[11px] leading-5 text-[var(--foreground)]">
                  {buildOpenCodeConfig(origin)}
                </pre>
                <CopyButton value={buildOpenCodeConfig(origin)} label="Copiar config OpenCode" />
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--muted)] mb-1">Codex (.config.toml)</p>
                <p className="text-[10px] text-[var(--muted)] mb-1">Configura <code className="text-[var(--foreground)]">SPRINTROOM_PROJECT_KEY</code> como variable de entorno en tu perfil.</p>
                <pre className="overflow-x-auto rounded-lg border border-[var(--hairline)] bg-[var(--background)] p-3 text-[11px] leading-5 text-[var(--foreground)]">
                  {buildCodexConfigEnv(origin)}
                </pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton value={buildCodexConfigEnv(origin)} label="Copiar (env-var)" />
                  <Button type="button" variant="ghost" onClick={() => copyText(buildCodexConfigRaw(origin, newKey.rawKey))}>
                    Copiar con clave directa
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--muted)] mb-1">Claude Code</p>
                <p className="text-[10px] text-[var(--muted)] mb-1">Asegurate de tener <code className="text-[var(--foreground)]">SPRINTROOM_PROJECT_KEY</code> en tu sesion.</p>
                <pre className="overflow-x-auto rounded-lg border border-[var(--hairline)] bg-[var(--background)] p-3 text-[11px] leading-5 text-[var(--foreground)]">
                  {buildClaudeCodeCommandEnv(origin)}
                </pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton value={buildClaudeCodeCommandEnv(origin)} label="Copiar comando (env-var)" />
                  <Button type="button" variant="ghost" onClick={() => copyText(buildClaudeCodeCommandRaw(origin, newKey.rawKey))}>
                    Copiar con clave directa
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--muted)] mb-1">Claude Desktop (claude_desktop_config.json)</p>
                <p className="text-[10px] text-[var(--muted)] mb-1">Referencia <code className="text-[var(--foreground)]">{'${SPRINTROOM_PROJECT_KEY}'}</code> en el JSON. Claude Desktop la lee del entorno al iniciar.</p>
                <pre className="overflow-x-auto rounded-lg border border-[var(--hairline)] bg-[var(--background)] p-3 text-[11px] leading-5 text-[var(--foreground)]">
                  {buildClaudeDesktopConfigEnv(origin)}
                </pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton value={buildClaudeDesktopConfigEnv(origin)} label="Copiar (env-var)" />
                  <Button type="button" variant="ghost" onClick={() => copyText(buildClaudeDesktopConfigRaw(origin, newKey.rawKey))}>
                    Copiar con clave directa
                  </Button>
                </div>
              </div>

              <p className="text-xs text-[var(--muted)]">
                <strong>Advertencia de seguridad:</strong> Nunca compartas la PROJECT_KEY en chats, commits o documentacion.
                Si sospechas que fue comprometida, desactivala y genera una nueva desde esta seccion.
              </p>
            </div>
          </details>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {keys.length === 0 ? (
          <EmptyState title="No hay claves MCP" description="Genera una clave para conectar un agente IA a este proyecto." />
        ) : (
          keys.map((key) => (
            <div key={key.id} className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{key.description}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Creada {formatDate(key.createdOnUtc)}</p>
                </div>
                <Pill className={key.isActive ? "" : "opacity-60"}>
                  {key.isActive ? "Activa" : "Inactiva"}
                </Pill>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {key.isActive && (
                  <Button type="button" variant="ghost" onClick={() => onDeactivate(key.id)} disabled={busy}>
                    Desactivar
                  </Button>
                )}
                <Button type="button" variant="danger" onClick={() => onDelete(key.id, key.description)} disabled={busy}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <details className="group mt-6">
        <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)] hover:opacity-80">
          Herramientas disponibles (18)
        </summary>
        <div className="mt-4 space-y-4">
          <ToolGroup
            label="Lectura"
            count={9}
            tools={READ_TOOLS}
          />
          <ToolGroup
            label="Escritura no destructiva"
            count={8}
            tools={WRITE_TOOLS}
          />
          <ToolGroup
            label="Skill / setup"
            count={1}
            tools={SKILL_TOOLS}
          />
        </div>
      </details>

      <details className="group mt-4">
        <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)] hover:opacity-80">
          Seguridad
        </summary>
        <div className="mt-3 space-y-2 text-xs text-[var(--muted)]">
          <p>
            La PROJECT_KEY otorga acceso de lectura y escritura <strong>solo a este proyecto</strong>.
            Cada proyecto tiene su propia clave.
          </p>
          <p>
            No compartas la clave en chats, commits, documentacion ni notas de agente.
            Si sospechas que fue comprometida, desactivala desde esta seccion y genera una nueva.
          </p>
          <p>
            Las claves se almacenan como hash SHA-256. El valor plano solo se muestra una vez al crearla.
          </p>
        </div>
      </details>
    </Card>
  );
}

function CopyButton({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <Button type="button" variant="ghost" onClick={() => copyText(value)}>
      {label}
    </Button>
  );
}

function ToolGroup({
  label,
  count,
  tools,
}: {
  readonly label: string;
  readonly count: number;
  readonly tools: ReadonlyArray<{ readonly name: string; readonly description: string }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[var(--hairline)] bg-[var(--background)] p-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-xs font-semibold text-[var(--foreground)]">
          {label} ({count})
        </span>
        <span className="text-[10px] text-[var(--muted)]">{open ? "ocultar" : "ver"}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {tools.map((t) => (
            <li key={t.name} className="flex flex-col">
              <code className="text-xs text-[var(--foreground)]">{t.name}</code>
              <span className="text-[10px] text-[var(--muted)]">{t.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const READ_TOOLS: ReadonlyArray<{ readonly name: string; readonly description: string }> = [
  { name: "get_project_backlog", description: "Proyecto, historias y tareas agrupadas" },
  { name: "get_user_story_by_id", description: "Historia de usuario por ID con tareas" },
  { name: "get_task_by_id", description: "Tarea por ID con contexto" },
  { name: "search_tasks", description: "Buscar tareas por texto, estado o historia" },
  { name: "get_project_detail", description: "Detalle completo del proyecto" },
  { name: "list_project_members", description: "Miembros del proyecto con roles" },
  { name: "list_task_comments", description: "Comentarios de una tarea" },
  { name: "list_task_agent_notes", description: "Notas de agente de una tarea" },
  { name: "get_project_activity", description: "Actividad reciente del proyecto" },
];

const WRITE_TOOLS: ReadonlyArray<{ readonly name: string; readonly description: string }> = [
  { name: "update_task_status", description: "Actualizar estado Kanban de tarea" },
  { name: "bulk_update_tasks", description: "Actualizar estado de multiples tareas" },
  { name: "add_task_agent_note", description: "Registrar nota tecnica de agente" },
  { name: "create_task_comment", description: "Agregar comentario a tarea" },
  { name: "create_task", description: "Crear tarea en historia de usuario" },
  { name: "create_user_story", description: "Crear historia de usuario" },
  { name: "update_task_details", description: "Actualizar titulo/descripcion de tarea" },
  { name: "assign_task", description: "Reasignar usuarios a tarea" },
];

const SKILL_TOOLS: ReadonlyArray<{ readonly name: string; readonly description: string }> = [
  { name: "get_sprintroom_mcp_skill", description: "Devuelve skill oficial instalable" },
];

function buildOpenCodeConfig(origin: string): string {
  return `{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "sprintroom": {
      "type": "local",
      "command": ["npx", "-y", "@sprintroom/mcp"],
      "enabled": true,
      "environment": {
        "SPRINTROOM_API_URL": "${origin}",
        "SPRINTROOM_PROJECT_KEY": "{env:SPRINTROOM_PROJECT_KEY}"
      }
    }
  }
}`;
}

function buildCodexConfigEnv(origin: string): string {
  return `[mcp_servers.sprintroom]
command = "npx"
args = ["-y", "@sprintroom/mcp"]

[mcp_servers.sprintroom.env]
SPRINTROOM_API_URL = "${origin}"
SPRINTROOM_PROJECT_KEY = "\${env:SPRINTROOM_PROJECT_KEY}"`;
}

function buildCodexConfigRaw(origin: string, rawKey: string): string {
  return `[mcp_servers.sprintroom]
command = "npx"
args = ["-y", "@sprintroom/mcp"]

[mcp_servers.sprintroom.env]
SPRINTROOM_API_URL = "${origin}"
SPRINTROOM_PROJECT_KEY = "${rawKey}"`;
}

function buildClaudeCodeCommandEnv(origin: string): string {
  return `claude mcp add --transport stdio \\
  --env SPRINTROOM_API_URL=${origin} \\
  --env SPRINTROOM_PROJECT_KEY=$SPRINTROOM_PROJECT_KEY \\
  sprintroom \\
  -- npx -y @sprintroom/mcp`;
}

function buildClaudeCodeCommandRaw(origin: string, rawKey: string): string {
  return `claude mcp add --transport stdio \\
  --env SPRINTROOM_API_URL=${origin} \\
  --env SPRINTROOM_PROJECT_KEY=${rawKey} \\
  sprintroom \\
  -- npx -y @sprintroom/mcp`;
}

function buildClaudeDesktopConfigEnv(origin: string): string {
  return `{
  "mcpServers": {
    "sprintroom": {
      "command": "npx",
      "args": ["-y", "@sprintroom/mcp"],
      "env": {
        "SPRINTROOM_API_URL": "${origin}",
        "SPRINTROOM_PROJECT_KEY": "\${SPRINTROOM_PROJECT_KEY}"
      }
    }
  }
}`;
}

function buildClaudeDesktopConfigRaw(origin: string, rawKey: string): string {
  return `{
  "mcpServers": {
    "sprintroom": {
      "command": "npx",
      "args": ["-y", "@sprintroom/mcp"],
      "env": {
        "SPRINTROOM_API_URL": "${origin}",
        "SPRINTROOM_PROJECT_KEY": "${rawKey}"
      }
    }
  }
}`;
}

function MiniMetric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function deleteLabel(kind: DeleteTarget["kind"]): string {
  if (kind === "project") return "proyecto";
  if (kind === "story") return "historia";
  return "clave MCP";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function timeAgo(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "desconocido";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace instantes";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return formatDate(value);
}

function inferDescription(
  action: string,
  entityType: string,
  entityId: string,
): string {
  const shortId = entityId.length > 8 ? `${entityId.slice(0, 8)}...` : entityId;
  const friendly: Record<string, string> = {
    "mcp.update_task_status": "Actualizo estado de tarea",
    "mcp.bulk_update_tasks": "Actualizo tareas en bloque",
    "mcp.add_task_agent_note": "Registro nota de agente",
    "mcp.create_task_comment": "Agrego comentario a tarea",
    "mcp.create_task": "Creo una tarea",
    "mcp.create_user_story": "Creo una historia de usuario",
    "mcp.update_task_details": "Actualizo detalles de tarea",
    "mcp.assign_task": "Reasigno tarea",
  };
  const entityLabel: Record<string, string> = {
    sprint_task: "tarea",
    user_story: "historia",
    task_comment: "comentario",
    task_agent_note: "nota de agente",
    project: "proyecto",
  };
  if (friendly[action] !== undefined) return friendly[action];
  return `${action} (${entityLabel[entityType] ?? entityType} ${shortId})`;
}

function buildMcpPrompt({
  projectName,
  projectKey,
}: {
  readonly projectName: string;
  readonly projectKey?: string;
}): string {
  const origin = typeof window === "undefined" ? "https://tu-dominio" : window.location.origin;

  return `You are working on SprintRoom for project "${projectName}".

Target environment: OpenCode.

Configure SprintRoom MCP locally for the current repository only.

Command: npx -y @sprintroom/mcp
Environment:
  SPRINTROOM_API_URL: ${origin}
  SPRINTROOM_PROJECT_KEY: ${projectKey === undefined ? "<pega-aqui-la-project-key>" : projectKey}

Rules:
- Do not install anything globally.
- Do not write to system folders or user-global config folders.
- Validate the repository structure before writing files.
- Use only relative paths inside this repository.
- Configure MCP in the local OpenCode project config if needed.
- Call get_sprintroom_mcp_skill, then create or update .agents/skills/sprintroom-mcp/SKILL.md with the returned skill content.
- Do not create AGENTS.md inside .sprintroom.
- If AGENTS.md exists at repo root, update it idempotently to reference .agents/skills/sprintroom-mcp and when to use it.
- If repo-root AGENTS.md does not exist, do not create it.
- Use SKILL.md as the source of truth.
Do not invent tools, parameters, states, commands, endpoints, or behavior.
SprintRoom has no CLI, so do not create CLI instructions.

Finish by confirming:
MCP local configuration path.
Skill path: .agents/skills/sprintroom-mcp/SKILL.md.
Whether repo-root AGENTS.md was updated or did not exist.`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type {
  ProjectDetail,
  ProjectMemberDetail,
  ProjectRole,
  TaskDetail,
  TaskSummary,
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

const PROJECT_ROLES: ProjectRole[] = ["Viewer", "Contributor", "Maintainer", "Owner"];

interface ProjectBundle {
  readonly project: ProjectDetail;
  readonly stories: UserStorySummary[];
  readonly tasks: TaskSummary[];
}

type DeleteTarget =
  | { readonly kind: "project"; readonly name: string; readonly endpoint: string }
  | { readonly kind: "story"; readonly name: string; readonly endpoint: string }
  | { readonly kind: "task"; readonly name: string; readonly endpoint: string };

export default function ProjectDetailClient({
  projectId,
}: {
  readonly projectId: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [stories, setStories] = useState<UserStorySummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [memberDetail, setMemberDetail] = useState<ProjectMemberDetail | null>(null);
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
  const [taskStoryId, setTaskStoryId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [confirmationName, setConfirmationName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const bundle = await fetchProjectBundle(projectId);
        if (cancelled) return;
        applyBundle(bundle);
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
    setTasks(bundle.tasks);
    setEditName(bundle.project.name);
    setEditDescription(bundle.project.description);
    setEditReference(bundle.project.externalReference);
    setTaskStoryId((current) =>
      bundle.stories.some((story) => story.userStoryId === current)
        ? current
        : bundle.stories[0]?.userStoryId || "",
    );
  }

  async function reload() {
    const bundle = await fetchProjectBundle(projectId);
    applyBundle(bundle);
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
      setTaskStoryId(story.userStoryId);
      await reload();
    });
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskStoryId || !taskTitle.trim()) {
      setError("Selecciona una historia e ingresa el titulo de la tarea.");
      return;
    }
    await runMutation("Tarea creada.", async () => {
      const detail = await apiRequest<TaskDetail>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          userStoryId: taskStoryId,
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          assigneeIds: taskAssigneeIds,
        }),
      });
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssigneeIds([]);
      setSelectedTask(detail);
      await reload();
    });
  }

  async function openTask(taskId: string) {
    await runMutation("", async () => {
      const detail = await apiRequest<TaskDetail>(`/api/tasks/${taskId}`);
      setSelectedTask(detail);
      setCommentBody("");
    });
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedTask === null || !commentBody.trim()) return;
    const taskId = selectedTask.sprintTaskId;
    await runMutation("Comentario agregado.", async () => {
      await apiRequest(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      setCommentBody("");
      const detail = await apiRequest<TaskDetail>(`/api/tasks/${taskId}`);
      const projectTasks = await apiRequest<TaskSummary[]>(
        `/api/tasks?projectId=${projectId}`,
      );
      setSelectedTask(detail);
      setTasks(projectTasks);
    });
  }

  async function confirmDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteTarget === null) return;
    await runMutation("Elemento eliminado.", async () => {
      await apiRequest<void>(deleteTarget.endpoint, {
        method: "DELETE",
        body: JSON.stringify({ confirmationName: confirmationName.trim() }),
      });
      if (deleteTarget.kind === "project") {
        router.replace("/projects");
        return;
      }
      if (
        deleteTarget.kind === "task" &&
        selectedTask?.title === deleteTarget.name
      ) {
        setSelectedTask(null);
      }
      setDeleteTarget(null);
      setConfirmationName("");
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

  function toggleAssignee(userId: string) {
    setTaskAssigneeIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  if (loading) {
    return <LoadingBlock label="Cargando proyecto..." />;
  }

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
        description={project.description || "Sin descripcion."}
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
            {tasks.length}
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
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              No existe endpoint de busqueda/listado de usuarios; por eso se agrega por UUID real.
            </p>
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
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Historias de usuario</h2>
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
                  description="Crea la primera historia para poder registrar tareas."
                />
              ) : (
                stories.map((story) => (
                  <div key={story.userStoryId} className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--foreground)]">{story.title}</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">{story.description || "Sin descripcion."}</p>
                      </div>
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
                    <div className="mt-3">
                      <ProgressBar value={story.progress} />
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {Math.round(story.progress)}% · {tasks.filter((task) => task.userStoryId === story.userStoryId).length} tareas
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Tareas</h2>
            <form onSubmit={createTask} className="mt-5 space-y-4">
              <Field label="Historia">
                <Select value={taskStoryId} onChange={(event) => setTaskStoryId(event.target.value)}>
                  <option value="">Selecciona una historia</option>
                  {stories.map((story) => (
                    <option key={story.userStoryId} value={story.userStoryId}>{story.title}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Titulo de tarea">
                <TextInput value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
              </Field>
              <Field label="Descripcion">
                <TextArea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} />
              </Field>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Asignados</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {project.members.map((member) => (
                    <label key={member.userId} className="flex items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={taskAssigneeIds.includes(member.userId)}
                        onChange={() => toggleAssignee(member.userId)}
                      />
                      {member.fullName}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={busy || stories.length === 0}>Crear tarea</Button>
            </form>

            <div className="mt-6 space-y-3">
              {tasks.length === 0 ? (
                <EmptyState title="No hay tareas" description="Crea tareas dentro de una historia para iniciar el seguimiento." />
              ) : (
                tasks.map((task) => (
                  <div key={task.sprintTaskId} className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--foreground)]">{task.title}</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">{storyName(stories, task.userStoryId)}</p>
                      </div>
                      <Pill>{task.isCompleted ? "Completada" : "Pendiente"}</Pill>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">{task.description || "Sin descripcion."}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {task.commentCount} comentarios · {task.assigneeIds.length} asignados
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openTask(task.sprintTaskId)} disabled={busy}>Ver comentarios</Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setDeleteTarget({
                            kind: "task",
                            name: task.title,
                            endpoint: `/api/tasks/${task.sprintTaskId}`,
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

          {selectedTask !== null && (
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">{selectedTask.title}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{selectedTask.description || "Sin descripcion."}</p>
                </div>
                <Button variant="ghost" onClick={() => setSelectedTask(null)}>Cerrar</Button>
              </div>
              <div className="mt-4 space-y-3">
                {selectedTask.comments.length === 0 ? (
                  <EmptyState title="No hay comentarios" description="Agrega el primer comentario de seguimiento." />
                ) : (
                  selectedTask.comments.map((comment) => (
                    <div key={comment.commentId} className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4">
                      <p className="text-sm text-[var(--foreground)]">{comment.body}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {memberName(project, comment.authorId)} · {formatDate(comment.createdOnUtc)}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={addComment} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <TextInput
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Escribe un comentario..."
                />
                <Button type="submit" disabled={busy || !commentBody.trim()}>Comentar</Button>
              </form>
            </Card>
          )}
        </div>
      </section>

      <Card>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Gaps de API detectados</h2>
        <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
          <p>No existe endpoint para editar historias de usuario; solo listar, crear, consultar detalle y eliminar.</p>
          <p>No existe endpoint para actualizar estado o reasignar tareas; las asignaciones solo se definen al crear.</p>
          <p>No existe endpoint para cambiar rol de miembro ni para buscar usuarios por correo.</p>
          <p>No existe endpoint para editar o eliminar comentarios; los comentarios se agregan y se conservan segun la retencion del backend.</p>
        </div>
      </Card>

      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Eliminar {deleteLabel(deleteTarget.kind)}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Escribe exactamente <span className="font-semibold text-[var(--foreground)]">{deleteTarget.name}</span> para confirmar. El backend rechazara la eliminacion si existen dependencias no permitidas.
            </p>
            <form onSubmit={confirmDelete} className="mt-5 space-y-4">
              <TextInput value={confirmationName} onChange={(event) => setConfirmationName(event.target.value)} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
                <Button type="submit" variant="danger" disabled={busy || confirmationName !== deleteTarget.name}>Eliminar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

async function fetchProjectBundle(projectId: string): Promise<ProjectBundle> {
  const [project, stories, tasks] = await Promise.all([
    apiRequest<ProjectDetail>(`/api/projects/${projectId}`),
    apiRequest<UserStorySummary[]>(`/api/projects/${projectId}/user-stories`),
    apiRequest<TaskSummary[]>(`/api/tasks?projectId=${projectId}`),
  ]);
  return { project, stories, tasks };
}

function MiniMetric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function memberName(project: ProjectDetail, userId: string): string {
  return project.members.find((member) => member.userId === userId)?.fullName ?? userId;
}

function storyName(stories: UserStorySummary[], userStoryId: string): string {
  return stories.find((story) => story.userStoryId === userStoryId)?.title ?? "Historia no disponible";
}

function deleteLabel(kind: DeleteTarget["kind"]): string {
  if (kind === "project") return "proyecto";
  if (kind === "story") return "historia";
  return "tarea";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

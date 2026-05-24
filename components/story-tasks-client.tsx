"use client";

import Link from "next/link";
import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type { ProjectDetail, TaskDetail, TaskSummary, UserStoryDetail } from "@/src/frontend/types";
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from "@/src/domain/enums/task-status";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  PageHeader,
  StatusPill,
  STATUS_PILL_COLORS,
  SuccessBanner,
  TextArea,
  TextInput,
} from "./ui";

interface StoryTasksBundle {
  readonly project: ProjectDetail;
  readonly story: UserStoryDetail;
  readonly tasks: TaskSummary[];
}

export default function StoryTasksClient({
  projectId,
  userStoryId,
}: {
  readonly projectId: string;
  readonly userStoryId: string;
}) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [story, setStory] = useState<UserStoryDetail | null>(null);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [deleteTask, setDeleteTask] = useState<TaskSummary | null>(null);
  const [confirmationName, setConfirmationName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const bundle = await fetchStoryTasksBundle(projectId, userStoryId);
        if (!cancelled) applyBundle(bundle);
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
  }, [projectId, userStoryId]);

  function applyBundle(bundle: StoryTasksBundle) {
    setProject(bundle.project);
    setStory(bundle.story);
    setTasks(bundle.tasks);
  }

  async function reload() {
    applyBundle(await fetchStoryTasksBundle(projectId, userStoryId));
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) {
      setError("Ingresa el titulo de la tarea.");
      return;
    }
    await runMutation("Tarea creada.", async () => {
      const detail = await apiRequest<TaskDetail>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          userStoryId,
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
      setSelectedTask(await apiRequest<TaskDetail>(`/api/tasks/${taskId}`));
      await reload();
    });
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    const currentTask = tasks.find((task) => task.sprintTaskId === taskId);
    if (currentTask === undefined || currentTask.status === newStatus) return;

    const previousTasks = tasks;
    setTasks((current) =>
      current.map((task) =>
        task.sprintTaskId === taskId ? { ...task, status: newStatus } : task,
      ),
    );
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (selectedTask?.sprintTaskId === taskId) {
        setSelectedTask(await apiRequest<TaskDetail>(`/api/tasks/${taskId}`));
      }
      await reload();
      setNotice("Estado actualizado.");
    } catch (err) {
      setTasks(previousTasks);
      setError(`No fue posible actualizar el estado: ${getErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteTask === null) return;
    await runMutation("Tarea eliminada.", async () => {
      await apiRequest<void>(`/api/tasks/${deleteTask.sprintTaskId}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmationName: confirmationName.trim() }),
      });
      if (selectedTask?.sprintTaskId === deleteTask.sprintTaskId) setSelectedTask(null);
      setDeleteTask(null);
      setConfirmationName("");
      await reload();
    });
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, taskId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
    setDraggingTaskId(taskId);
  }

  function handleDragEnd() {
    setDraggingTaskId(null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, status: string) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggingTaskId;
    setDraggingTaskId(null);
    if (taskId !== null) void updateTaskStatus(taskId, status);
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

  if (loading) return <LoadingBlock label="Cargando tablero de la historia..." />;

  if (project === null || story === null) {
    return (
      <EmptyState
        title="Historia no disponible"
        description={error || "No fue posible cargar la historia seleccionada."}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={project.name}
        title={story.title}
        description={story.description || "Tablero Kanban de tareas de esta historia de usuario."}
        actions={
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--glass)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--glass-strong)]"
          >
            Volver a historias
          </Link>
        }
      />
      <ErrorBanner message={error} />
      <SuccessBanner message={notice} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-5">
            {TASK_STATUS_ORDER.map((status) => {
              const columnTasks = tasks.filter((task) => task.status === status);
              return (
                <div
                  key={status}
                  onDragOver={handleDragOver}
                  onDrop={(event) => handleDrop(event, status)}
                  className="min-h-80 rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      {TASK_STATUS_LABELS[status]}
                    </h2>
                    <span className="rounded-full border border-[var(--hairline)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {columnTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[var(--hairline)] bg-[var(--background)] p-4 text-center text-xs leading-5 text-[var(--muted)]">
                        Arrastra tareas aqui
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <TaskKanbanCard
                          key={task.sprintTaskId}
                          task={task}
                          dragging={draggingTaskId === task.sprintTaskId}
                          busy={busy}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onOpen={openTask}
                          onDelete={setDeleteTask}
                          onStatusChange={updateTaskStatus}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Crear tarea</h2>
            <form onSubmit={createTask} className="mt-5 space-y-4">
              <Field label="Titulo de tarea">
                <TextInput value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
              </Field>
              <Field label="Descripcion">
                <TextArea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} />
              </Field>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Asignados</p>
                <div className="mt-2 grid gap-2">
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
              <Button type="submit" disabled={busy || !taskTitle.trim()}>Crear tarea</Button>
            </form>
          </Card>

          {selectedTask === null ? (
            <Card>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Detalle</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Selecciona una tarea del tablero para revisar comentarios o cambiar su estado manualmente.
              </p>
            </Card>
          ) : (
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">{selectedTask.title}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{selectedTask.description || "Sin descripcion."}</p>
                  <div className="mt-2">
                    <StatusPill status={selectedTask.status} />
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedTask(null)}>Cerrar</Button>
              </div>
              <div className="mt-4 rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-3">
                <StatusSelector
                  currentStatus={selectedTask.status}
                  onChange={(newStatus) => updateTaskStatus(selectedTask.sprintTaskId, newStatus)}
                  disabled={busy}
                />
              </div>
              <div className="mt-5 space-y-3">
                {selectedTask.comments.length === 0 ? (
                  <EmptyState title="Sin comentarios" description="Agrega un comentario para dejar contexto." />
                ) : (
                  selectedTask.comments.map((comment) => (
                    <div key={comment.commentId} className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4">
                      <p className="text-sm text-[var(--foreground)]">{comment.body}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">{formatDate(comment.createdOnUtc)}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={addComment} className="mt-5 flex flex-col gap-3 border-t border-[var(--hairline)] pt-5">
                <TextInput
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Escribe un comentario de seguimiento"
                />
                <Button type="submit" disabled={busy || !commentBody.trim()}>Agregar comentario</Button>
              </form>
            </Card>
          )}
        </div>
      </section>

      {tasks.length === 0 && (
        <EmptyState title="No hay tareas" description="Crea la primera tarea de esta historia para iniciar el seguimiento Kanban." />
      )}

      {deleteTask !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="delete-task-title">
            <h2 id="delete-task-title" className="text-xl font-semibold text-[var(--foreground)]">Eliminar tarea</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Escribe exactamente <span className="font-semibold text-[var(--foreground)]">{deleteTask.title}</span> para confirmar.
            </p>
            <form onSubmit={confirmDelete} className="mt-5 space-y-4">
              <TextInput value={confirmationName} onChange={(event) => setConfirmationName(event.target.value)} aria-label="Nombre de la tarea para confirmar eliminacion" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDeleteTask(null)}>Cancelar</Button>
                <Button type="submit" variant="danger" disabled={busy || confirmationName !== deleteTask.title}>Eliminar tarea</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function TaskKanbanCard({
  task,
  dragging,
  busy,
  onDragStart,
  onDragEnd,
  onOpen,
  onDelete,
  onStatusChange,
}: {
  readonly task: TaskSummary;
  readonly dragging: boolean;
  readonly busy: boolean;
  readonly onDragStart: (event: DragEvent<HTMLDivElement>, taskId: string) => void;
  readonly onDragEnd: () => void;
  readonly onOpen: (taskId: string) => void;
  readonly onDelete: (task: TaskSummary) => void;
  readonly onStatusChange: (taskId: string, status: string) => void;
}) {
  return (
    <div
      draggable={!busy}
      onDragStart={(event) => onDragStart(event, task.sprintTaskId)}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 shadow-xs transition active:cursor-grabbing ${
        dragging ? "opacity-50 ring-2 ring-[var(--foreground)]/20" : "hover:-translate-y-0.5 hover:bg-[var(--glass)]"
      }`}
    >
      <div className="space-y-2">
        <h3 className="text-sm font-semibold leading-6 text-[var(--foreground)]">{task.title}</h3>
        <p className="line-clamp-3 text-xs leading-5 text-[var(--muted)]">{task.description || "Sin descripcion."}</p>
      </div>
      <div className="mt-4 rounded-xl border border-[var(--hairline)] bg-[var(--glass)] p-3">
        <StatusSelector
          currentStatus={task.status}
          disabled={busy}
          onChange={(newStatus) => onStatusChange(task.sprintTaskId, newStatus)}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        {task.commentCount} comentarios · {task.assigneeIds.length} asignados
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onOpen(task.sprintTaskId)} disabled={busy}>Ver detalle</Button>
        <Button variant="ghost" onClick={() => onDelete(task)} disabled={busy}>Eliminar</Button>
      </div>
    </div>
  );
}

async function fetchStoryTasksBundle(projectId: string, userStoryId: string): Promise<StoryTasksBundle> {
  const [project, story, tasks] = await Promise.all([
    apiRequest<ProjectDetail>(`/api/projects/${projectId}`),
    apiRequest<UserStoryDetail>(`/api/user-stories/${userStoryId}`),
    apiRequest<TaskSummary[]>(`/api/tasks?userStoryId=${userStoryId}`),
  ]);
  return { project, story, tasks };
}

function StatusSelector({
  currentStatus,
  onChange,
  disabled,
}: {
  readonly currentStatus: string;
  readonly onChange: (status: string) => void;
  readonly disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Estado</span>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TASK_STATUS_LABELS).map(([code, label]) => (
          <button
            key={code}
            type="button"
            disabled={disabled}
            onClick={() => { if (code !== currentStatus) onChange(code); }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              code === currentStatus
                ? `${STATUS_PILL_COLORS[code] ?? ""} border-current shadow-xs`
                : "border-[var(--hairline)] bg-[var(--glass)] text-[var(--muted)] hover:bg-[var(--glass-strong)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

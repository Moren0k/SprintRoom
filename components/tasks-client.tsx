"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type { TaskDetail, TaskSummary } from "@/src/frontend/types";
import { TASK_STATUS_LABELS } from "@/src/domain/enums/task-status";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  SectionHeader,
  STATUS_PILL_COLORS,
  SuccessBanner,
  TextInput,
} from "./ui";

export default function TasksClient() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [deleteTask, setDeleteTask] = useState<TaskSummary | null>(null);
  const [confirmationName, setConfirmationName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<TaskSummary[]>("/api/tasks");
        if (!cancelled) setTasks(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTasks();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadTasks() {
    const data = await apiRequest<TaskSummary[]>("/api/tasks");
    setTasks(data);
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
      setSelectedTask(detail);
      await reloadTasks();
    });
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    await runMutation("Estado actualizado.", async () => {
      await apiRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (selectedTask?.sprintTaskId === taskId) {
        const detail = await apiRequest<TaskDetail>(`/api/tasks/${taskId}`);
        setSelectedTask(detail);
      }
      await reloadTasks();
    });
  }

  async function confirmDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteTask === null) return;
    await runMutation("Tarea eliminada.", async () => {
      await apiRequest<void>(`/api/tasks/${deleteTask.sprintTaskId}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmationName: confirmationName.trim() }),
      });
      if (selectedTask?.sprintTaskId === deleteTask.sprintTaskId) {
        setSelectedTask(null);
      }
      setDeleteTask(null);
      setConfirmationName("");
      await reloadTasks();
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

  if (loading) {
    return <LoadingBlock label="Cargando tareas personales..." />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mis tareas"
        title="Carga de trabajo personal"
        description="Consulta tus tareas asignadas, abre su proyecto y deja comentarios de seguimiento."
      />
      <ErrorBanner message={error} />
      <SuccessBanner message={notice} />

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <EmptyState
              title="No tienes tareas asignadas"
              description="Las tareas creadas en proyectos y asignadas a tu usuario apareceran aqui."
            />
          ) : (
            tasks.map((task) => (
              <Card key={task.sprintTaskId} className="p-0">
                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <h2 className="text-base font-semibold leading-6 text-[var(--foreground)]">{task.title}</h2>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {task.description || "Sin descripcion."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-3">
                    <StatusSelector
                      currentStatus={task.status}
                      onChange={(newStatus) => updateTaskStatus(task.sprintTaskId, newStatus)}
                      disabled={busy}
                    />
                  </div>

                  <p className="text-xs font-medium text-[var(--muted)]">
                    {task.commentCount} comentarios · {task.assigneeIds.length} asignados
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-[var(--hairline)] px-5 py-4">
                  <Button variant="secondary" onClick={() => openTask(task.sprintTaskId)} disabled={busy}>
                    Ver detalle
                  </Button>
                  <Link
                    href={`/projects/${task.projectId}`}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--glass)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--glass-strong)]"
                  >
                    Abrir proyecto
                  </Link>
                  <Button variant="ghost" onClick={() => setDeleteTask(task)} disabled={busy}>
                    Eliminar tarea
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          {selectedTask === null ? (
            <Card>
              <SectionHeader
                title="Detalle"
                description="Selecciona una tarea para consultar comentarios, revisar contexto y agregar seguimiento."
              />
            </Card>
          ) : (
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">{selectedTask.title}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{selectedTask.description || "Sin descripcion."}</p>
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
              <form onSubmit={addComment} className="mt-5 flex flex-col gap-3 border-t border-[var(--hairline)] pt-5 sm:flex-row">
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
            onClick={() => { if (code !== currentStatus) void onChange(code); }}
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

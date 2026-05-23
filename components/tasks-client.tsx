"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type { TaskDetail, TaskSummary } from "@/src/frontend/types";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Pill,
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
        description="Esta vista consume `GET /api/tasks` sin filtros, que devuelve las tareas asignadas al usuario autenticado."
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
              <Card key={task.sprintTaskId} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-[var(--foreground)]">{task.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {task.description || "Sin descripcion."}
                    </p>
                  </div>
                  <Pill>{task.isCompleted ? "Completada" : "Pendiente"}</Pill>
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {task.commentCount} comentarios · {task.assigneeIds.length} asignados
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
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
                    Eliminar
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          {selectedTask === null ? (
            <Card>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Detalle</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Selecciona una tarea para consultar comentarios y agregar seguimiento. La edicion de estado no se muestra porque no existe endpoint PATCH para tareas.
              </p>
            </Card>
          ) : (
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">{selectedTask.title}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{selectedTask.description || "Sin descripcion."}</p>
                </div>
                <Button variant="ghost" onClick={() => setSelectedTask(null)}>Cerrar</Button>
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
              <form onSubmit={addComment} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <TextInput
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Nuevo comentario"
                />
                <Button type="submit" disabled={busy || !commentBody.trim()}>Comentar</Button>
              </form>
            </Card>
          )}
        </div>
      </section>

      {deleteTask !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Eliminar tarea</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Escribe exactamente <span className="font-semibold text-[var(--foreground)]">{deleteTask.title}</span> para confirmar.
            </p>
            <form onSubmit={confirmDelete} className="mt-5 space-y-4">
              <TextInput value={confirmationName} onChange={(event) => setConfirmationName(event.target.value)} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDeleteTask(null)}>Cancelar</Button>
                <Button type="submit" variant="danger" disabled={busy || confirmationName !== deleteTask.title}>Eliminar</Button>
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

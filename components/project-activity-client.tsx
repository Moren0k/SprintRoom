"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type { ProjectActivityEvent } from "@/src/frontend/types";
import { Button, Card, EmptyState, LoadingBlock } from "./ui";

export default function ProjectActivityClient({
  projectId,
}: {
  readonly projectId: string;
}) {
  const [events, setEvents] = useState<ReadonlyArray<ProjectActivityEvent>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<ReadonlyArray<ProjectActivityEvent>>(
        `/api/projects/${projectId}/activity`,
      );
      setEvents(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const data = await apiRequest<ReadonlyArray<ProjectActivityEvent>>(
          `/api/projects/${projectId}/activity`,
        );
        if (!cancelled) setEvents(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) return <LoadingBlock label="Cargando actividad..." />;

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Actividad MCP / IA</h2>
        <Button variant="secondary" onClick={load} disabled={loading}>
          Actualizar actividad
        </Button>
      </div>

      {error.length > 0 && (
        <p className="mt-4 text-sm text-red-500">{error}</p>
      )}

      {events.length === 0 && (
        <div className="mt-5">
          <EmptyState
            title="Sin actividad"
            description="No hay eventos de actividad registrados para este proyecto."
          />
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-5 space-y-3">
          {events.map((event) => (
            <ActivityEventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ActivityEventRow({
  event,
}: {
  readonly event: ProjectActivityEvent;
}) {
  const badge = inferBadge(event.action);
  const description = inferDescription(event.action, event.entityType, event.entityId);
  const isError = event.action.includes(".error");

  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isError ? "bg-red-500" : "bg-emerald-500"
              }`}
            />
            <p className="font-medium text-[var(--foreground)]">{description}</p>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(event.occurredOnUtc)}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
            isError
              ? "border-red-500/30 bg-red-500/10 text-red-600"
              : "border-[var(--hairline)] text-[var(--muted)]"
          }`}
        >
          {badge}
        </span>
      </div>
    </div>
  );
}

function inferBadge(action: string): string {
  if (action.startsWith("mcp.")) return "MCP";
  return "IA";
}

function inferDescription(
  action: string,
  entityType: string,
  entityId: string,
): string {
  const shortId = entityId.length > 8 ? `${entityId.slice(0, 8)}...` : entityId;

  const friendly: Record<string, string> = {
    "mcp.update_task_status": "Actualizó estado de tarea",
    "mcp.add_task_agent_note": "Registró nota de agente en tarea",
    "mcp.create_task_comment": "Agregó comentario a tarea",
    "mcp.create_task": "Creó una tarea",
    "mcp.create_user_story": "Creó una historia de usuario",
    "mcp.update_task_details": "Actualizó detalles de tarea",
    "mcp.assign_task": "Reasignó tarea",
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

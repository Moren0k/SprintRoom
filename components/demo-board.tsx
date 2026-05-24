"use client";

import { useState } from "react";

type Comment = {
  author: string;
  text: string;
};

type Task = {
  id: string;
  title: string;
  storyId: string;
  storyTitle: string;
  comments: Comment[];
};

type Column = {
  id: string;
  title: string;
  tasks: Task[];
};

const INITIAL_COLUMNS: Column[] = [
  {
    id: "backlog",
    title: "Backlog",
    tasks: [
      {
        id: "t10",
        title: "Conectar fuente de datos",
        storyId: "s3",
        storyTitle: "Analytics y reporting",
        comments: [
          { author: "Luis", text: "Esperando acceso a la API" },
        ],
      },
      {
        id: "t11",
        title: "Visualizar datos en gráficos",
        storyId: "s3",
        storyTitle: "Analytics y reporting",
        comments: [],
      },
    ],
  },
  {
    id: "en-progreso",
    title: "En progreso",
    tasks: [
      {
        id: "t3",
        title: "Formulario de captura con validación",
        storyId: "s1",
        storyTitle: "Diseño de landing page",
        comments: [
          { author: "Luis", text: "Falta agregar validación de email" },
        ],
      },
      {
        id: "t8",
        title: "Redactar secuencia de 3 correos",
        storyId: "s2",
        storyTitle: "Email marketing automation",
        comments: [
          { author: "Carlos", text: "Tengo un draft, lo subo mañana" },
        ],
      },
    ],
  },
  {
    id: "completado",
    title: "Completado",
    tasks: [
      {
        id: "t1",
        title: "Maquetar hero con CTA",
        storyId: "s1",
        storyTitle: "Diseño de landing page",
        comments: [
          { author: "Ana", text: "Listo para revisión" },
        ],
      },
      {
        id: "t6",
        title: "Diseñar plantilla de bienvenida",
        storyId: "s2",
        storyTitle: "Email marketing automation",
        comments: [
          { author: "Ana", text: "Aprobada por el equipo" },
        ],
      },
      {
        id: "t9",
        title: "Definir KPIs del dashboard",
        storyId: "s3",
        storyTitle: "Analytics y reporting",
        comments: [],
      },
    ],
  },
];

export default function DemoBoard() {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentInput, setCommentInput] = useState("");

  function moveTask(taskId: string, fromCol: string, toCol: string) {
    setColumns((prev) => {
      const from = prev.find((c) => c.id === fromCol);
      const to = prev.find((c) => c.id === toCol);
      if (!from || !to) return prev;
      const task = from.tasks.find((t) => t.id === taskId);
      if (!task) return prev;
      return prev.map((c) => {
        if (c.id === fromCol)
          return { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) };
        if (c.id === toCol)
          return { ...c, tasks: [...c.tasks, task] };
        return c;
      });
    });
  }

  function advanceTask(taskId: string, currentCol: string) {
    const order = ["backlog", "en-progreso", "completado"];
    const idx = order.indexOf(currentCol);
    if (idx < order.length - 1) {
      moveTask(taskId, currentCol, order[idx + 1]);
    }
  }

  function regressTask(taskId: string, currentCol: string) {
    const order = ["backlog", "en-progreso", "completado"];
    const idx = order.indexOf(currentCol);
    if (idx > 0) {
      moveTask(taskId, currentCol, order[idx - 1]);
    }
  }

  function addCommentToTask(taskId: string) {
    const text = commentInput.trim();
    if (!text) return;
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) =>
          t.id === taskId
            ? { ...t, comments: [...t.comments, { author: "Tú", text }] }
            : t,
        ),
      })),
    );
    setCommentInput("");
    setSelectedTask((prev) =>
      prev && prev.id === taskId
        ? { ...prev, comments: [...prev.comments, { author: "Tú", text }] }
        : prev,
    );
  }

  const total = columns.reduce((a, c) => a + c.tasks.length, 0);
  const done = columns.find((c) => c.id === "completado")?.tasks.length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const order = ["backlog", "en-progreso", "completado"];

  return (
    <div className="flex h-full flex-col">
      {/* Board header — fijo */}
      <div className="flex shrink-0 flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <span className="text-xs font-medium text-[var(--muted)]">
            Campaña de Marketing Q2
          </span>
          <h3 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
            Tablero Kanban
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs text-[var(--muted)]">
            <span className="text-lg font-semibold text-[var(--foreground)]">
              {progress}%
            </span>
            <br />
            completado
          </div>
          <div className="h-10 w-10">
            <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="var(--hairline)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${progress * 0.973} 100`}
                strokeLinecap="round"
                className="text-[var(--foreground)]"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Área principal: columnas + detalle — comparten el espacio restante */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
        {/* Columnas — se encogen cuando el detalle está visible */}
        <div className={`grid min-h-0 gap-5 md:grid-cols-3 ${selectedTask ? "flex-1" : "flex-1"}`}>
          {columns.map((col) => (
            <div
              key={col.id}
              className="flex min-h-0 flex-col rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] backdrop-blur-xl overflow-hidden"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--hairline)] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      col.id === "backlog"
                        ? "bg-amber-400"
                        : col.id === "en-progreso"
                          ? "bg-sky-400"
                          : "bg-emerald-400"
                    }`}
                  />
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">
                    {col.title}
                  </h4>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {col.tasks.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {col.tasks.length === 0 && (
                  <p className="py-6 text-center text-xs text-[var(--muted)] opacity-50">
                    No hay tareas
                  </p>
                )}
                {col.tasks.map((task) => {
                  const idx = order.indexOf(col.id);
                  return (
                    <div key={task.id} className="group relative">
                      <button
                        onClick={() =>
                          setSelectedTask(
                            selectedTask?.id === task.id ? null : task,
                          )
                        }
                        className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-3 text-left shadow-xs outline-none transition hover:bg-[var(--glass)] focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-[var(--foreground)] leading-snug">
                            {task.title}
                          </span>
                          {task.comments.length > 0 && (
                            <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-[var(--muted)]">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                              {task.comments.length}
                            </span>
                          )}
                        </div>
                        <span className="mt-1.5 inline-block rounded-full bg-[var(--glass-strong)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                          {task.storyTitle}
                        </span>
                      </button>
                      <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 flex-col gap-0.5 group-hover:flex">
                        {idx < order.length - 1 && (
                          <button
                            onClick={() => advanceTask(task.id, col.id)}
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--background)] text-[10px] text-[var(--muted)] shadow-xs transition hover:bg-[var(--glass)] hover:text-[var(--foreground)]"
                            title="Avanzar"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                          </button>
                        )}
                        {idx > 0 && (
                          <button
                            onClick={() => regressTask(task.id, col.id)}
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--background)] text-[10px] text-[var(--muted)] shadow-xs transition hover:bg-[var(--glass)] hover:text-[var(--foreground)]"
                            title="Retroceder"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Panel de detalle — ocupa espacio del área, no lo añade */}
        {selectedTask && (
          <div className="max-h-[180px] shrink-0 overflow-y-auto rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)]">
                  {selectedTask.title}
                </h4>
                <span className="mt-1 inline-block rounded-full bg-[var(--glass-strong)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                  {selectedTask.storyTitle}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-[var(--muted)]">
                Comentarios ({selectedTask.comments.length})
              </p>
              {selectedTask.comments.length === 0 && (
                <p className="text-xs text-[var(--muted)] opacity-50">
                  No hay comentarios aún.
                </p>
              )}
              {selectedTask.comments.map((c, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--background)] px-3 py-2 text-xs">
                  <span className="shrink-0 font-medium text-[var(--foreground)]">{c.author}:</span>
                  <span className="text-[var(--muted)]">{c.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Agregar comentario..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCommentToTask(selectedTask.id); }}
                className="flex-1 rounded-lg border border-[var(--hairline)] bg-transparent px-3 py-2 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--muted)]"
              />
              <button
                onClick={() => addCommentToTask(selectedTask.id)}
                className="shrink-0 rounded-lg border border-[var(--hairline)] px-3 py-2 text-xs text-[var(--muted)] transition hover:bg-[var(--glass)] hover:text-[var(--foreground)]"
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pie */}
      <p className="mt-2 shrink-0 text-center text-xs text-[var(--muted)] opacity-60">
        Haz clic en una tarea para ver sus comentarios. Usa las flechas para moverla.
      </p>
    </div>
  );
}

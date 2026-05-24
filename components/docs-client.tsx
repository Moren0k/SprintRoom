"use client";

import { useMemo, useState } from "react";

const TABS = ["MCP", "API", "Tools"] as const;

const TOOLS = [
  {
    name: "get_project_backlog",
    description: "Obtiene todo el proyecto con sus historias y tareas.",
    args: "Ninguno. Usa la PROJECT_KEY del header para identificar el proyecto.",
    example: `{ "tool": "get_project_backlog" }`,
  },
  {
    name: "get_user_story_by_id",
    description: "Obtiene una historia de usuario por su ID.",
    args: '"storyId" (string) — ID de la historia.',
    example: `{ "tool": "get_user_story_by_id", "storyId": "usr_story_abc123" }`,
  },
  {
    name: "get_task_by_id",
    description: "Obtiene una tarea por su ID.",
    args: '"taskId" (string) — ID de la tarea.',
    example: `{ "tool": "get_task_by_id", "taskId": "task_xyz789" }`,
  },
  {
    name: "search_tasks",
    description: "Busca tareas por texto en el proyecto completo.",
    args: '"query" (string) — texto a buscar.',
    example: `{ "tool": "search_tasks", "query": "bug login" }`,
  },
  {
    name: "update_task_status",
    description: "Actualiza el estado de una tarea.",
    args: '"taskId" (string), "status" ("not_started" | "in_progress" | "testing" | "review" | "completed").',
    example: `{ "tool": "update_task_status", "taskId": "task_xyz789", "status": "in_progress" }`,
  },
  {
    name: "add_task_agent_note",
    description: "Agrega una nota de agente a una tarea (inmutable).",
    args: '"taskId" (string), "content" (string).',
    example: `{ "tool": "add_task_agent_note", "taskId": "task_xyz789", "content": "Analisis completado." }`,
  },
  {
    name: "get_sprintroom_mcp_skill",
    description: "Obtiene la skill de MCP de SprintRoom (documentacion para el agente).",
    args: "Ninguno.",
    example: `{ "tool": "get_sprintroom_mcp_skill" }`,
  },
];

const STATUSES = [
  { value: "not_started", label: "No iniciado", color: "bg-gray-500" },
  { value: "in_progress", label: "En progreso", color: "bg-blue-500" },
  { value: "testing", label: "En pruebas", color: "bg-yellow-500" },
  { value: "review", label: "En revision", color: "bg-purple-500" },
  { value: "completed", label: "Completado", color: "bg-emerald-500" },
];

export default function DocsClient() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("MCP");

  const content = useMemo(() => {
    switch (tab) {
      case "MCP":
        return <McpDocs />;
      case "API":
        return <ApiDocs />;
      case "Tools":
        return <ToolsDocs />;
    }
  }, [tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Documentacion</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Integra SprintRoom con agentes de IA a traves del Model Context Protocol (MCP).
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-[var(--hairline)] bg-[var(--glass)] p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {content}
    </div>
  );
}

function McpDocs() {
  const origin = typeof window === "undefined" ? "https://sprintroom.app" : window.location.origin;

  return (
    <div className="space-y-8">
      {/* OpenCode */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">OpenCode</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Configuraci&oacute;n para OpenCode. Usa <code className="text-[var(--foreground)]">{`{env:SPRINTROOM_PROJECT_KEY}`}</code> para leer la clave del entorno.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-[11px] leading-5 text-[var(--foreground)]">
{`{
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
}`}
        </pre>
      </section>

      {/* Claude Desktop */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Claude Desktop</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Agrega al archivo <code className="text-[var(--foreground)]">claude_desktop_config.json</code>. Usa <code className="text-[var(--foreground)]">{'${SPRINTROOM_PROJECT_KEY}'}</code> si la clave esta en tu entorno, o reemplazala por el valor directo.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-[11px] leading-5 text-[var(--foreground)]">
{`{
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
}`}
        </pre>
      </section>

      {/* Claude Code */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Claude Code (CLI)</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Usa el comando <code className="text-[var(--foreground)]">claude mcp add</code> con la variable de entorno <code className="text-[var(--foreground)]">$SPRINTROOM_PROJECT_KEY</code>.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-[11px] leading-5 text-[var(--foreground)]">
{`claude mcp add --transport stdio \\
  --env SPRINTROOM_API_URL=${origin} \\
  --env SPRINTROOM_PROJECT_KEY=\\$SPRINTROOM_PROJECT_KEY \\
  sprintroom \\
  -- npx -y @sprintroom/mcp`}
        </pre>
      </section>

      {/* Codex (Cursor) */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Codex (Cursor)</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Agrega al archivo <code className="text-[var(--foreground)]">.cursor/config</code>. Usa <code className="text-[var(--foreground)]">{'${env:SPRINTROOM_PROJECT_KEY}'}</code> para leer la clave del entorno.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-[11px] leading-5 text-[var(--foreground)]">
{`[mcp_servers.sprintroom]
command = "npx"
args = ["-y", "@sprintroom/mcp"]

[mcp_servers.sprintroom.env]
SPRINTROOM_API_URL = "${origin}"
SPRINTROOM_PROJECT_KEY = "\${env:SPRINTROOM_PROJECT_KEY}"`}
        </pre>
      </section>

      {/* Seguridad */}
      <section className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Seguridad</h2>
        <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
          <li>La PROJECT_KEY otorga acceso completo de lectura/escritura a un proyecto.</li>
          <li>No compartas la clave en chats, commits ni documentacion publica.</li>
          <li>Revocala desde la UI del proyecto si fue comprometida.</li>
          <li>Las claves se almacenan como hash SHA-256. Nunca en texto plano.</li>
        </ul>
      </section>
    </div>
  );
}

function ApiDocs() {
  const origin = typeof window === "undefined" ? "https://sprintroom.app" : window.location.origin;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">HTTP API (legacy)</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Endpoint directo para integraciones manuales (curl, Postman, scripts). Soporta JSON-RPC 2.0 y HTTP simple.
        </p>

        <h3 className="mt-6 text-sm font-semibold text-[var(--foreground)]">Endpoint</h3>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-[11px] leading-5 text-[var(--foreground)]">
{`POST ${origin}/api/mcp
Content-Type: application/json
X-Project-Key: sk_sprintroom_tu_clave`}
        </pre>

        <h3 className="mt-6 text-sm font-semibold text-[var(--foreground)]">JSON-RPC 2.0 (recomendado)</h3>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-[11px] leading-5 text-[var(--foreground)]">
{`# Discovery
curl -X POST ${origin}/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-Project-Key: sk_sprintroom_tu_clave" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Tool call
curl -X POST ${origin}/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-Project-Key: sk_sprintroom_tu_clave" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_project_backlog","arguments":{}}}'`}
        </pre>

        <h3 className="mt-6 text-sm font-semibold text-[var(--foreground)]">HTTP Simple</h3>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-[11px] leading-5 text-[var(--foreground)]">
{`curl -X POST ${origin}/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-Project-Key: sk_sprintroom_tu_clave" \\
  -d '{"tool":"get_project_backlog"}'`}
        </pre>
      </section>
    </div>
  );
}

function ToolsDocs() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">
        SprintRoom expone las siguientes herramientas a traves del MCP. Usa <code className="text-[var(--foreground)]">tools/list</code> para descubrirlas dinamicamente.
      </p>

      <div className="space-y-4">
        {TOOLS.map((tool) => (
          <div key={tool.name} className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <code className="rounded-md bg-[var(--glass)] px-2 py-1 text-sm font-medium text-[var(--foreground)]">
                  {tool.name}
                </code>
                <p className="mt-2 text-sm text-[var(--muted)]">{tool.description}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <span className="text-xs font-semibold text-[var(--muted)]">Argumentos:</span>
                <p className="text-xs text-[var(--muted)]">{tool.args}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-[var(--muted)]">Ejemplo:</span>
                <pre className="mt-1 overflow-x-auto rounded-lg border border-[var(--hairline)] bg-[var(--glass)] p-2 text-[10px] leading-4 text-[var(--foreground)]">
                  {tool.example}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Statuses */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">Estados de tarea</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {STATUSES.map((s) => (
            <div key={s.value} className="rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-3 text-center">
              <div className={`mx-auto h-2 w-2 rounded-full ${s.color}`} />
              <p className="mt-1 text-xs font-medium text-[var(--foreground)]">{s.label}</p>
              <p className="text-[10px] text-[var(--muted)]">{s.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

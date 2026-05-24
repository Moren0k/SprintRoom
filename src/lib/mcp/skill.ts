import type { McpSkillPackage } from "./types";

export const SPRINTROOM_MCP_SKILL_VERSION = "1.0.0";
export const SPRINTROOM_MCP_SKILL_LAST_UPDATED = "2026-05-24";

export const SPRINTROOM_MCP_AGENTS_INSTRUCTION =
  "Skill del MCP de SprintRoom: antes de usar el MCP de SprintRoom, todo agente debe leer la skill ubicada en [ruta-detectada]/sprintroom-mcp/. Esta skill documenta herramientas reales, parametros, salidas, casos de uso, errores comunes y buenas practicas. No se deben inventar herramientas, argumentos, endpoints, estados ni comportamientos no documentados. SprintRoom todavia no tiene CLI; no documentes comandos CLI inexistentes. Si el MCP cambia, esta skill debe actualizarse en el mismo cambio.";

const README_CONTENT = `# sprintroom-mcp

Skill oficial del MCP de SprintRoom para agentes de IA.

Esta carpeta es la fuente oficial de la documentacion que debe instalarse en los proyectos de usuarios cuando copian el prompt de instalacion del MCP desde SprintRoom.

## Archivo principal

Lee \`SKILL.md\` antes de usar cualquier herramienta del MCP de SprintRoom.

## Instalacion o actualizacion de esta skill

Para instalar o actualizar esta skill en un proyecto, primero instala/configura el MCP de SprintRoom. Luego llama la herramienta \`get_sprintroom_mcp_skill\` y crea o actualiza los archivos que devuelva la respuesta en la carpeta de skills correspondiente.

Prioridad de instalacion:

1. \`.agentes/\`
2. \`.skills/\`
3. \`.sprintroom/\`

Dentro de la carpeta elegida, crea o actualiza \`sprintroom-mcp/README.md\` y \`sprintroom-mcp/SKILL.md\`.

## MCP documentado

- Endpoint: \`/api/mcp\`
- Header requerido: \`X-Project-Key\`
- Protocolos soportados: HTTP simple y JSON-RPC 2.0
- Fuente de verdad del codigo: \`app/api/mcp/route.ts\`, \`src/lib/mcp/tools.ts\`, \`src/lib/mcp/types.ts\`, \`src/lib/mcp/service.ts\`, \`src/lib/mcp/auth.ts\`

## Herramientas reales

- \`get_project_backlog\`
- \`get_user_story_by_id\`
- \`get_task_by_id\`
- \`search_tasks\`
- \`update_task_status\`
- \`add_task_agent_note\`
- \`get_sprintroom_mcp_skill\`

No documentes ni uses herramientas que no existan en el codigo real del MCP. Si el MCP cambia, actualiza esta skill y la respuesta de \`get_sprintroom_mcp_skill\` en el mismo cambio.
`;

const SKILL_CONTENT = `---
name: sprintroom-mcp
description: Use when an AI agent needs to use the SprintRoom MCP to install/update the official skill, read backlog, inspect user stories or tasks, search tasks, update task status, or add task agent notes.
---

# sprintroom-mcp

## Proposito

Esta skill es la guia oficial para agentes de IA que usan el MCP de SprintRoom. Debe leerse antes de llamar herramientas del MCP. Su objetivo es evitar llamadas incorrectas, estados invalidos, filtraciones de PROJECT_KEY y herramientas inventadas.

## Que es el MCP de SprintRoom

El MCP de SprintRoom es el endpoint \`/api/mcp\` de SprintRoom. Permite a agentes de IA consultar el backlog real de un proyecto, instalar/actualizar esta skill oficial y ejecutar dos acciones de escritura: actualizar estado de tareas y registrar notas de agente.

El proyecto se resuelve desde una PROJECT_KEY enviada en el header \`X-Project-Key\`. Todas las consultas y escrituras quedan filtradas al \`projectId\` asociado a esa key.

## Instalacion o actualizacion de esta skill

Para instalar o actualizar esta skill en un proyecto:

1. Instala/configura el MCP de SprintRoom con el endpoint y PROJECT_KEY del proyecto.
2. Llama la herramienta \`get_sprintroom_mcp_skill\`.
3. Elige carpeta de instalacion con esta prioridad: \`.agentes/\`, luego \`.skills/\`, luego crea \`.sprintroom/\`.
4. Dentro de la carpeta elegida, crea o actualiza \`sprintroom-mcp/README.md\` y \`sprintroom-mcp/SKILL.md\` usando \`files[].content\` de la respuesta.
5. Actualiza \`AGENTS.md\` o \`AGENTES.md\` con \`agentsInstruction\`.
6. Lee la skill instalada antes de usar cualquier otra herramienta del MCP.

La herramienta \`get_sprintroom_mcp_skill\` no escribe archivos. Solo devuelve el paquete instalable para que el agente lo cree o actualice localmente.

## Cuando usarlo

- Para instalar o actualizar la skill oficial mediante \`get_sprintroom_mcp_skill\`.
- Para entender el backlog real de un proyecto SprintRoom.
- Para consultar historias de usuario y tareas.
- Para buscar tareas por texto, estado o historia.
- Para mover una tarea entre estados Kanban cuando hay instruccion o evidencia suficiente.
- Para registrar una nota tecnica del agente en una tarea.

## Cuando no usarlo

- Si no necesitas datos reales de SprintRoom ni instalar esta skill.
- Si falta PROJECT_KEY.
- Para crear, editar o eliminar proyectos, historias, tareas, comentarios, miembros o claves MCP.
- Para gestionar permisos, base de datos, migraciones, OAuth, hosting o configuracion de SprintRoom.
- Para guardar secretos o credenciales en notas de agente.

## Autenticacion y conexion

Requisitos reales del codigo:

- Endpoint: \`/api/mcp\` en la app SprintRoom.
- Header obligatorio: \`X-Project-Key: <PROJECT_KEY>\`.
- Header recomendado: \`Content-Type: application/json\`.
- La PROJECT_KEY se valida con SHA-256 contra la tabla \`project_keys\`.
- Si la key falta, es invalida o esta inactiva, ninguna herramienta se ejecuta.

Protocolos soportados:

- HTTP simple: body con \`{ "tool": "nombre", ...argumentos }\`.
- JSON-RPC 2.0: \`initialize\`, \`tools/list\`, \`tools/call\`.
- GET \`/api/mcp\`: descubrimiento de herramientas en formato HTTP simple.

## Estados validos de tareas

- \`not_started\` = Sin Empezar
- \`in_progress\` = En Desarrollo
- \`testing\` = Probando
- \`review\` = En Revision
- \`completed\` = Completada

No uses \`todo\`, \`done\` ni \`blocked\`; no existen como estados validos en el MCP actual.

## Herramientas reales disponibles

- \`get_project_backlog\`
- \`get_user_story_by_id\`
- \`get_task_by_id\`
- \`search_tasks\`
- \`update_task_status\`
- \`add_task_agent_note\`
- \`get_sprintroom_mcp_skill\`

## Capacidades no disponibles actualmente en el MCP

No disponible actualmente en el MCP:

- Crear, editar o eliminar proyectos.
- Crear, editar o eliminar historias de usuario.
- Crear tareas.
- Editar titulo o descripcion de tareas.
- Eliminar tareas.
- Reasignar tareas.
- Leer comentarios completos de tareas.
- Crear comentarios normales de usuario.
- Gestionar miembros.
- Crear, listar o revocar PROJECT_KEYs desde el MCP.
- Modificar permisos, RLS, migraciones, base de datos u OAuth.

Si el usuario pide una capacidad no disponible, dilo claramente y no inventes una herramienta.

## Como decidir que herramienta usar

- Necesitas instalar o actualizar esta skill: usa \`get_sprintroom_mcp_skill\`.
- Necesitas panorama completo del proyecto: usa \`get_project_backlog\`.
- Tienes \`userStoryId\` y necesitas una historia: usa \`get_user_story_by_id\`.
- Tienes \`taskId\` y necesitas contexto de tarea: usa \`get_task_by_id\`.
- Tienes texto, estado o \`storyId\` para encontrar tareas: usa \`search_tasks\`.
- Necesitas mover una tarea a otro estado: valida primero y usa \`update_task_status\`.
- Terminaste trabajo o debes dejar trazabilidad tecnica: usa \`add_task_agent_note\`.

## Herramienta: get_sprintroom_mcp_skill

Devuelve el paquete instalable de esta skill oficial.

Entrada HTTP simple:

    { "tool": "get_sprintroom_mcp_skill" }

Salida:

- \`name\`: \`sprintroom-mcp\`.
- \`version\`: version de la skill.
- \`description\`: descripcion breve.
- \`recommendedInstallDir\`: \`sprintroom-mcp\`.
- \`installDirPriority\`: \`.agentes/\`, \`.skills/\`, \`.sprintroom/\`.
- \`files[]\`: archivos a crear o actualizar, con \`path\` y \`content\`.
- \`agentsInstruction\`: texto para AGENTS.md o AGENTES.md.
- \`tools[]\`: resumen de herramientas reales.
- \`lastUpdated\`: fecha de actualizacion.

Notas:
Esta herramienta no escribe en el proyecto del usuario. El agente debe crear o actualizar los archivos localmente.

## Herramienta: get_project_backlog

Obtiene proyecto, historias y tareas agrupadas por historia para el proyecto de la PROJECT_KEY.

Entrada HTTP simple:

    { "tool": "get_project_backlog" }

Salida: \`project\`, \`userStories[]\` y \`tasks[]\` con \`id\`, \`title\`, \`description\`, \`status\`, \`userStoryId\`, \`userStoryTitle\`, \`assigneeIds\`, \`commentCount\`, \`agentNotes\`.

## Herramienta: get_user_story_by_id

Obtiene una historia de usuario por ID, sus tareas y progreso.

Entrada HTTP simple:

    { "tool": "get_user_story_by_id", "userStoryId": "uuid" }

## Herramienta: get_task_by_id

Obtiene una tarea por ID con contexto de historia y proyecto.

Entrada HTTP simple:

    { "tool": "get_task_by_id", "taskId": "uuid" }

## Herramienta: search_tasks

Busca tareas por texto, estado o historia dentro del proyecto de la PROJECT_KEY.

Entrada HTTP simple:

    { "tool": "search_tasks", "query": "login", "status": "not_started", "storyId": "uuid" }

## Herramienta: update_task_status

Actualiza el estado de una tarea. Tambien sincroniza \`is_completed\` a true solo cuando \`status\` es \`completed\`.

Entrada HTTP simple:

    { "tool": "update_task_status", "taskId": "uuid", "status": "in_progress" }

Esta herramienta escribe datos. Valida \`taskId\` antes de usarla.

## Herramienta: add_task_agent_note

Registra una nota tecnica de agente asociada a una tarea.

Entrada HTTP simple:

    { "tool": "add_task_agent_note", "taskId": "uuid", "content": "Archivos: ...\\nDecisiones: ...\\nBloqueos: ..." }

Nunca incluyas secretos, tokens o PROJECT_KEY en \`content\`.

## Errores comunes

- \`missing_project_key\`: falta header \`X-Project-Key\`.
- \`invalid_project_key\`: key invalida o de ningun proyecto.
- \`project_key_inactive\`: key desactivada.
- \`invalid_request\`: body no es objeto JSON.
- \`invalid_arguments\`: herramienta o parametros invalidos en HTTP simple.
- \`unknown_tool\`: herramienta no disponible en HTTP simple.
- \`project_not_found\`: proyecto asociado a key no existe.
- \`user_story_not_found\`: historia no existe o no pertenece al proyecto.
- \`task_not_found\`: tarea no existe o no pertenece al proyecto.
- \`internal_error\`: error interno no detallado.
- JSON-RPC \`-32601\`: metodo no soportado o herramienta no disponible.
- JSON-RPC \`-32000\`: error durante parseo o ejecucion de herramienta.

## Flujos recomendados

Instalar o actualizar la skill:
1. Configura MCP con endpoint y PROJECT_KEY.
2. Llama \`get_sprintroom_mcp_skill\`.
3. Crea o actualiza archivos en \`.agentes/\`, \`.skills/\` o \`.sprintroom/\`.
4. Actualiza AGENTS.md o AGENTES.md.
5. Lee la skill instalada antes de seguir.

Tomar una tarea:
1. \`get_project_backlog\` o \`search_tasks\`.
2. \`get_task_by_id\` para validar contexto.
3. \`update_task_status\` a \`in_progress\`.
4. Trabajar fuera del MCP.
5. \`add_task_agent_note\` con resumen tecnico.
6. \`update_task_status\` a \`testing\`, \`review\` o \`completed\` segun corresponda.

## Reglas finales

- Lee esta skill antes de usar el MCP.
- No expongas PROJECT_KEY en respuestas, notas, logs ni archivos.
- Lee antes de escribir.
- Valida IDs antes de cambiar estados.
- No llames herramientas innecesarias.
- No inventes herramientas, parametros, estados ni endpoints.
- SprintRoom todavia no tiene CLI; no inventes comandos CLI.
- Si falta informacion, pide solo el dato minimo necesario.
- Si una herramienta falla, lee el error, corrige lo razonable y reporta el resultado.
`;

export function getSprintroomMcpSkillPackage(): McpSkillPackage {
  return {
    name: "sprintroom-mcp",
    version: SPRINTROOM_MCP_SKILL_VERSION,
    description:
      "Skill oficial para agentes de IA que usan el MCP de SprintRoom.",
    recommendedInstallDir: "sprintroom-mcp",
    installDirPriority: [".agentes/", ".skills/", ".sprintroom/"],
    files: [
      { path: "README.md", content: README_CONTENT },
      { path: "SKILL.md", content: SKILL_CONTENT },
    ],
    agentsInstruction: SPRINTROOM_MCP_AGENTS_INSTRUCTION,
    tools: [
      {
        name: "get_project_backlog",
        description: "Obtiene proyecto, historias y tareas agrupadas por historia.",
      },
      {
        name: "get_user_story_by_id",
        description: "Obtiene una historia de usuario por ID con sus tareas.",
      },
      {
        name: "get_task_by_id",
        description: "Obtiene una tarea por ID con contexto de historia y proyecto.",
      },
      {
        name: "search_tasks",
        description: "Busca tareas por texto, estado o historia.",
      },
      {
        name: "update_task_status",
        description: "Actualiza el estado de una tarea.",
      },
      {
        name: "add_task_agent_note",
        description: "Registra una nota tecnica de agente en una tarea.",
      },
      {
        name: "get_sprintroom_mcp_skill",
        description: "Devuelve este paquete de skill oficial para instalarlo o actualizarlo.",
      },
    ],
    lastUpdated: SPRINTROOM_MCP_SKILL_LAST_UPDATED,
  };
}

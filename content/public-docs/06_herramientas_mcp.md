---
title: "Herramientas MCP"
order: 6
---

# Herramientas MCP

SprintRoom expone 18 herramientas MCP reales.

## Herramientas de lectura

| Herramienta | Descripción |
|---|---|
| `get_project_backlog` | Obtiene proyecto, historias y tareas agrupadas por historia. |
| `get_user_story_by_id` | Obtiene una historia por ID con sus tareas. |
| `get_task_by_id` | Obtiene una tarea por ID con contexto de historia y proyecto. |
| `search_tasks` | Busca tareas por texto, estado o historia. |
| `get_project_detail` | Obtiene detalle completo del proyecto. |
| `list_project_members` | Lista miembros del proyecto. |
| `list_task_comments` | Lista comentarios de una tarea. |
| `list_task_agent_notes` | Lista notas de agente de una tarea. |
| `get_project_activity` | Obtiene actividad reciente del proyecto. |

## Herramientas de escritura no destructiva

| Herramienta | Descripción |
|---|---|
| `update_task_status` | Actualiza el estado de una tarea. |
| `bulk_update_tasks` | Actualiza estados de varias tareas. |
| `add_task_agent_note` | Registra una nota técnica del agente. |
| `create_task_comment` | Agrega un comentario a una tarea. |
| `create_task` | Crea una tarea dentro de una historia. |
| `create_user_story` | Crea una historia dentro del proyecto. |
| `update_task_details` | Actualiza título o descripción de una tarea. |
| `assign_task` | Reemplaza la lista de usuarios asignados a una tarea. |

## Herramienta de setup

| Herramienta | Descripción |
|---|---|
| `get_sprintroom_mcp_skill` | Devuelve la skill oficial instalable para agentes. |

## get_project_backlog

Obtiene el backlog completo del proyecto asociado a la PROJECT_KEY.

```json
{ "tool": "get_project_backlog" }
```

Devuelve proyecto, historias, tareas por historia, estado de tareas, asignados, conteo de comentarios y notas de agente.

## get_user_story_by_id

```json
{ "tool": "get_user_story_by_id", "userStoryId": "uuid" }
```

Devuelve la historia, progreso y tareas asociadas.

## get_task_by_id

```json
{ "tool": "get_task_by_id", "taskId": "uuid" }
```

Devuelve tarea, historia asociada, proyecto, estado, asignados, comentarios contados y notas de agente.

## search_tasks

```json
{
  "tool": "search_tasks",
  "query": "login",
  "status": "in_progress",
  "storyId": "uuid"
}
```

Todos los filtros son opcionales excepto `tool`.

| Campo | Uso |
|---|---|
| `query` | Busca en título y descripción. |
| `status` | Filtra por estado válido. |
| `storyId` | Filtra por historia de usuario. |

## get_project_detail

```json
{ "tool": "get_project_detail" }
```

Devuelve ID, nombre, descripción, referencia externa, progreso, conteos, miembros y fechas de creación/actualización.

## list_project_members

```json
{ "tool": "list_project_members" }
```

Devuelve `userId`, `fullName`, `email`, `role` y `joinedOnUtc`.

## list_task_comments

```json
{ "tool": "list_task_comments", "taskId": "uuid" }
```

Devuelve comentarios con autor, cuerpo y fecha.

## list_task_agent_notes

```json
{ "tool": "list_task_agent_notes", "taskId": "uuid" }
```

Devuelve notas técnicas creadas por agentes.

## get_project_activity

```json
{ "tool": "get_project_activity", "limit": 20 }
```

`limit` es opcional. El máximo es 50. Si no se envía, SprintRoom usa 20.

## update_task_status

```json
{
  "tool": "update_task_status",
  "taskId": "uuid",
  "status": "review"
}
```

Estados válidos: `not_started`, `in_progress`, `testing`, `review`, `completed`.

## bulk_update_tasks

```json
{
  "tool": "bulk_update_tasks",
  "updates": [
    { "taskId": "uuid-1", "status": "in_progress" },
    { "taskId": "uuid-2", "status": "review" }
  ]
}
```

Restricciones: `updates` es obligatorio, debe ser un arreglo no vacío, máximo 50 tareas por petición y cada estado debe ser válido.

## add_task_agent_note

```json
{
  "tool": "add_task_agent_note",
  "taskId": "uuid",
  "content": "Archivos modificados: ...\nDecisiones: ...\nBloqueos: ..."
}
```

`content` es obligatorio, no puede estar vacío, tiene máximo 10000 caracteres y no debe contener secretos, tokens ni PROJECT_KEYs.

## create_task_comment

```json
{
  "tool": "create_task_comment",
  "taskId": "uuid",
  "body": "Comentario de seguimiento"
}
```

`body` es obligatorio y tiene máximo 2000 caracteres.

## create_task

```json
{
  "tool": "create_task",
  "userStoryId": "uuid",
  "title": "Implementar formulario de login",
  "description": "Crear validación y conexión con API.",
  "assigneeIds": ["uuid-usuario"]
}
```

`userStoryId` y `title` son obligatorios. Los asignados deben existir y pertenecer al proyecto.

## create_user_story

```json
{
  "tool": "create_user_story",
  "title": "Como usuario quiero iniciar sesión",
  "description": "Permitir acceso seguro a la plataforma."
}
```

`title` es obligatorio y tiene máximo 160 caracteres. `description` es opcional y tiene máximo 2000 caracteres.

## update_task_details

```json
{
  "tool": "update_task_details",
  "taskId": "uuid",
  "title": "Nuevo título",
  "description": "Nueva descripción"
}
```

Debes enviar `title`, `description` o ambos.

## assign_task

```json
{
  "tool": "assign_task",
  "taskId": "uuid",
  "assigneeIds": ["uuid-1", "uuid-2"]
}
```

Esta herramienta reemplaza la lista completa de asignados. Envía un arreglo vacío para desasignar a todos.

## get_sprintroom_mcp_skill

```json
{ "tool": "get_sprintroom_mcp_skill" }
```

Devuelve nombre de la skill, versión, archivos a instalar, instrucción para agentes, lista de herramientas y fecha de actualización.

## Errores comunes MCP

| Error | Causa |
|---|---|
| `missing_project_key` | Falta el header `X-Project-Key`. |
| `invalid_project_key` | La clave no existe o no pertenece a ningún proyecto. |
| `project_key_inactive` | La clave fue desactivada. |
| `invalid_request` | El body no es un objeto JSON válido. |
| `tool_error` | La herramienta recibió argumentos inválidos o falló. |
| `rate_limit_exceeded` | Se superó el límite de solicitudes. |
| JSON-RPC `-32601` | Método no soportado. |
| JSON-RPC `-32603` | Error interno o de ejecución. |

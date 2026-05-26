---
title: "Herramientas Avanzadas"
order: 3
---

SprintRoom expone las siguientes herramientas a través del MCP. Usa `tools/list` para descubrirlas dinámicamente.

### get_project_backlog

Obtiene todo el proyecto con sus historias y tareas.

- **Argumentos:** Ninguno. Usa la PROJECT_KEY del header para identificar el proyecto.
- **Ejemplo:**
  ```json
  { "tool": "get_project_backlog" }
  ```

### get_user_story_by_id

Obtiene una historia de usuario por su ID.

- **Argumentos:** `storyId` (string) — ID de la historia.
- **Ejemplo:**
  ```json
  { "tool": "get_user_story_by_id", "storyId": "usr_story_abc123" }
  ```

### get_task_by_id

Obtiene una tarea por su ID.

- **Argumentos:** `taskId` (string) — ID de la tarea.
- **Ejemplo:**
  ```json
  { "tool": "get_task_by_id", "taskId": "task_xyz789" }
  ```

### search_tasks

Busca tareas por texto en el proyecto completo.

- **Argumentos:** `query` (string) — texto a buscar.
- **Ejemplo:**
  ```json
  { "tool": "search_tasks", "query": "bug login" }
  ```

### update_task_status

Actualiza el estado de una tarea.

- **Argumentos:** `taskId` (string), `status` (`not_started` | `in_progress` | `testing` | `review` | `completed`).
- **Ejemplo:**
  ```json
  { "tool": "update_task_status", "taskId": "task_xyz789", "status": "in_progress" }
  ```

### add_task_agent_note

Agrega una nota de agente a una tarea (inmutable).

- **Argumentos:** `taskId` (string), `content` (string).
- **Ejemplo:**
  ```json
  { "tool": "add_task_agent_note", "taskId": "task_xyz789", "content": "Analisis completado." }
  ```

### get_sprintroom_mcp_skill

Obtiene la skill de MCP de SprintRoom (documentación para el agente).

- **Argumentos:** Ninguno.
- **Ejemplo:**
  ```json
  { "tool": "get_sprintroom_mcp_skill" }
  ```

## Versionado del paquete MCP

`@sprintroom/mcp` usa **semver**: PATCH (bugfix), MINOR (nuevas herramientas), MAJOR (breaking changes). Las definiciones de herramientas están incrustadas en el paquete. Si cambian en el backend, el paquete debe actualizarse y publicarse una nueva versión.

> **TODO:** Refactorizar para que `tools/list` consulte la API de SprintRoom y eliminar la duplicación de definiciones.

## Estados de tarea

| Label | Value |
|-------|-------|
| No iniciado | `not_started` |
| En progreso | `in_progress` |
| En pruebas | `testing` |
| En revisión | `review` |
| Completado | `completed` |

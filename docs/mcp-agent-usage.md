# Guía de Uso para Agentes de IA — MCP SprintRoom

Esta guía describe cómo un agente de IA (Claude, Cursor, OpenCode) se conecta a SprintRoom para leer y modificar el backlog del proyecto.

---

## Metodo recomendado: Paquete MCP publico

El metodo preferido es usar el paquete npm `@sprintroom/mcp` como servidor MCP local via stdio. Esto evita configurar headers HTTP manualmente y es compatible con OpenCode, Claude Desktop, Claude Code y Codex.

```bash
npx -y @sprintroom/mcp
```

Requiere dos variables de entorno:
- `SPRINTROOM_API_URL` — URL base de la instancia SprintRoom
- `SPRINTROOM_PROJECT_KEY` — clave de proyecto generada desde la UI

No requiere credenciales de InsForge. Consulta la [documentacion en la UI](/docs) para ejemplos de configuracion en cada herramienta.

---

## Protocolo de Comunicación (HTTP directo)

Si no puedes usar el paquete stdio, el endpoint HTTP soporta **dos protocolos:**

### A. HTTP API simplificada (usada por los prompts de la UI)

```
POST https://tu-dominio/api/mcp
GET  https://tu-dominio/api/mcp   (descubrimiento de herramientas)

Headers:
  Content-Type: application/json
  X-Project-Key: sk_sprintroom_tu_clave

Body:
  { "tool": "nombre_de_herramienta", ...argumentos }

Response exitosa:
  { "data": { ... } }

Response con error:
  { "error": { "code": "codigo", "message": "Descripción" } }
```

### B. JSON-RPC 2.0 (MCP estándar — compatible con OpenCode, Cursor, Claude Desktop)

```
POST https://tu-dominio/api/mcp
Headers:
  Content-Type: application/json
  X-Project-Key: sk_sprintroom_tu_clave

Discovery:
  { "jsonrpc": "2.0", "id": 1, "method": "tools/list" }

Tool call:
  { "jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": { "name": "get_project_backlog", "arguments": {} } }

Initialize (handshake opcional):
  { "jsonrpc": "2.0", "id": 0, "method": "initialize" }
```

> **Nota:** El GET /api/mcp devuelve las herramientas en formato plano para depuración rápida. Para integración real, usa POST con JSON-RPC.

---

## Herramientas Disponibles

### `get_project_backlog`
Obtiene todo el proyecto con sus historias y tareas.

```json
// Request (HTTP simple)
{ "tool": "get_project_backlog" }

// Request (JSON-RPC)
{ "jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": { "name": "get_project_backlog", "arguments": {} } }

// Response
{
  "data": {
    "project": { "id": "...", "name": "...", "progress": 50 },
    "userStories": [
      {
        "id": "...",
        "title": "Como usuario quiero...",
        "tasks": [ { "id": "...", "title": "...", "status": "not_started" } ]
      }
    ]
  }
}
```

### `get_user_story_by_id`
```json
{ "tool": "get_user_story_by_id", "userStoryId": "uuid" }
```

### `get_task_by_id`
```json
{ "tool": "get_task_by_id", "taskId": "uuid" }
```

### `search_tasks`
```json
{ "tool": "search_tasks", "query": "texto", "status": "not_started", "storyId": "uuid" }
```

### `update_task_status`
```json
{ "tool": "update_task_status", "taskId": "uuid", "status": "in_progress" }
```
Estados válidos: `not_started`, `in_progress`, `testing`, `review`, `completed`

### `add_task_agent_note`
```json
{
  "tool": "add_task_agent_note",
  "taskId": "uuid",
  "content": "Archivos modificados: ...\nDecisiones: ...\nBloqueos: ..."
}
```

---

## Configuración Inicial

### Opción 1: Desde la UI del proyecto (recomendado)

1. Ve a la página de detalle del proyecto `/projects/[projectId]`
2. En la sección **Integración con IA (MCP)**, haz clic en **Generar PROJECT_KEY**
3. Copia la clave mostrada (solo se ve una vez)
4. Usa **Copiar prompt seguro** o **Copiar prompt con clave** para configurar tu agente

### Opción 2: No disponible actualmente

SprintRoom todavia no tiene CLI propio para generar PROJECT_KEYs. No inventes comandos de CLI. Usa la UI del proyecto para generar la clave y luego copia el prompt de instalacion MCP + skill.

---

## Seguridad para el Agente

- La PROJECT_KEY es sensible: **nunca la escribas en código, logs, respuestas al usuario o documentación pública**
- La clave solo viaja en el header `X-Project-Key`
- Si recibes un error `invalid_project_key`, no intentes adivinar otras claves
- No compartas datos de un proyecto con otro aunque tengas acceso a múltiples claves
- Si sospechas que una clave se filtró, revócala desde la Configuración del proyecto

---

## Manejo de Errores

| Código | Significado | Acción del agente |
|--------|-------------|-------------------|
| `missing_project_key` | No se envió X-Project-Key | Verificar que PROJECT_KEY esté configurada |
| `invalid_project_key` | Clave incorrecta | Solicitar nueva clave al administrador |
| `project_key_inactive` | Clave desactivada | Solicitar activación |
| `user_story_not_found` | Historia no encontrada | Verificar UUID, puede pertenecer a otro proyecto |
| `task_not_found` | Tarea no encontrada | Verificar UUID, puede pertenecer a otro proyecto |
| `invalid_arguments` | Parámetros inválidos | Revisar el schema de la herramienta |
| `unknown_tool` | Herramienta desconocida | Consultar GET /api/mcp para herramientas válidas |
| `internal_error` | Error interno | Reintentar, si persiste reportar al administrador |

---

## Flujo de Trabajo Recomendado

```
1. get_project_backlog → entender el estado actual
2. get_user_story_by_id → profundizar en una historia prioritaria
3. get_task_by_id → obtener contexto completo de la primera tarea "Sin Empezar"
4. update_task_status("in_progress") → tomar la tarea
5. Implementar el código
6. add_task_agent_note → documentar cambios
7. update_task_status("completed") → completar
8. Repetir desde paso 2
```

### Ejemplo completo

**Usuario:** "Mira las tareas del proyecto e inicia con la Tarea #1"

**Agente:**
1. `GET /api/mcp` → descubre herramientas
2. `POST /api/mcp` con `get_project_backlog` → obtiene backlog
3. Identifica que la Tarea #1 es "Implementar endpoint de login"
4. `POST /api/mcp` con `get_task_by_id` → obtiene contexto
5. `POST /api/mcp` con `update_task_status` → marca como `in_progress`
6. Implementa el código del endpoint de login
7. `POST /api/mcp` con `add_task_agent_note` → documenta cambios
8. `POST /api/mcp` con `update_task_status` → marca como `completed`
9. Responde al usuario: "Tarea #1 completada. Archivos modificados: ..."

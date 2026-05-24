# Integración Kanban/Scrum mediante MCP

## Resumen Ejecutivo

Se construyó un **puente de comunicación directa** entre agentes de IA (Claude, Cursor, OpenCode) y el sistema de gestión ágil de tareas de SprintRoom, utilizando el **Model Context Protocol (MCP)**.

El agente puede:
- Leer el backlog completo del proyecto
- Consultar historias de usuario y tareas con contexto completo
- Buscar tareas por texto, estado o historia
- Actualizar estados de trabajo (`not_started`, `in_progress`, `testing`, `review`, `completed`)
- Registrar notas técnicas sobre cada tarea

Todo aislado por proyecto mediante una **PROJECT_KEY** única.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTE DE IA                              │
│  (Claude / Cursor / OpenCode)                               │
│                                                             │
│  Lee PROJECT_KEY del entorno local                          │
│  Envia POST a /api/mcp con X-Project-Key                    │
│  Protocolo: JSON-RPC 2.0 (o HTTP simple)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ POST /api/mcp
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS BACKEND — /api/mcp/route.ts              │
│                                                             │
│  Detecta protocolo:                                          │
│    ¿jsonrpc:"2.0"? → handler JSON-RPC                       │
│    ¿tool:"..."?    → handler HTTP simple                     │
│                                                             │
│  1. Auth: resolveProjectKey()                                │
│     → SHA-256(key) → busca en project_keys                  │
│     → obtiene projectId                                      │
│                                                             │
│  2. Dispatch: parseToolArgs()                                │
│     → valida tool + parámetros                               │
│     → envía a McpService.{toolName}()                        │
│                                                             │
│  3. Service: McpService                                      │
│     → consulta DB con filtro obligatorio por projectId       │
│     → arma respuesta JSON enriquecida                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS (PostgreSQL)                 │
│                                                             │
│  projects → user_stories → sprint_tasks                     │
│  project_keys (hash)                                        │
│  task_agent_notes                                           │
│                                                             │
│  Toda consulta incluye: WHERE project_id = $1               │
└─────────────────────────────────────────────────────────────┘
```

---

## Protocolos Soportados

### 1. JSON-RPC 2.0 (MCP estándar)

Compatible con OpenCode, Cursor, Claude Desktop y otras herramientas que soporten MCP.

```
POST /api/mcp
X-Project-Key: sk_sprintroom_XXXXXXX

// Inicialización (opcional):
{ "jsonrpc": "2.0", "id": 0, "method": "initialize" }

// Descubrimiento de herramientas:
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }

// Ejecución de herramienta:
{ "jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": { "name": "get_project_backlog", "arguments": {} } }
```

Response exitosa (tools/list):
```json
{ "jsonrpc": "2.0", "id": 1, "result": { "tools": [ { "name": "get_project_backlog", ... } ] } }
```

Response exitosa (tools/call):
```json
{ "jsonrpc": "2.0", "id": 2, "result": { ... datos de la herramienta ... } }
```

Response con error:
```json
{ "jsonrpc": "2.0", "id": 2, "error": { "code": -32000, "message": "task_not_found" } }
```

### 2. HTTP API simplificada

Usada por los prompts generados desde la UI del proyecto.

```
GET  /api/mcp   → descubrimiento de herramientas (formato plano)
POST /api/mcp   → ejecución de herramienta

Body:  { "tool": "nombre", ...args }
Response exitosa:  { "data": { ... } }
Response con error: { "error": { "code": "...", "message": "..." } }
```

---

## Flujo de Trabajo Real

### Ejemplo: "Mira las tareas del proyecto e inicia con la Tarea #1"

**Paso 1:** El agente lee `PROJECT_KEY` del entorno local.

**Paso 2:** El agente descubre herramientas disponibles vía JSON-RPC o HTTP simple.

```json
// GET /api/mcp (HTTP simple) → Response:
{
  "mcpVersion": "mcp-sprintroom-1.0",
  "protocol": "custom-http (JSON-RPC 2.0 tambien soportado via POST)",
  "tools": [
    { "name": "get_project_backlog", "description": "...", "inputSchema": {...} },
    { "name": "get_task_by_id", "description": "...", "inputSchema": {...} },
    { "name": "update_task_status", "description": "...", "inputSchema": {...} }
  ]
}
```

**Paso 3:** El agente envía `get_project_backlog` (formato HTTP simple):

```
POST /api/mcp
X-Project-Key: sk_sprintroom_XXXXXXX

{ "tool": "get_project_backlog" }
```

O en formato JSON-RPC:

```
POST /api/mcp
X-Project-Key: sk_sprintroom_XXXXXXX

{ "jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": { "name": "get_project_backlog", "arguments": {} } }
```

**Paso 4:** El backend:
1. Hashea la PROJECT_KEY con SHA-256
2. Busca en `project_keys` → obtiene `projectId`
3. Consulta `projects`, `user_stories`, `sprint_tasks` filtrando por `projectId`
4. Devuelve JSON con proyecto, historias y tareas agrupadas

**Paso 5:** El agente identifica la Tarea #1 y llama `get_task_by_id`:

```json
{ "tool": "get_task_by_id", "taskId": "uuid-de-la-tarea" }
```

**Paso 6:** El agente analiza los criterios de aceptación y requisitos técnicos, luego marca la tarea como `in_progress`:

```json
{ "tool": "update_task_status", "taskId": "uuid", "status": "in_progress" }
```

**Paso 7:** El agente comienza a programar. Al finalizar, registra una nota:

```json
{
  "tool": "add_task_agent_note",
  "taskId": "uuid",
  "content": "Archivos modificados: /api/mcp/route.ts, /src/lib/mcp/service.ts\nDecision: Se uso discriminacion de union types\nEstado: Implementacion completa"
}
```

**Paso 8:** El agente marca la tarea como `completed`:

```json
{ "tool": "update_task_status", "taskId": "uuid", "status": "completed" }
```

---

## Modelo de Datos

### project_keys

| Columna       | Tipo         | Descripción                                |
|---------------|--------------|--------------------------------------------|
| id            | UUID         | PK                                         |
| project_id    | UUID (FK)    | Proyecto asociado                          |
| key_hash      | TEXT (UNIQUE)| SHA-256 de la PROJECT_KEY                  |
| description   | TEXT         | Descripción de para qué sirve esta clave   |
| is_active     | BOOLEAN      | Si la clave está habilitada                |
| created_on_utc| TIMESTAMPTZ  | Fecha de creación                          |

### task_agent_notes

| Columna       | Tipo         | Descripción                                |
|---------------|--------------|--------------------------------------------|
| id            | UUID         | PK                                         |
| project_id    | UUID (FK)    | Proyecto asociado                          |
| task_id       | UUID (FK)    | Tarea asociada                             |
| content       | TEXT         | Nota del agente (archivos, decisiones, etc)|
| created_on_utc| TIMESTAMPTZ  | Fecha de creación                          |

### sprint_tasks (columna añadida)

| Columna       | Tipo    | Descripción                                    |
|---------------|---------|------------------------------------------------|
| status        | TEXT    | `not_started`, `in_progress`, `testing`, `review`, `completed` |

Las entidades existentes (`projects`, `user_stories`, `sprint_tasks`, `sprint_task_assignments`, `task_comments`, `project_members`) no fueron modificadas estructuralmente.

---

## Seguridad y Aislamiento por PROJECT_KEY

### Principio fundamental

> Ninguna herramienta MCP puede acceder a la base de datos global sin filtrar por PROJECT_KEY.

### Cómo se valida

1. El agente envía la clave en el header `X-Project-Key`
2. El backend calcula `SHA-256(projectKey)` → `key_hash`
3. Busca en `project_keys` donde `key_hash = $hash` y `is_active = true`
4. Si no encuentra → error `invalid_project_key`
5. Si encuentra → obtiene `projectId` de la fila

### Cómo se aísla

Cada método en `McpService` recibe `projectId` como primer parámetro y TODAS las consultas SQL incluyen el filtro:

```typescript
// Ejemplo en getTaskById:
const tasks = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
  filters: [
    { operator: "eq", column: "id", value: args.taskId },
    { operator: "eq", column: "project_id", value: projectId },  // ← SIEMPRE
  ],
});
```

### Cómo se evita fuga de datos

- La validación ocurre ANTES de cualquier operación de datos
- No existe ninguna ruta en MCP que permita acceso sin `projectId`
- Los errores nunca exponen datos de otros proyectos ni claves reales
- `McpAuthenticationError` devuelve mensajes genéricos

### Errores de autenticación

| Código                | Mensaje                                       |
|-----------------------|-----------------------------------------------|
| `missing_project_key` | PROJECT_KEY es obligatorio.                   |
| `invalid_project_key` | La PROJECT_KEY no es válida.                  |
| `project_key_inactive`| La PROJECT_KEY está desactivada.              |

---

## Herramientas MCP Disponibles

### 1. `get_project_backlog`

Obtiene todo el backlog del proyecto.

**Request:**
```json
{ "tool": "get_project_backlog" }
```

**Response:**
```json
{
  "data": {
    "project": {
      "id": "uuid",
      "name": "Mi Proyecto",
      "description": "Descripción",
      "progress": 50
    },
    "userStories": [
      {
        "id": "uuid",
        "title": "Como usuario quiero...",
        "description": "Descripción de la HU",
        "progress": 50,
        "tasks": [
          {
            "id": "uuid",
            "title": "Implementar endpoint",
            "description": "Descripción",
            "status": "in_progress",
            "userStoryId": "uuid",
            "userStoryTitle": "Como usuario quiero...",
            "assigneeIds": ["uuid"],
            "commentCount": 3,
            "agentNotes": [
              {
                "id": "uuid",
                "content": "Archivos modificados: ...",
                "createdOnUtc": "2026-05-23T..."
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Errores:** `project_not_found`

---

### 2. `get_user_story_by_id`

Obtiene una historia de usuario con sus tareas.

**Request:**
```json
{
  "tool": "get_user_story_by_id",
  "userStoryId": "uuid-de-la-historia"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Como usuario quiero...",
    "description": "Descripción",
    "progress": 50,
    "tasks": [...]
  }
}
```

**Errores:** `user_story_not_found`

---

### 3. `get_task_by_id`

Obtiene una tarea con contexto completo (historia + proyecto).

**Request:**
```json
{
  "tool": "get_task_by_id",
  "taskId": "uuid-de-la-tarea"
}
```

**Response:**
```json
{
  "data": {
    "task": {
      "id": "uuid",
      "title": "Implementar endpoint MCP",
      "description": "Crear herramienta get_task_by_id",
      "status": "not_started",
      "assigneeIds": ["uuid"],
      "commentCount": 0,
      "agentNotes": []
    },
    "userStory": {
      "id": "uuid",
      "title": "Como agente quiero leer tareas",
      "description": "Permitir consulta de tareas por ID",
      "progress": 0
    },
    "project": {
      "id": "uuid",
      "name": "SprintRoom"
    }
  }
}
```

**Errores:** `task_not_found`

---

### 4. `search_tasks`

Busca tareas por texto, estado o historia de usuario.

**Request:**
```json
{
  "tool": "search_tasks",
  "query": "endpoint",
  "status": "not_started",
  "storyId": "uuid-opcional"
}
```

**Todos los parámetros son opcionales excepto `tool`.**

**Response:**
```json
{
  "data": {
    "tasks": [...],
    "totalCount": 5
  }
}
```

---

### 5. `update_task_status`

Actualiza el estado de una tarea. Sincroniza automáticamente `is_completed`.

| Estado         | is_completed |
|----------------|-------------|
| `not_started`  | false       |
| `in_progress`  | false       |
| `testing`      | false       |
| `review`       | false       |
| `completed`    | true        |

**Request:**
```json
{
  "tool": "update_task_status",
  "taskId": "uuid",
  "status": "in_progress"
}
```

**Response:**
```json
{
  "data": {
    "taskId": "uuid",
    "previousStatus": "not_started",
    "newStatus": "in_progress"
  }
}
```

**Errores:** `task_not_found`

---

### 6. `add_task_agent_note`

Registra una nota del agente sobre una tarea.

**Request:**
```json
{
  "tool": "add_task_agent_note",
  "taskId": "uuid",
  "content": "Archivos: src/file.ts\nDecisión: Usar un patrón X\nBloqueos: Ninguno\nResumen: Implementación completa"
}
```

**Response:**
```json
{
  "data": {
    "noteId": "uuid",
    "taskId": "uuid",
    "content": "Archivos: src/file.ts...",
    "createdOnUtc": "2026-05-23T..."
  }
}
```

**Errores:** `task_not_found`

---

## Variables de Entorno

| Variable          | ¿Requiere servidor? | Descripción                                           |
|-------------------|---------------------|-------------------------------------------------------|
| `PROJECT_KEY`     | No                  | Clave del proyecto. El agente la lee localmente.      |
| `INSFORGE_URL`    | Sí                  | URL del backend InsForge.                             |
| `INSFORGE_ANON_KEY`| Sí                 | Anon key para el SDK.                                 |

La `PROJECT_KEY` se almacena como **hash SHA-256** en la tabla `project_keys`.
Nunca se guarda el valor en texto plano en la base de datos.

---

---

## Gestión de Claves desde la UI

Las PROJECT_KEYs se gestionan desde la página de detalle del proyecto, en la sección **Integración con IA (MCP)**.

| Operación | Cómo |
|-----------|------|
| **Generar clave** | Escribe una descripción → haz clic en **Generar PROJECT_KEY** → copia la clave mostrada una sola vez |
| **Copiar clave** | Justo después de generar, haz clic en **Copiar clave** (solo visible una vez) |
| **Copiar prompt seguro** | Siempre disponible cuando hay claves activas. Sin clave embebida. |
| **Copiar prompt con clave** | Solo justo después de generar. Con clave embebida y advertencia de seguridad. |
| **Desactivar clave** | En la tabla de claves, haz clic en **Desactivar** al lado de la clave activa. |
| **Rotar clave** | Genera una nueva, distribúyela, desactiva la anterior. |

> **Importante:** Solo Maintainers y Owners pueden generar y desactivar claves. Cualquier miembro puede ver las claves registradas.

---

## Guía de Desarrollo

### Ejecutar localmente

```bash
# 1. Clonar e instalar
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con valores reales

# 3. Iniciar servidor
npm run dev
```

### Probar el endpoint MCP

```bash
# Obtener herramientas disponibles
curl http://localhost:3000/api/mcp

# Obtener backlog (requiere PROJECT_KEY registrada en DB)
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Key: sk_sprintroom_tu_clave" \
  -d '{"tool":"get_project_backlog"}'
```

### Generar una PROJECT_KEY (vía UI — recomendado)

Desde la página de detalle del proyecto → **Integración con IA (MCP)** → **Generar PROJECT_KEY**.

### Generar una PROJECT_KEY (CLI)

No disponible actualmente en SprintRoom. SprintRoom todavia no tiene CLI propio para generar PROJECT_KEYs. No inventes comandos de CLI; usa la UI del proyecto para generar la clave.

### Cómo extender herramientas

1. Agregar tipo en `src/lib/mcp/types.ts` (interfaz de args + respuesta)
2. Agregar método en `src/lib/mcp/service.ts` (siempre con filtro `projectId`)
3. Agregar definición en `src/lib/mcp/tools.ts` (nombre, descripción, inputSchema)
4. Agregar dispatch en `app/api/mcp/route.ts`
5. Agregar parsing en `parseToolArgs` en `tools.ts`

### Cómo agregar nuevos estados o filtros

1. Actualizar el CHECK constraint en la migración SQL
2. Actualizar el tipo `McpTaskStatus` en `types.ts`
3. Actualizar validación en `tools.ts` (`parseToolArgs`)
4. Actualizar filtros en `service.ts` si aplica

---

## Checklist de Seguridad

- [x] Validación de PROJECT_KEY antes de cualquier operación
- [x] Hash SHA-256 — nunca se almacena la clave en texto plano
- [x] Toda consulta SQL incluye filtro por `project_id`
- [x] No existe herramienta que acceda a datos sin `projectId`
- [x] Errores de autenticación no revelan información sensible
- [x] Errores internos se mapean a `internal_error` sin stack trace
- [x] Endpoint POST no expone datos en logs de servidor
- [x] La clave viaja en header, no en query string ni body
- [x] Separación clara entre auth, service y route (SRP)
- [x] No hay dependencias externas nuevas para la integración

---

## Casos de Prueba Recomendados

| # | Prueba | Descripción |
|---|--------|-------------|
| 1 | PROJECT_KEY válida | GET /api/mcp + POST con clave válida deben funcionar |
| 2 | PROJECT_KEY inválida | POST con clave incorrecta → `invalid_project_key` |
| 3 | PROJECT_KEY vacía | POST sin header → `missing_project_key` |
| 4 | PROJECT_KEY inactiva | Clave con `is_active=false` → `project_key_inactive` |
| 5 | Consulta de backlog | `get_project_backlog` devuelve proyecto + historias + tareas |
| 6 | Consulta de tarea por ID | `get_task_by_id` con taskId válido |
| 7 | Consulta de tarea de otro proyecto | taskId válido pero de otro proyecto → `task_not_found` |
| 8 | Búsqueda por estado | `search_tasks` con `status: "not_started"` |
| 9 | Búsqueda por texto | `search_tasks` con `query: "endpoint"` |
| 10 | Actualización de estado | `update_task_status` → verifica cambio + sync is_completed |
| 11 | Nota del agente | `add_task_agent_note` → verifica persistencia |
| 12 | Herramienta desconocida | tool inválida → error controlado |
| 13 | Argumentos inválidos | Falta parámetro requerido → error controlado |
| 14 | Aislamiento | Dos PROJECT_KEYs de diferentes proyectos no deben entremezclar datos |

---

## Limitaciones Actuales y Mejoras Futuras

### Actual
- `acceptance_criteria` y `priority` no existen como columnas separadas en `user_stories` (se usan campos `description` existentes)
- El buscador textual filtra en memoria (no hay `ILIKE` en PostgREST básico)
- No hay rate limiting
- No hay historial de cambios (auditoría) para acciones MCP
- El protocolo JSON-RPC implementa `tools/list` y `tools/call` pero no otros métodos del estándar MCP (como `resources/*`, `prompts/*`, `logging/*`)

### Protocolo MCP: lo que está implementado vs. lo que falta

| Característica MCP | Estado |
|--------------------|--------|
| `tools/list` | ✅ Implementado |
| `tools/call` | ✅ Implementado |
| `initialize` | ✅ Implementado (handshake básico) |
| `resources/*` | ❌ No implementado |
| `prompts/*` | ❌ No implementado |
| `logging/*` | ❌ No implementado |
| Transporte SSE | ❌ Solo HTTP POST |
| Autenticación estándar | ⚠️ Header propio (`X-Project-Key`) en lugar de `Authorization: Bearer` |

> **Conclusión:** El endpoint es un **MCP híbrido** — compatible a nivel de herramientas (tools/list + tools/call) pero sin soporte completo del protocolo estándar. Para uso con OpenCode, Cursor y Claude Desktop, la compatibilidad es suficiente. Clientes MPC completos (como los que esperan recursos, prompts y SSE) no funcionarán.

### Futuro
- [ ] Agregar columnas `acceptance_criteria` y `priority` a `user_stories`
- [ ] Agregar columna `dependencies` a `sprint_tasks`
- [ ] Implementar rate limiting por PROJECT_KEY
- [ ] Auditoría de todas las operaciones MCP
- [ ] Webhooks para notificar cambios a agentes
- [ ] Sincronización con GitHub Issues
- [ ] Integración con Jira, Linear o Trello
- [ ] Bloqueo de tareas simultáneas (evitar que dos agentes trabajen en la misma tarea)
- [ ] Soporte completo del protocolo MCP (resources, prompts, SSE)

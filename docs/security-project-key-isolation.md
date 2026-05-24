# Seguridad — Aislamiento por PROJECT_KEY

## Modelo de Amenazas

### Activos a proteger

1. **Datos del proyecto:** historias de usuario, tareas, comentarios, asignaciones
2. **Claves API:** PROJECT_KEY tiene el mismo nivel de sensibilidad que una API key
3. **Aislamiento entre proyectos:** un agente con clave del Proyecto A no debe ver datos del Proyecto B

### Amenazas identificadas

| Amenaza | Descripción | Severidad |
|---------|-------------|-----------|
| Fuga de PROJECT_KEY | La clave se expone en logs, código o respuestas | Alta |
| Inyección de consultas | Modificar parámetros para acceder a otros proyectos | Alta |
| Suplantación | Un agente malicioso usa otra PROJECT_KEY | Alta |
| Escalado de privilegios | Obtener datos de todos los proyectos desde una clave válida | Crítica |
| Exposición de errores | Mensajes de error revelan existencia o estructura de datos | Media |

---

## Medidas de Mitigación

### 1. Hash de la clave

La PROJECT_KEY **nunca** se almacena en texto plano en la base de datos. Se guarda como `SHA-256(key)`.

```typescript
// src/lib/mcp/auth.ts
export function hashProjectKey(key: string): string {
  return createHash("sha256").update(key, "utf-8").digest("hex");
}
```

### 2. Validación temprana

La validación ocurre en el primer middleware del endpoint, antes de cualquier operación de datos:

```
Request → resolveProjectKey() → ¿válida? → obtiene projectId → recién ahí consulta DB
                                    ↓
                          Error: invalid_project_key
```

### 3. Filtro obligatorio por projectId

Cada método en `McpService` aplica el filtro `project_id` en TODAS las consultas:

```typescript
// Ejemplo de getTaskById en service.ts
const tasks = await this.database.selectRows<SprintTaskRow>("sprint_tasks", {
  filters: [
    { operator: "eq", column: "id", value: args.taskId },
    // ⚠️ Filtro obligatorio de aislamiento:
    { operator: "eq", column: "project_id", value: projectId },
  ],
});
```

- Si el `taskId` existe pero pertenece a otro proyecto → no se encuentra
- Si el `taskId` no existe → no se encuentra
- En ambos casos → `task_not_found` (el agente no sabe si existe o no)

### 4. Sin endpoints sin filtro

No existe ninguna herramienta MCP que acepte operaciones sin `projectId`. La validación es estructural: el `projectId` se resuelve en `auth.ts` y se pasa como primer parámetro a todos los métodos del servicio.

### 5. Errores seguros

Los errores nunca exponen:
- La PROJECT_KEY real o su hash
- La existencia o no de otros proyectos
- Stack traces internos
- Datos parciales de consultas fallidas

```typescript
// En route.ts:
catch (error) {
  if (error instanceof McpAuthenticationError) {
    return mcpError(error.code, error.message); // Mensaje controlado
  }
  // ...
  // Error genérico para todo lo demás:
  return mcpError("internal_error", "Error interno del servidor MCP.");
}
```

### 6. Sin logging de secretos

El endpoint MCP no registra en ningún log el valor de `X-Project-Key`.

### 7. Separación de responsabilidades

La arquitectura separa claramente:
- `auth.ts` — validación de clave y resolución de proyecto
- `service.ts` — lógica de negocio con datos
- `tools.ts` — definiciones y parsing
- `route.ts` — dispatch HTTP

Esto sigue el principio de **Single Responsibility** y facilita auditorías de seguridad.

---

## Permisos de Lectura y Escritura

| Herramienta | Lectura | Escritura | Descripción |
|-------------|---------|-----------|-------------|
| `get_project_backlog` | ✅ | ❌ | Solo lectura del backlog |
| `get_user_story_by_id` | ✅ | ❌ | Solo lectura de historia |
| `get_task_by_id` | ✅ | ❌ | Solo lectura de tarea |
| `search_tasks` | ✅ | ❌ | Búsqueda de solo lectura |
| `update_task_status` | ❌ | ✅ | Escritura de estado |
| `add_task_agent_note` | ❌ | ✅ | Escritura de nota |

Ambos permisos están acotados al proyecto resuelto por `PROJECT_KEY`.

---

## Pruebas de Aislamiento Recomendadas

### Prueba 1: Acceso cruzado entre proyectos

```bash
# 1. Crear dos proyectos con dos PROJECT_KEYs distintas
# 2. Crear una tarea en el Proyecto A con ID conocido
# 3. Con la clave del Proyecto B, intentar leer esa tarea:

curl -X POST /api/mcp \
  -H "X-Project-Key: clave_del_proyecto_B" \
  -d '{"tool":"get_task_by_id","taskId":"uuid-de-tarea-del-proyecto-A"}'

# Resultado esperado: {"error":{"code":"task_not_found","message":"..."}}
```

### Prueba 2: Fuga de datos en listados

```bash
# Con clave del Proyecto A, ejecutar get_project_backlog
# Verificar que NO aparecen historias ni tareas del Proyecto B
```

### Prueba 3: Actualización de estado prohibida

```bash
# Con clave del Proyecto B, intentar actualizar estado de tarea del Proyecto A
# Resultado esperado: task_not_found (la tarea "no existe" para esa clave)
```

---

## Gestión de Claves desde la UI

### Cómo generar una PROJECT_KEY

1. Navega a la página de detalle del proyecto
2. En la sección **Integración con IA (MCP)**, escribe una descripción y haz clic en **Generar PROJECT_KEY**
3. La clave aparece en un banner verde con opciones para copiarla y solo se muestra una vez

### Tipos de prompt copiables

| Botón | ¿Cuándo está visible? | ¿Incluye clave? | Seguridad |
|-------|----------------------|-----------------|-----------|
| **Copiar prompt seguro** | Siempre que haya claves activas | ❌ No | Alto — sin riesgo de exposición |
| **Copiar prompt con clave** | Solo justo después de generar | ✅ Sí | Bajo — solo para configuración inmediata |
| **Copiar clave** | Solo justo después de generar | ✅ Sí (solo la clave) | Usar con precaución |

### Cómo revocar una clave

1. En la misma sección de Integración con IA, localiza la clave en la tabla
2. Haz clic en **Desactivar** al lado de la clave activa
3. La clave se marca como inactiva y ya no puede autenticarse contra el MCP

### Qué hacer si se filtra una clave

1. **Desactivarla inmediatamente** desde la UI (Integración con IA → Desactivar)
2. **Generar una nueva clave** con la misma descripción
3. **Notificar a los agentes** que usaban la clave anterior para que actualicen su configuración
4. La clave filtrada queda registrada como `is_active = false` en la base de datos

### Cómo rotar claves

1. Genera una nueva clave desde la UI
2. Distribuye la nueva clave a los agentes
3. Una vez confirmado que todos los agentes usan la nueva clave, desactiva la anterior

### Requisitos de permiso

| Operación | Rol requerido |
|-----------|---------------|
| Ver claves registradas | Cualquier miembro del proyecto |
| Generar nueva clave | Maintainer u Owner |
| Desactivar clave | Maintainer u Owner |

---

## Resumen de Controles

| Control | Implementación | Archivo |
|---------|---------------|---------|
| Hash de clave | SHA-256 | `src/lib/mcp/auth.ts` |
| Validación temprana | Antes de cualquier query | `app/api/mcp/route.ts` línea 27 |
| Filtro projectId | En cada método del servicio | `src/lib/mcp/service.ts` |
| Errores seguros | Sin stack traces ni datos internos | `app/api/mcp/route.ts` catch |
| Sin logging de claves | No se registra X-Project-Key | — |
| SRP | auth / service / tools separados | `src/lib/mcp/` |
| Sin dependencias externas | Solo crypto nativo de Node.js | `src/lib/mcp/auth.ts` |

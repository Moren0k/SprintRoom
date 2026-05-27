# Auditoría Arquitectónica del Repositorio

## 1. Resumen ejecutivo
La arquitectura está bien encaminada, pero solo parcialmente lista para escalar. El repositorio sí muestra una intención clara de monolito modular con separación entre `src/domain`, `src/application`, `src/lib`, `src/server`, `app/api` y `components`.

Actualmente las tres fases de refactor han resuelto los bypass más urgentes:
- **Fase 1**: toda mutación MCP queda auditada en `audit_events`.
- **Fase 2**: `McpService` delega `get_task_by_id`, `update_task_status` y `add_task_agent_note` a handlers de `application layer`.
- **Fase 3**: la gestión de `project_keys`/`mcp-keys` se extrajo a casos de uso en `src/application/features/project-keys.ts`.

Quedan pendientes: consistencia transaccional, endurecimiento de RLS, constraints de integridad multi-tenant, rate limiting, N+1 en listados y observabilidad estructurada. El sistema sigue sin estar listo para escalado serio sin estos refactors, pero la base de aplicación está consolidada.

Calificaciones:

| Dimensión | Nota |
|---|---:|
| Escalabilidad | 6/10 |
| Mantenibilidad | 7/10 |
| Seguridad | 6/10 |
| Separación de responsabilidades | 7/10 |
| Preparación para IA/MCP | 7/10 |
| Calidad de documentación | 7/10 |
| Calidad de tests | 7/10 |

## 2. Hallazgos positivos
- El repo sí implementa un monolito modular reconocible. La separación principal existe en `src/domain`, `src/application`, `src/lib`, `src/server`, `app/api`, `components` y `tests`.
  Evidencia: `README.md`, `src/application/abstractions/ports.ts`, `src/server/application-scope.ts`.

- La lógica de negocio central de proyectos, historias, tareas, miembros y eliminación vive mayormente en handlers de aplicación y políticas de dominio, no en componentes UI.
  Evidencia: `src/application/features/projects.ts`, `src/application/features/tasks.ts`, `src/application/features/user-stories.ts`, `src/application/features/members.ts`, `src/application/features/deletion.ts`, `src/domain/policies/authorization-policy.ts`.

- Hay encapsulación real de InsForge para la mayor parte del sistema mediante gateway, repositorios, mappers y unit of work.
  Evidencia: `src/lib/insforge/database-gateway.ts`, `src/lib/insforge/repositories.ts`, `src/lib/insforge/unit-of-work.ts`, `src/server/application-scope.ts`.

- Las API routes principales sí reutilizan casos de uso y validaciones compartidas.
  Evidencia: `app/api/projects/route.ts`, `app/api/tasks/route.ts`, `app/api/tasks/[sprintTaskId]/route.ts`, `app/api/projects/[projectId]/members/route.ts`, `src/server/http.ts`, `src/server/validation.ts`.

- Hay enforcement server-side de sesión para la mayoría de operaciones de negocio.
  Evidencia: `src/server/application-scope.ts`, `src/lib/auth/request-auth.ts`, uso de `createAuthenticatedApplicationScope()` en `app/api/**`.

- El dominio captura reglas importantes y no triviales: permisos por rol, confirmación exacta para borrado, estados válidos y comentarios inmutables.
  Evidencia: `src/domain/enums/task-status.ts`, `src/domain/policies/authorization-policy.ts`, `src/domain/services/deletion-confirmation-policy.ts`, `src/lib/insforge/unit-of-work.ts`.

- Hay auditoría para muchas operaciones mutantes del API HTTP tradicional.
  Evidencia: `src/lib/audit/audit-logger.ts`, llamadas en `app/api/projects/route.ts`, `app/api/projects/[projectId]/route.ts`, `app/api/tasks/route.ts`, `app/api/tasks/[sprintTaskId]/comments/route.ts`.

- El modelo de datos sí tiene migraciones, claves foráneas, índices y timestamps.
  Evidencia: `migrations/20260522223731_application-core-schema.sql`, `migrations/20260523111500_audit-and-comment-retention.sql`, `migrations/20260523120000_project-keys-and-agent-notes.sql`.

- Existe cobertura de tests unitaria relevante en dominio, aplicación, audit, auth y adaptadores InsForge, y hoy pasa completa.
  Evidencia: `tests/domain/**`, `tests/application/**`, `tests/lib/**`; ejecución real: `npm test` pasó con `21` archivos y `41` tests.

## 3. Hallazgos críticos

### Resueltos (Fase 1-3)

- ~~El MCP no reutiliza los mismos casos de uso que el API; implementa lógica paralela y escribe directo a base de datos.~~
  **RESUELTO (Fase 2).** `McpService` ahora delega `get_task_by_id`, `update_task_status` y `add_task_agent_note` a handlers en `src/application/features/tasks.ts`. El `runHandler()` wrapper captura `ApplicationError` y lo convierte a `McpServiceError`.

- ~~Las operaciones mutantes del MCP no registran auditoría ni trazabilidad del actor técnico que las ejecutó.~~
  **RESUELTO (Fase 1).** `McpService.updateTaskStatus()` y `McpService.addTaskAgentNote()` registran `audit_events` con `projectKeyId`, tool, argumentos sanitizados, `entityType`, `entityId`, resultado y error. Ver `src/lib/mcp/service.ts`.

- ~~Hay bypass del application layer en gestión de `mcp-keys`.~~
  **RESUELTO (Fase 3).** Las rutas `app/api/projects/[projectId]/mcp-keys/**` ahora delegan en `ListProjectMcpKeysHandler`, `CreateProjectMcpKeyHandler`, `DeactivateProjectMcpKeyHandler` y `DeleteProjectMcpKeyHandler` en `src/application/features/project-keys.ts`. El hashing, la validación de permisos y la persistencia están encapsulados en la capa de aplicación.

### Pendientes

- La consistencia de persistencia no tiene transacciones reales; el propio unit of work lo documenta.
  Evidencia: comentario explícito en `src/lib/insforge/unit-of-work.ts`; múltiples escrituras secuenciales en `saveChanges()`.
  Impacto: alto. Operaciones multi-tabla pueden quedar parcialmente aplicadas en fallos intermedios, especialmente `PlanProjectFromIdeaHandler`, creación de proyectos con miembros y persistencia de tareas/comentarios.
  Recomendación: introducir soporte transaccional real o compensación explícita por flujo crítico.

- Las políticas RLS finales siguen siendo demasiado permisivas para lectura en varias tablas.
  Evidencia: `migrations/20260523210000_rls-proper-policies.sql` define `projects_select`, `user_stories_select`, `sprint_tasks_select`, `project_members_select`, `task_comments_select`, `task_agent_notes_select`, `audit_events_select` con `request_user_id() IS NOT NULL`.
  Impacto: alto. Si en el futuro se usa el SDK desde cliente o se expone una credencial/token con alcance de usuario, un usuario autenticado podría leer datos cruzados que hoy solo están protegidos por la capa de aplicación.
  Recomendación: alinear RLS con membresía real por proyecto, no solo con "usuario autenticado".

- Existen riesgos de integridad multi-tenant a nivel de base de datos.
  Evidencia: `migrations/20260522223731_application-core-schema.sql` modela `sprint_tasks(project_id, user_story_id)` y `task_agent_notes(project_id, task_id)` sin constraint que garantice coherencia cross-tabla.
  Impacto: alto para consistencia de datos.
  Recomendación: agregar triggers de integridad que validen que `sprint_tasks.project_id` coincida con `user_stories.project_id` y que `task_agent_notes.project_id` coincida con `sprint_tasks.project_id`.
  **NOTA (Fase 4A):** Ya existe la migración `20260526120000_cross-table-project-consistency.sql` con triggers. Falta aplicarla en el entorno real y verificar que no hay datos inválidos preexistentes.

- El listado de proyectos tiene patrón N+1 y no escala bien.
  Evidencia: `src/application/features/projects.ts` en `ListProjectsHandler.handle()` itera proyectos y consulta historias y tareas por proyecto.
  Impacto: medio-alto con crecimiento de tenants/proyectos.
  Recomendación: pasar esa vista a un read model agregado o a una consulta optimizada.

- Auth público (login/register) aún implementa lógica directa en rutas sin pasar por handlers de aplicación.
  Evidencia: `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`.
  Impacto: medio en mantenibilidad.
  Recomendación: extraer a casos de uso compartidos (post-Fase 3).

## 4. Comparación contra recomendaciones

| Recomendación | Estado actual | Evidencia | Riesgo | Qué falta |
|---|---|---|---|---|
| 1. Monolito modular bien organizado | Cumple parcialmente | `src/domain`, `src/application`, `src/lib`, `src/server`, `app/api` | Medio | Auth público aún salta capas |
| 2. Separación clara UI/API/application/domain/infra/MCP | Cumple | `src/server/application-scope.ts`, `app/api/**`, `src/lib/mcp/**` | Medio-Bajo | --- |
| 3. MCP, API y Server Actions reutilizan mismos casos de uso | Cumple parcialmente | API usa handlers; **MCP ahora usa handlers** para `get_task_by_id`, `update_task_status`, `add_task_agent_note`; Server Action solo `src/lib/auth/oauth-actions.ts` | Medio | Unificar auth público con application layer |
| 4. Lógica de negocio no duplicada ni regada | Cumple | MCP ya no duplica lógica de tasks; `mcp-keys` ya no duplica permisos ni hashing | Medio-Bajo | Auth público aún repite lógica de registro/login |
| 5. InsForge encapsulado en adaptadores/repositorios | Cumple | `src/lib/insforge/**` bien encapsulado; excepciones históricas corregidas | Medio | AI routes (`app/api/imagine/compile`) aún tienen algo de lógica directa |
| 6. Permisos siempre en servidor | Cumple parcialmente | `createAuthenticatedApplicationScope()`, `ProjectAccess`, policies de dominio | Medio | MCP usa PROJECT_KEY como permiso total del proyecto sin política funcional adicional |
| 7. Server Actions validan sesión/input/ownership/permisos | No aplica | Solo existe `src/lib/auth/oauth-actions.ts` | Bajo | Si se agregan acciones de negocio, deben seguir el mismo estándar del API |
| 8. Tools MCP con validación, permisos, auditoría, errores y respuestas predecibles | Cumple | Validación en `src/lib/mcp/tools.ts`; **auditoría obligatoria** para mutaciones; errores controlados en `app/api/mcp/route.ts` | Medio | Permisos más finos por herramienta y confirmación humana para acciones riesgosas |
| 9. Buen modelo de datos | Cumple parcialmente | Migraciones, FKs, índices, timestamps; **nuevos triggers de consistencia cross-project** | Medio | Falta soft delete general y RLS más estricta |
| 10. Estrategia clara para IA | Cumple parcialmente | Flujo de idea a proyecto en `app/api/imagine/*` y `src/application/features/imagine.ts` | Alto | MCP aún puede ejecutar escrituras sin confirmación humana explícita |
| 11. Observabilidad mínima | Cumple parcialmente | `audit_events`, `src/lib/audit/audit-logger.ts`, `console.error` en AI routes | Medio-Alto | Falta logging estructurado y trazabilidad MCP/IA extremo a extremo |
| 12. Contratos compartidos | Cumple parcialmente | DTOs en `src/application/models/application-dtos.ts`; validadores en `src/server/validation.ts` | Medio | Tipos duplicados en `src/frontend/types.ts` y contratos MCP separados sin source of truth común |
| 13. Tests relevantes | Cumple | `tests/domain/**`, `tests/application/**`, `tests/lib/**` — **57 tests** | Medio | Faltan tests de API routes, integración real con InsForge y flujos AI/chat |
| 14. Documentación real y actualizada | Cumple parcialmente | `README.md`, `docs/**`, `.agents/skills/sprintroom-mcp/SKILL.md` | Medio | Falta documento único de arquitectura y matriz de permisos completa |

## 5. Mapa real de arquitectura actual
Árbol resumido:

```text
app/
  (app)/
    projects/[projectId]/page.tsx
    tasks/page.tsx
  api/
    auth/*
    projects/*
    tasks/*
    user-stories/*
    mcp/route.ts
    imagine/*
components/
  project-detail-client.tsx
  tasks-client.tsx
src/
  application/
    abstractions/
    features/
    models/
  domain/
    aggregates/
    entities/
    enums/
    policies/
    services/
    value-objects/
  frontend/
    api-client.ts
    types.ts
  lib/
    audit/
    auth/
    insforge/
    mcp/
    read-models/
  server/
    application-scope.ts
    http.ts
    validation.ts
migrations/
packages/
  sprintroom-mcp/
tests/
docs/
```

Cómo está organizado realmente:
- UI/presentación: `app/(app)/**`, `components/**`, `src/frontend/**`.
- API routes: `app/api/**`.
- Server Actions: solo `src/lib/auth/oauth-actions.ts`.
- Application layer: `src/application/**`.
- Dominio: `src/domain/**`.
- Infraestructura/InsForge: `src/lib/insforge/**`, `src/lib/insforge-server.ts`.
- MCP: `app/api/mcp/route.ts`, `src/lib/mcp/**`, `scripts/mcp-server.ts`, `packages/sprintroom-mcp/src/index.ts`.
- Auth/permisos: `src/lib/auth/**`, `src/application/features/project-access.ts`, `src/domain/policies/**`.
- Read models CQRS-lite: `src/lib/read-models/dashboard.ts`.

## 6. Flujo real de datos y acciones
Flujo API normal de una tarea:

`UI -> /api/tasks* -> createAuthenticatedApplicationScope() -> handler de aplicación -> ProjectAccess/policies -> repositorios -> InsForge gateway`

Ejemplo real:
- `components/tasks-client.tsx` llama `apiRequest('/api/tasks/:id')`.
- `app/api/tasks/[sprintTaskId]/route.ts` resuelve sesión y ejecuta `GetSprintTaskDetailHandler` o `UpdateTaskStatusHandler`.
- `src/application/features/tasks.ts` valida estado, existencia, visibilidad y permisos.
- `src/lib/insforge/repositories.ts` y `src/lib/insforge/unit-of-work.ts` persisten en InsForge.

Flujo API de proyecto:
- `components/project-detail-client.tsx` usa `apiRequest('/api/projects/:id')`, `/members`, `/user-stories`, `/mcp-keys`.
- Las rutas de proyecto, miembros e historias reutilizan handlers de `src/application/features/**`.
- Excepción: `mcp-keys` no usa handlers de aplicación y toca InsForge directo.

Flujo MCP real:

`Agente -> /api/mcp -> resolveProjectKey() -> parseToolArgs() -> McpService -> InsForge gateway`

No pasa por `createAuthenticatedApplicationScope()`, no usa `ProjectAccess`, no usa handlers de aplicación y no audita escrituras.

Reutilización real de casos de uso:
- UI + API HTTP tradicional: sí.
- MCP + API: no.
- Server Actions + API: prácticamente no aplica porque solo existe una action OAuth.

## 7. Evaluación del MCP
Dónde vive:
- Backend HTTP: `app/api/mcp/route.ts`
- Definiciones/parseo: `src/lib/mcp/tools.ts`, `src/lib/mcp/types.ts`
- Servicio MCP: `src/lib/mcp/service.ts`
- Skill runtime: `src/lib/mcp/skill.ts`
- Servidor stdio interno: `scripts/mcp-server.ts`
- Cliente público MCP: `packages/sprintroom-mcp/src/index.ts`

Evaluación:
- Validación de input: sí existe y es explícita en `src/lib/mcp/tools.ts`.
- Validación de permisos: parcial. Solo se valida `X-Project-Key` y aislamiento por `projectId`; no hay autorización funcional por herramienta ni confirmación humana para acciones riesgosas.
- Auditoría: no existe para `update_task_status` ni `add_task_agent_note`.
- Manejo de errores: razonablemente controlado y predecible para agentes.
- Respuestas: predecibles, con `content[{type:"text"}]` en JSON-RPC y `{data}` en HTTP simple.
- Acoplamiento a InsForge: alto. `McpService` consulta y escribe directo con `InsForgeDatabaseGateway`.
- Reuso de lógica de aplicación: no.

Riesgos principales:
- Canal de escritura paralelo al producto.
- Sin rastro de qué `PROJECT_KEY` escribió qué.
- Sin aprobación explícita para cambios de estado.
- Búsqueda textual en memoria en `searchTasks()`, lo que escala mal por proyecto.

## 8. Evaluación de InsForge y base de datos
Uso del SDK:
- Infra principal encapsulada en `src/lib/insforge/database-gateway.ts`.
- Cliente servidor con API key en `src/lib/insforge/client.ts`.
- Cliente auth con token/sesión en `src/lib/insforge-server.ts`.

Estado del modelo:
- Migraciones: sí, bajo `migrations/`.
- Constraints: PK/FK básicas, `unique(email)`, `unique(key_hash)`, check de `status`.
- Índices: sí, varios índices FK y de auditoría.
- Timestamps: sí, `created_on_utc` y `updated_on_utc` en tablas principales.
- Ownership/multi-tenant: sí a nivel de `project_id` en historias, tareas, keys y agent notes; el proyecto es la frontera de tenant.
- Soft delete: no generalizado. Hay hard delete para proyecto, historia, tarea y key; solo se retienen comentarios de tarea en `retained_task_comments`.

Debilidades del modelo:
- No hay constraint que garantice coherencia entre `sprint_tasks.project_id` y `user_stories.project_id`.
- No hay constraint que garantice coherencia entre `task_agent_notes.project_id` y `sprint_tasks.project_id`.
- No hay política de soft delete general para entidades principales.
- El backend usa API key y por diseño evita RLS para operaciones de servidor; eso exige una capa de aplicación rigurosa, hoy incompleta en algunos flujos.

## 9. Evaluación de seguridad
Auth y sesión:
- La mayoría del API usa `createAuthenticatedApplicationScope()` y `resolveRequestSessionFromRequest()`.
- El login y registro públicos dependen directamente de InsForge auth y luego sincronizan usuario local.
  Evidencia: `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`.

Permisos server-side:
- Buenos en handlers normales gracias a `ProjectAccess`, `AuthorizationPolicy` y `VisibilityPolicy`.
- Insuficientes como arquitectura uniforme porque `mcp-keys` implementa permisos aparte y el MCP no reutiliza esa capa.

Acciones destructivas:
- Hay confirmación por nombre exacto para proyecto, historia, tarea y borrado de key.
  Evidencia: `src/application/features/deletion.ts`, `app/api/projects/[projectId]/mcp-keys/[keyId]/route.ts`.

Riesgos:
- Sin rate limiting aparente en auth ni MCP.
- Las rutas `mcp-keys` lanzan `Error` genérico, lo que deriva en `500 internal_error` vía `handleRouteError()` en varios casos de autorización/negocio.
- La única Server Action acepta `provider` libre sin whitelist en servidor.
  Evidencia: `src/lib/auth/oauth-actions.ts`.

## 10. Evaluación de tests
Qué existe:
- Dominio: agregados, value objects, políticas, servicios.
- Aplicación: `accounts`, `projects`, `tasks`, `members`, `user-stories`, `deletion`.
- Infraestructura: `audit`, `auth`, `insforge`, `read-models`.

Qué no cubre:
- API routes HTTP.
- `/api/mcp` end to end.
- Permisos RLS reales en base de datos.
- Integración real con InsForge.
- Flujos `mcp-keys`.
- Flujos AI `/api/imagine/*` y `/api/chat`.

Qué agregaría primero:
1. Tests de `/api/mcp` para lectura, escritura, errores y aislamiento por `PROJECT_KEY`.
2. Tests de rutas `mcp-keys` con matriz de roles.
3. Tests de integración de `unit-of-work` contra entorno real o efímero.
4. Tests de auth pública y callback OAuth.
5. Tests de regresión para auditoría obligatoria en todas las mutaciones.

## 11. Evaluación de documentación
Qué existe:
- `README.md`
- `AGENTS.md`
- `.agents/skills/sprintroom-mcp/SKILL.md`
- múltiples docs en `docs/`

Qué está bien:
- La existencia de documentación de negocio, MCP, seguridad y frontend es superior al promedio.

Qué está desactualizado o inconsistente:
- `README.md` menciona `packages/sprintroom-mcp/src/definitions.ts`, pero ese archivo no existe; en `packages/sprintroom-mcp/src/` solo está `index.ts`.
- Varios docs muestran problemas de codificación/mojibake.
  Evidencia: `docs/mcp-agent-usage.md`, `docs/mcp-kanban-scrum-integration.md`, `.env.example`.
- No hay un documento único y vigente que describa la arquitectura operativa real incluyendo excepciones como `mcp-keys`, auth directa y bypass del application layer.

Qué falta:
- Documento de arquitectura técnica consolidado.
- Matriz de permisos completa por canal: UI/API/MCP.
- Estrategia explícita de auditoría IA.
- Política de evolución de esquema y consistencia transaccional.

## 12. Plan recomendado de implementación

### Fase 1 — Alto impacto / bajo riesgo
- Objetivo: cerrar huecos de auditoría y contratos sin rehacer el sistema.
  Archivos probables a tocar: `app/api/mcp/route.ts`, `src/lib/mcp/service.ts`, `src/server/http.ts`, `src/frontend/types.ts`, `src/application/models/application-dtos.ts`.
  Riesgo: bajo-medio.
  Prioridad: alta.
  Dependencias: ninguna.
  Criterio de terminado: toda mutación MCP queda auditada; contratos duplicados identificados o unificados; errores de negocio dejan de caer como `500`.

### Fase 2 — Refactor estructural
- Objetivo: hacer que MCP, `mcp-keys` y auth pública usen casos de uso compartidos.
  Archivos probables a tocar: `src/application/features/*`, `app/api/mcp/route.ts`, `app/api/projects/[projectId]/mcp-keys/**`, `app/api/auth/*`.
  Riesgo: medio.
  Prioridad: alta.
  Dependencias: fase 1 recomendada.
  Criterio de terminado: no quedan mutaciones de negocio relevantes implementadas directo en routes o servicios MCP ad hoc.

### Fase 3 — Seguridad y auditoría
- Objetivo: endurecer RLS, permisos de IA y trazabilidad.
  Archivos probables a tocar: `migrations/*`, `src/lib/mcp/auth.ts`, `src/lib/mcp/service.ts`, `src/lib/audit/audit-logger.ts`, docs de seguridad.
  Riesgo: medio-alto.
  Prioridad: alta.
  Dependencias: fase 2 parcial.
  Criterio de terminado: RLS por membresía real, auditoría MCP completa y acciones riesgosas con confirmación explícita.

### Fase 4 — Escalabilidad de producto
- Objetivo: reducir N+1, mejorar consistencia y observabilidad.
  Archivos probables a tocar: `src/application/features/projects.ts`, `src/lib/read-models/dashboard.ts`, `src/lib/insforge/unit-of-work.ts`, `migrations/*`.
  Riesgo: medio-alto.
  Prioridad: media.
  Dependencias: fases 2 y 3.
  Criterio de terminado: consultas agregadas optimizadas, estrategia transaccional definida y logging estructurado operativo.

## 13. Lista de tareas accionables
- [ ] Auditar todas las mutaciones MCP en `audit_events`
  Archivos/rutas: `app/api/mcp/route.ts`, `src/lib/mcp/service.ts`, `src/lib/mcp/auth.ts`
  Motivo: hoy el canal IA puede escribir sin rastro auditable.
  Criterio de terminado: cada `tools/call` mutante guarda actor técnico, `projectKeyId`, tool, entidad y timestamp.

- [ ] Extraer `project_keys` a casos de uso de aplicación
  Archivos/rutas: `app/api/projects/[projectId]/mcp-keys/**`, `src/application/features/`
  Motivo: hoy la ruta mezcla permisos, hashing y persistencia directa.
  Criterio de terminado: las rutas solo validan input y delegan a handlers compartidos.

- [ ] Rehacer `McpService` para invocar handlers de aplicación
  Archivos/rutas: `src/lib/mcp/service.ts`, `src/application/features/tasks.ts`, `src/application/features/projects.ts`
  Motivo: eliminar lógica paralela y divergencia funcional.
  Criterio de terminado: al menos `get_task_by_id`, `update_task_status` y `add_task_agent_note` reutilizan casos de uso comunes.

- [ ] Endurecer RLS de lectura por membresía real
  Archivos/rutas: `migrations/*rls*.sql`
  Motivo: las políticas actuales permiten lectura amplia a cualquier usuario autenticado.
  Criterio de terminado: `SELECT` sobre proyectos, historias, tareas, miembros, comments y notes exige pertenencia al proyecto.

- [ ] Agregar constraints compuestos de integridad multi-tenant
  Archivos/rutas: `migrations/*`
  Motivo: hoy hay consistencia cross-project solo por código.
  Criterio de terminado: la DB impide tareas con `project_id` inconsistente respecto a su historia y notas inconsistentes respecto a su tarea.

- [ ] Cubrir `/api/mcp` con tests automatizados
  Archivos/rutas: `tests/`, potencialmente `tests/api/` o `tests/mcp/`
  Motivo: hoy no hay verificación automática del canal IA más sensible.
  Criterio de terminado: tests cubren tools/list, lectura, escritura, errores y aislamiento por proyecto.

- [ ] Reemplazar `Error` genérico por errores tipados en `mcp-keys`
  Archivos/rutas: `app/api/projects/[projectId]/mcp-keys/**`, `src/application/abstractions/application-error.ts`
  Motivo: errores de negocio hoy escalan como `500`.
  Criterio de terminado: respuestas de autorización/validación devuelven códigos controlados.

- [ ] Unificar DTOs entre `src/application` y `src/frontend`
  Archivos/rutas: `src/application/models/application-dtos.ts`, `src/frontend/types.ts`
  Motivo: hoy hay duplicación manual de contratos.
  Criterio de terminado: el frontend importa tipos compartidos o esquemas generados desde una sola fuente.

- [ ] Documentar arquitectura real, no solo la ideal
  Archivos/rutas: `docs/architecture-audit.md`, `README.md`, nuevos docs de arquitectura/permisos si se decide
  Motivo: la documentación actual es amplia pero parcialmente desalineada.
  Criterio de terminado: existe un documento vigente con capas, excepciones, permisos y flujos MCP/IA.

- [ ] Diseñar estrategia transaccional o compensatoria para `saveChanges()`
  Archivos/rutas: `src/lib/insforge/unit-of-work.ts`, `src/application/features/imagine.ts`
  Motivo: hoy hay riesgo de escrituras parciales.
  Criterio de terminado: existe soporte transaccional real o un mecanismo documentado y probado de compensación.

## 14. Conclusión
El repositorio no está lejos de una arquitectura escalable, pero tampoco está listo todavía. La base es buena porque sí existe un núcleo de dominio y aplicación razonablemente separado, con tests útiles y una convención de composición consistente para la mayoría del API.

El primer cambio que haría es sacar el MCP del camino paralelo y obligarlo a pasar por casos de uso compartidos con auditoría obligatoria. No rehacería todavía toda la UI ni intentaría microservicios; ese no es el cuello de botella real. La decisión arquitectónica más urgente es definir un único camino autorizado para mutaciones de negocio, porque hoy el sistema tiene dos: el API tradicional y el canal MCP directo.

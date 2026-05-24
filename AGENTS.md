---
description: Instructions building apps with MCP
globs: *
alwaysApply: true
---

# InsForge SDK Documentation - Overview

## Skill del MCP de Sprintroom

La skill ubicada en `.sprintroom/sprintroom-mcp/` es la fuente oficial de documentacion del MCP de Sprintroom dentro de este repositorio. El prompt de instalacion del MCP que se copia desde la UI debe instalar/configurar el MCP y tambien instalar esta skill en el proyecto del usuario.

Antes de usar el MCP de Sprintroom, todo agente debe leer la skill ubicada en `.sprintroom/sprintroom-mcp/`. La documentacion de `.sprintroom/sprintroom-mcp/SKILL.md` tiene prioridad antes de llamar herramientas del MCP de Sprintroom. No se deben inventar herramientas, argumentos, endpoints, estados ni comportamientos no documentados en la skill y en el codigo real del MCP.

El prompt de instalacion del MCP no debe incrustar toda la skill. Debe instalar/configurar el MCP y luego indicar al agente que llame la herramienta real `get_sprintroom_mcp_skill` para obtener la version actual de la skill. Si el MCP cambia, esta skill debe actualizarse en el mismo cambio y solo debe documentar herramientas que existan en `src/lib/mcp/tools.ts` y `src/lib/mcp/types.ts`. Si cambia la skill, tambien debe actualizarse `src/lib/mcp/skill.ts`, que es la fuente runtime que devuelve `get_sprintroom_mcp_skill`. SprintRoom todavia no tiene CLI; no documentes comandos CLI inexistentes.

## InsForge en este proyecto

SprintRoom usa **InsForge** como Backend-as-a-Service con PostgreSQL (via PostgREST) y autenticación (email/password + OAuth).

El SDK ya está instalado y configurado. Los clientes se crean en `src/lib/insforge/client.ts`. No necesitas descargar templates ni instalar el SDK.

### Reglas al usar InsForge

- Las operaciones de base de datos usan `InsForgeDatabaseGateway` desde `src/lib/insforge/database-gateway.ts`.
- El patrón `InsForgeUnitOfWork` coordina persistencia multi-tabla (sin transacciones reales).
- Toda consulta incluye filtro por `project_id` para aislamiento multi-tenencia.
- La autenticación usa `createAuthenticatedApplicationScope()` en las API routes.
- Las variables de entorno requeridas están en `.env.example`: `INSFORGE_URL`, `INSFORGE_ANON_KEY`, `INSFORGE_API_KEY`.

## InsForge MCP Tools disponibles en este proyecto

Este proyecto tiene configurado el MCP de InsForge (`@insforge/mcp`) en `opencode.json`. Úsalo para:

- `get-backend-metadata` — Obtener metadata del backend
- `run-raw-sql` — Ejecutar SQL directamente
- `get-table-schema` — Ver esquema de tablas
- `create-bucket`, `list-buckets`, `delete-bucket` — Gestión de storage buckets
- `create-function`, `update-function`, `delete-function` — Edge functions
- `create-deployment` — Deploy frontend

No uses estos MCP tools para lógica de aplicación (CRUD de datos, auth, storage uploads). Esas se hacen desde el código con `@insforge/sdk`.

## Convenciones del proyecto

- **Tailwind CSS**: Versión 4 (según `package.json`). Usa el pipeline de PostCSS con `@tailwindcss/postcss`.
- **TypeScript**: Strict mode habilitado.
- **Testing**: Vitest, pruebas en `tests/`. Ejecutar con `npm test`.
- **Separación de capas**: `src/domain` sin dependencias externas; `src/application` depende solo de domain; `src/lib` es la única capa que conoce InsForge.
- **Server Actions**: Solo si es estrictamente necesario. Actualmente solo existe `src/lib/auth/oauth-actions.ts`. Preferir API routes para operaciones de escritura.
- **API routes**: Usan handlers desde `src/application/features/` y el patrón `createAuthenticatedApplicationScope`. Validación con `requireString`/`requireUuid`. Respuestas con `ok()`/`noContent()`/`handleRouteError()`.
- **TaskStatus**: Los 5 estados válidos son `not_started`, `in_progress`, `testing`, `review`, `completed`. Definidos en `src/domain/enums/task-status.ts`.
- **Comentarios**: Inmutables (no se editan ni eliminan).
- **Eliminación**: Requiere confirmación escribiendo el nombre exacto (`confirmationName`).
- **Frontend**: Usa `apiRequest` desde `src/frontend/api-client.ts`. No hay fetch directo.

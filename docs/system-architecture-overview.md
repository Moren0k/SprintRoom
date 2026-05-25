# Diagrama general del sistema

Archivo principal:
- [docs/system-architecture-overview.puml](C:\Users\JhosAgudelo\Documents\JhosKevinAgudelo\sprintroom\docs\system-architecture-overview.puml)

## Qué muestra
Este PlantUML resume el repositorio real en un solo mapa:

1. Capa de presentación.
   Incluye páginas `app/(app)`, `app/(auth)`, componentes cliente y `src/frontend/api-client.ts`.

2. API routes reales.
   Incluye auth, account, admin, projects, members, stories, tasks, comments, MCP, `mcp-keys` y endpoints AI.

3. Capa de aplicación.
   Incluye handlers de cuentas, proyectos, miembros, historias, tareas, eliminación e imagine.

4. Dominio.
   Incluye aggregates, entities, value objects, enums, policies y servicios.

5. Infraestructura.
   Incluye auth server-side, audit logger, env, InsForge gateway, repositories, mappers, unit of work y read models.

6. MCP completo.
   Incluye:
   - `/api/mcp`
   - `src/lib/mcp/*`
   - `scripts/mcp-server.ts`
   - `packages/sprintroom-mcp/src/index.ts`

7. Base de datos.
   Incluye tablas reales de migraciones: `users`, `projects`, `project_members`, `user_stories`, `sprint_tasks`, `sprint_task_assignments`, `task_comments`, `audit_events`, `retained_task_comments`, `project_keys`, `task_agent_notes`.

8. Seguridad, tests y documentación.
   También marca migraciones RLS, smoke tests MCP y documentos clave.

## Cómo leerlo
- El flujo saludable del sistema está modelado como:
  `UI/API -> handler de aplicación -> dominio -> repositorios -> InsForge`

- El diagrama también marca explícitamente los desvíos importantes:
  - MCP no reutiliza handlers de aplicación.
  - `mcp-keys` toca la base directo desde routes.
  - `unit-of-work` no tiene transacción real.
  - Hay tipos duplicados entre frontend, application y MCP.

## Para qué sirve
Úsalo como mapa maestro para:
- entender cómo viajan las peticiones;
- ubicar responsabilidades por capa;
- revisar deuda técnica;
- planear refactors grandes;
- discutir arquitectura con equipo o agentes IA.

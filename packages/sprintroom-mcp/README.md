# @sprintroom/mcp

MCP (Model Context Protocol) server for [SprintRoom](https://sprintroom.app) — access your project backlog, user stories, and tasks from any MCP-compatible agent (OpenCode, Claude Code, Claude Desktop, Codex).

## Uso

```bash
npx -y @sprintroom/mcp
```

Requiere dos variables de entorno:

| Variable | Descripcion |
|----------|-------------|
| `SPRINTROOM_API_URL` | URL base de tu instancia SprintRoom (ej. `https://sprintroom.app`) |
| `SPRINTROOM_PROJECT_KEY` | Clave de proyecto generada desde la UI: **Proyecto → Integracion con IA (MCP)** |

## Herramientas

| Herramienta | Descripcion |
|-------------|-------------|
| `get_project_backlog` | Obtener el backlog del proyecto |
| `get_user_story_by_id` | Obtener una historia de usuario por ID |
| `get_task_by_id` | Obtener una tarea por ID |
| `search_tasks` | Buscar tareas por texto |
| `update_task_status` | Actualizar el estado de una tarea |
| `add_task_agent_note` | Agregar una nota de agente a una tarea |
| `get_sprintroom_mcp_skill` | Obtener la skill de MCP de SprintRoom |

## Seguridad

- `SPRINTROOM_PROJECT_KEY` otorga acceso completo de lectura/escritura a un proyecto.
- No compartas la clave en chats, commits ni documentacion publica.
- Revocala desde la UI del proyecto si fue comprometida.
- Estas credenciales son todo lo que necesitas. No requieres variables de InsForge.

## Publicacion

```bash
cd packages/sprintroom-mcp
npm run build
npm publish --access public
```

Las definiciones de herramientas se obtienen en tiempo real desde la API de SprintRoom via `/api/mcp`, por lo que no es necesario actualizar el paquete cuando cambian las herramientas del backend.

## Licencia

MIT

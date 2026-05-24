# sprintroom-mcp

Skill oficial del MCP de SprintRoom para agentes de IA.

Esta carpeta es la fuente oficial de la documentacion que debe instalarse en los proyectos de usuarios cuando copian el prompt de instalacion del MCP desde SprintRoom.

## Archivo principal

Lee `SKILL.md` antes de usar cualquier herramienta del MCP de SprintRoom.

## Instalacion o actualizacion de esta skill

Para instalar o actualizar esta skill en un proyecto, primero instala/configura el MCP de SprintRoom. Luego llama la herramienta `get_sprintroom_mcp_skill` y crea o actualiza los archivos que devuelva la respuesta en la carpeta de skills correspondiente.

Prioridad de instalacion:

1. `.agentes/`
2. `.skills/`
3. `.sprintroom/`

Dentro de la carpeta elegida, crea o actualiza `sprintroom-mcp/README.md` y `sprintroom-mcp/SKILL.md`.

## MCP documentado

- Endpoint: `/api/mcp`
- Header requerido: `X-Project-Key`
- Protocolos soportados: HTTP simple y JSON-RPC 2.0
- Fuente de verdad del codigo: `app/api/mcp/route.ts`, `src/lib/mcp/tools.ts`, `src/lib/mcp/types.ts`, `src/lib/mcp/service.ts`, `src/lib/mcp/auth.ts`

## Herramientas reales

- `get_project_backlog`
- `get_user_story_by_id`
- `get_task_by_id`
- `search_tasks`
- `update_task_status`
- `add_task_agent_note`
- `get_sprintroom_mcp_skill`

No documentes ni uses herramientas que no existan en el codigo real del MCP. Si el MCP cambia, actualiza esta skill y la respuesta de `get_sprintroom_mcp_skill` en el mismo cambio.

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

## How to update the MCP

Las definiciones de herramientas estan incrustadas en `src/definitions.ts` (codigo fuente) y compiladas a `dist/definitions.js`. Si el backend agrega, modifica o elimina herramientas, la version del paquete debe incrementarse siguiendo semver:

| Cambio | Version | Ejemplo |
|--------|---------|---------|
| Bugfix o documentacion | PATCH | `1.0.0 → 1.0.1` |
| Nueva herramienta o parametro opcional | MINOR | `1.0.0 → 1.1.0` |
| Breaking change en herramienta existente | MAJOR | `1.0.0 → 2.0.0` |

**Pasos para publicar:**
```bash
cd packages/sprintroom-mcp
# 1. Actualizar src/definitions.ts con los cambios del backend
# 2. Incrementar version en package.json
# 3. Compilar
npm run build
# 4. Verificar
npm publish --dry-run
# 5. Probar desde directorio limpio
# 6. Publicar
npm publish --access public
```

**Limitacion:** `tools/list` responde con definiciones incrustadas, no consulta la API de SprintRoom. Si las herramientas del backend cambian sin actualizar el paquete, los clientes veran definiciones desactualizadas. **TODO:** Refactorizar para que `tools/list` se obtenga desde `/api/mcp` y eliminar la duplicacion de definiciones.

## Licencia

MIT

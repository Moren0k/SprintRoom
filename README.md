# SprintRoom

Aplicacion web para organizar el trabajo de equipos mediante una jerarquia clara: la aplicacion contiene proyectos, cada proyecto contiene historias de usuario y cada historia contiene tareas.

## Stack

- **Next.js** (App Router) + **React 19**
- **TypeScript** estricto
- **InsForge** como Backend-as-a-Service (PostgreSQL + auth + storage + functions). Ver [`AGENTS.md`](./AGENTS.md) para la documentacion del SDK y convenciones.
- **Tailwind CSS** para estilos
- **Vitest** para pruebas unitarias

## Estructura del proyecto

```
app/                 # Rutas y vistas del App Router de Next.js
docs/                # Documentacion funcional y decisiones de dominio
migrations/          # Migraciones SQL ejecutadas en InsForge
public/              # Assets estaticos
src/
  domain/            # Entidades, value objects, enums, eventos, politicas
                     # y servicios de dominio. Sin dependencias externas.
  application/       # Casos de uso (commands/queries), DTOs, contratos
                     # de repositorio y errores de aplicacion.
  lib/               # Utilidades compartidas: reloj del sistema, helpers,
                     # adaptadores (p.ej. clientes InsForge).
tests/
  domain/            # Pruebas unitarias de la capa de dominio
  application/       # Pruebas de casos de uso con repositorios in-memory
```

Reglas de capa:

- `src/domain` no depende de ninguna capa.
- `src/application` depende solo de `src/domain` y de los contratos en `application/abstractions`.
- `src/lib` (y futuras adaptaciones tipo `src/server`) son las unicas que pueden conocer InsForge u otra infraestructura.

## Comandos

```bash
npm install          # Instala dependencias
npm run dev          # Levanta el servidor de desarrollo de Next.js
npm run build        # Compila la aplicacion para produccion
npm run start        # Sirve la build de produccion
npm run lint         # Ejecuta ESLint
npm run typecheck    # Verifica los tipos con TypeScript sin emitir
npm test             # Ejecuta las pruebas con Vitest
```

Abre [http://localhost:3000](http://localhost:3000) con tu navegador para ver el resultado en desarrollo.

## Pruebas

Las pruebas estan escritas con [Vitest](https://vitest.dev/) y cubren:

- Value objects (validaciones, normalizacion)
- Agregados (Project, UserStory, SprintTask, User)
- Politicas de autorizacion y visibilidad
- Servicios de dominio (calculo de progreso, guardas de eliminacion)
- Casos de uso de aplicacion con repositorios in-memory

Para ejecutarlas:

```bash
npm test
```

## Integracion MCP (Model Context Protocol)

SprintRoom expone sus herramientas de proyecto (backlog, historias, tareas) a traves de **dos mecanismos** MCP complementarios, mas un **endpoint HTTP** para integraciones directas.

### Eleccion rapida

| Situacion | Usa |
|-----------|-----|
| Soy **externo** (no tengo el codigo fuente) | **Public CLI** (`npx -y @sprintroom/mcp`) |
| Soy **desarrollador de SprintRoom** (tengo `.env.local` con InsForge) | **Internal dev script** (`npm run mcp-server`) |
| Quiero probar desde curl / Postman / script manual | **HTTP endpoint** (`POST /api/mcp`) |

---

### 1. Public CLI (`@sprintroom/mcp`) — para usuarios externos

Paquete npm independiente distribuido como `@sprintroom/mcp`. No requiere credenciales de InsForge. Solo necesita la URL de tu instancia SprintRoom y una PROJECT_KEY generada desde la UI.

```bash
# Ejecucion directa (sin instalar)
npx -y @sprintroom/mcp
```

**Variables de entorno:**
- `SPRINTROOM_API_URL` — URL base de tu instancia SprintRoom (ej. `https://sprintroom.app`).
- `SPRINTROOM_PROJECT_KEY` — clave de proyecto. Se genera desde la UI: **Proyecto → Integracion con IA (MCP)**. Se muestra una sola vez. Guardala en un lugar seguro.

**Configuracion en OpenCode (`opencode.json`):**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "sprintroom": {
      "type": "local",
      "command": ["npx", "-y", "@sprintroom/mcp"],
      "enabled": true,
      "environment": {
        "SPRINTROOM_API_URL": "https://sprintroom.app",
        "SPRINTROOM_PROJECT_KEY": "{env:SPRINTROOM_PROJECT_KEY}"
      }
    }
  }
}
```

**Configuracion en Claude Desktop (`claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "sprintroom": {
      "command": "npx",
      "args": ["-y", "@sprintroom/mcp"],
      "env": {
        "SPRINTROOM_API_URL": "https://sprintroom.app",
        "SPRINTROOM_PROJECT_KEY": "sk_sprintroom_xxxxxxxxxxxx"
      }
    }
  }
}
```

> **Advertencia de seguridad:** La PROJECT_KEY otorga acceso completo de lectura/escritura a un proyecto. No la compartas ni la subas a repositorios publicos. Si se ve comprometida, revocala desde la UI del proyecto y genera una nueva.

---

### 2. Internal dev script (`npm run mcp-server`) — para desarrolladores

Servidor MCP que se comunica por stdin/stdout usando JSON-RPC 2.0 (newline-delimited). Requiere las credenciales de InsForge del `.env.local`. Proporciona las 7 herramientas documentadas (`get_project_backlog`, `get_user_story_by_id`, `get_task_by_id`, `search_tasks`, `update_task_status`, `add_task_agent_note`, `get_sprintroom_mcp_skill`).

```bash
# Asegurate de tener SPRINTROOM_PROJECT_KEY en tu .env.local
npm run mcp-server
```

> **IMPORTANTE:** Las variables `INSFORGE_URL`, `INSFORGE_ANON_KEY` e `INSFORGE_API_KEY` son secretos del backend de SprintRoom. Solo existen en el archivo `.env.local` del servidor. **Nunca deben exponerse a usuarios externos ni compartirse en documentacion publica.** El Public CLI (`@sprintroom/mcp`) no necesita estas variables.

**Variables de entorno requeridas (desde `.env.local`):**
- `SPRINTROOM_PROJECT_KEY` — clave de proyecto.
- `INSFORGE_URL`, `INSFORGE_ANON_KEY`, `INSFORGE_API_KEY` — credenciales de InsForge (solo servidor).

**Configuracion en OpenCode:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "sprintroom": {
      "type": "local",
      "command": ["npm", "run", "mcp-server", "--"],
      "environment": {
        "SPRINTROOM_PROJECT_KEY": "{env:SPRINTROOM_PROJECT_KEY}",
        "INSFORGE_URL": "{env:INSFORGE_URL}",
        "INSFORGE_ANON_KEY": "{env:INSFORGE_ANON_KEY}",
        "INSFORGE_API_KEY": "{env:INSFORGE_API_KEY}"
      }
    }
  }
}
```

**Prueba de humo:**
```bash
npx tsx scripts/smoke-test-mcp.ts
```

---

### 3. Endpoint HTTP (para integraciones manuales)

El endpoint `POST /api/mcp` implementa JSON-RPC 2.0 sobre HTTP. Acepta la PROJECT_KEY en el header `X-Project-Key`. Util para clientes que no soporten el protocolo stdio (curl, Postman, scripts).

```bash
curl -X POST https://sprintroom.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Key: sk_sprintroom_xxxxx" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Versionado y sincronizacion de herramientas

**Limitacion actual:** Las definiciones de herramientas estan incrustadas en el paquete (`packages/sprintroom-mcp/src/definitions.ts`) y deben mantenerse sincronizadas manualmente con el backend (`src/lib/mcp/tools.ts`). Si las herramientas del backend cambian, la version del paquete debe incrementarse y publicarse una nueva edicion.

| Origen | Ubicacion | Proposito |
|--------|-----------|-----------|
| Backend (fuente de verdad) | `src/lib/mcp/tools.ts` | Define esquemas, validacion y logica de negocio |
| Public CLI (copia) | `packages/sprintroom-mcp/src/definitions.ts` | Responde `tools/list` sin llamar al backend |

**Estrategia de versionado semantico:**
- `@sprintroom/mcp` sigue semver (`major.minor.patch`).
- **PATCH** — Bugfixes, documentacion, dependencias (`1.0.0 → 1.0.1`).
- **MINOR** — Nuevas herramientas o parametros opcionales (`1.0.0 → 1.1.0`).
- **MAJOR** — Breaking changes en herramientas existentes (`1.0.0 → 2.0.0`).
- Cuando se agrega, modifica o elimina una herramienta en `src/lib/mcp/tools.ts`, se debe:
  1. Actualizar `packages/sprintroom-mcp/src/definitions.ts` con los mismos cambios.
  2. Incrementar la version en `packages/sprintroom-mcp/package.json`.
  3. Ejecutar `cd packages/sprintroom-mcp && npm run build` para compilar.
  4. Ejecutar `npm publish --dry-run` para verificar.
  5. Ejecutar el smoke test desde un directorio limpio.
  6. Publicar: `npm publish --access public`.

**TODO:** Refactorizar el paquete publico para que `tools/list` se obtenga desde la API de SprintRoom (`/api/mcp`) en lugar de tener definiciones duplicadas. Esto eliminaria la necesidad de sincronizar manualmente las herramientas y publicar nuevas versiones por cambios en tools.

### Regla critica (aplica a los dos mecanismos stdio)

El servidor MCP **nunca debe escribir** mensajes que no sean JSON-RPC en stdout. Todo log, advertencia o error interno se escribe exclusivamente en stderr. Esto es un requisito del protocolo MCP sobre stdio.

### Prueba de humo unificada

```bash
# Ejecuta todas las pruebas: internal script, public CLI, protocolo completo
npx tsx scripts/smoke-test-mcp-full.ts
```

### Documentacion adicional

Consulta [`docs/mcp-agent-usage.md`](./docs/mcp-agent-usage.md) para la guia detallada de herramientas y [`docs/mcp-kanban-scrum-integration.md`](./docs/mcp-kanban-scrum-integration.md) para la arquitectura.

## Documentacion adicional

- [`docs/sprintroom_business_logic.md`](./docs/sprintroom_business_logic.md): logica de negocio derivada de Notion.
- [`docs/sprintroom_domain_decisions.md`](./docs/sprintroom_domain_decisions.md): decisiones de dominio para resolver vacios funcionales.
- [`docs/sprintroom_infrastructure_notes.md`](./docs/sprintroom_infrastructure_notes.md): limites y notas de infraestructura InsForge.
- [`docs/mcp-agent-usage.md`](./docs/mcp-agent-usage.md): guia de uso del MCP para agentes de IA.
- [`docs/mcp-kanban-scrum-integration.md`](./docs/mcp-kanban-scrum-integration.md): arquitectura y detalle del MCP.
- [`docs/security-project-key-isolation.md`](./docs/security-project-key-isolation.md): modelo de seguridad por PROJECT_KEY.
- [`docs/frontend-project-navigation.md`](./docs/frontend-project-navigation.md): reglas de navegacion frontend.
- [`docs/chatbot-knowledge-base.md`](./docs/chatbot-knowledge-base.md): base de conocimiento para el asistente.
- [`task.md`](./task.md): plan de ejecucion tecnico y backlog.
- [`AGENTS.md`](./AGENTS.md): convenciones del proyecto y documentacion de InsForge.

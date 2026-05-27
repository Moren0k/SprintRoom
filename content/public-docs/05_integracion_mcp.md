---
title: "Integración MCP"
order: 5
---

# Integración MCP

SprintRoom expone un servidor MCP para conectar agentes de IA al backlog real de un proyecto.

MCP significa **Model Context Protocol**. Permite que herramientas como OpenCode, Claude Code, Claude Desktop o Codex consulten y modifiquen información del proyecto de forma controlada.

## Qué permite el MCP de SprintRoom

Un agente conectado puede leer el proyecto, backlog, historias, tareas, comentarios, notas de agente y actividad reciente. También puede crear historias y tareas, agregar comentarios, cambiar estados, actualizar tareas en bloque, actualizar detalles, reasignar tareas, registrar notas técnicas y obtener la skill oficial `sprintroom-mcp`.

## Qué no permite actualmente

El MCP actual no permite crear proyectos, editar o eliminar historias, eliminar tareas, editar o eliminar comentarios, gestionar miembros, crear/listar/revocar PROJECT_KEYs, modificar permisos, base de datos, migraciones, OAuth o hosting.

## PROJECT_KEY

La PROJECT_KEY es la credencial que autoriza al agente para trabajar con un proyecto específico.

Características:

- Se genera desde el detalle del proyecto.
- Solo se muestra una vez.
- Otorga acceso de lectura y escritura al proyecto asociado.
- Se almacena como hash SHA-256.
- Puede desactivarse.
- Puede eliminarse con confirmación por descripción.

## Generar una PROJECT_KEY

1. Abre un proyecto.
2. Busca **Integración con IA (MCP)**.
3. Escribe una descripción para la clave.
4. Haz clic en **Generar PROJECT_KEY**.
5. Copia la clave inmediatamente.

La clave no vuelve a mostrarse después.

## Configuración con OpenCode

Usa esta configuración en el `opencode.json` local del proyecto:

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

Reemplaza `https://sprintroom.app` por la URL de tu instancia si es diferente.

## Configuración con Claude Code

```bash
claude mcp add --transport stdio \
  --env SPRINTROOM_API_URL=https://sprintroom.app \
  --env SPRINTROOM_PROJECT_KEY=$SPRINTROOM_PROJECT_KEY \
  sprintroom \
  -- npx -y @sprintroom/mcp
```

## Configuración con Claude Desktop

Agrega el servidor al archivo `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sprintroom": {
      "command": "npx",
      "args": ["-y", "@sprintroom/mcp"],
      "env": {
        "SPRINTROOM_API_URL": "https://sprintroom.app",
        "SPRINTROOM_PROJECT_KEY": "${SPRINTROOM_PROJECT_KEY}"
      }
    }
  }
}
```

## Configuración con Codex

```toml
[mcp_servers.sprintroom]
command = "npx"
args = ["-y", "@sprintroom/mcp"]

[mcp_servers.sprintroom.env]
SPRINTROOM_API_URL = "https://sprintroom.app"
SPRINTROOM_PROJECT_KEY = "${env:SPRINTROOM_PROJECT_KEY}"
```

## Instalar la skill oficial para agentes

SprintRoom incluye la herramienta `get_sprintroom_mcp_skill`, que devuelve la skill oficial para agentes de IA.

Flujo recomendado:

1. Configura el MCP con URL y PROJECT_KEY.
2. Pide al agente llamar `get_sprintroom_mcp_skill`.
3. El agente debe crear o actualizar `.agents/skills/sprintroom-mcp/SKILL.md` en el repositorio actual.
4. Si ya existe un `AGENTS.md` en la raíz, el agente puede agregar una referencia idempotente.
5. El agente debe leer esa skill antes de usar otras herramientas MCP.

La herramienta no escribe archivos por sí misma. Solo devuelve el contenido instalable.

## Endpoint HTTP MCP

SprintRoom también expone un endpoint HTTP:

```http
POST /api/mcp
Content-Type: application/json
X-Project-Key: sk_sprintroom_tu_clave
```

También existe descubrimiento vía:

```http
GET /api/mcp
```

## JSON-RPC 2.0

Listar herramientas:

```bash
curl -X POST https://sprintroom.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Key: sk_sprintroom_tu_clave" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Ejecutar herramienta:

```bash
curl -X POST https://sprintroom.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Key: sk_sprintroom_tu_clave" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_project_backlog","arguments":{}}}'
```

## HTTP simple

```bash
curl -X POST https://sprintroom.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Key: sk_sprintroom_tu_clave" \
  -d '{"tool":"get_project_backlog"}'
```

## Límite de solicitudes

El endpoint MCP aplica un límite de 120 solicitudes por minuto. Si se supera, SprintRoom responde con `rate_limit_exceeded` y un valor `Retry-After`.

## Seguridad

- No pegues PROJECT_KEYs en chats públicos.
- No subas PROJECT_KEYs a repositorios.
- Usa variables de entorno cuando sea posible.
- Desactiva claves comprometidas.
- Genera claves distintas por proyecto.
- No incluyas secretos en notas de agente.

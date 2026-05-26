---
title: "Instalación de MCP"
order: 1
---

Integra SprintRoom con agentes de IA a través del Model Context Protocol (MCP).

## OpenCode

Configuración para OpenCode. Usa `{env:SPRINTROOM_PROJECT_KEY}` para leer la clave del entorno.

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

## Claude Desktop

Agrega al archivo `claude_desktop_config.json`. Usa `${SPRINTROOM_PROJECT_KEY}` si la clave está en tu entorno, o reemplázala por el valor directo.

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

## Claude Code (CLI)

Usa el comando `claude mcp add` con la variable de entorno `$SPRINTROOM_PROJECT_KEY`.

```bash
claude mcp add --transport stdio \
  --env SPRINTROOM_API_URL=https://sprintroom.app \
  --env SPRINTROOM_PROJECT_KEY=$SPRINTROOM_PROJECT_KEY \
  sprintroom \
  -- npx -y @sprintroom/mcp
```

## Codex (Cursor)

Agrega al archivo `.cursor/config`. Usa `${env:SPRINTROOM_PROJECT_KEY}` para leer la clave del entorno.

```toml
[mcp_servers.sprintroom]
command = "npx"
args = ["-y", "@sprintroom/mcp"]

[mcp_servers.sprintroom.env]
SPRINTROOM_API_URL = "https://sprintroom.app"
SPRINTROOM_PROJECT_KEY = "${env:SPRINTROOM_PROJECT_KEY}"
```

## Seguridad

- La PROJECT_KEY otorga acceso completo de lectura/escritura a un proyecto.
- No compartas la clave en chats, commits ni documentación pública.
- Revócala desde la UI del proyecto si fue comprometida.
- Las claves se almacenan como hash SHA-256. Nunca en texto plano.

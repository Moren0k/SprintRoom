---
title: "Uso de la API"
order: 2
---

Endpoint directo para integraciones manuales (curl, Postman, scripts). Soporta JSON-RPC 2.0 y HTTP simple.

## Endpoint

```
POST https://sprintroom.app/api/mcp
Content-Type: application/json
X-Project-Key: sk_sprintroom_tu_clave
```

## JSON-RPC 2.0 (recomendado)

```bash
# Discovery
curl -X POST https://sprintroom.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Key: sk_sprintroom_tu_clave" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Tool call
curl -X POST https://sprintroom.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Key: sk_sprintroom_tu_clave" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_project_backlog","arguments":{}}}'
```

## HTTP Simple

```bash
curl -X POST https://sprintroom.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "X-Project-Key: sk_sprintroom_tu_clave" \
  -d '{"tool":"get_project_backlog"}'
```

# Realtime: cambios de estado de tareas

## Canal

`project:{projectId}:tasks`

## Evento

`task_status_changed`

## Payload

```json
{
  "projectId": "uuid",
  "taskId": "uuid",
  "userStoryId": "uuid",
  "status": "in_progress",
  "isCompleted": false,
  "updatedOnUtc": "2026-05-26T12:00:00Z"
}
```

## Publicacion

Base de datos → trigger `task_status_changed_trigger` en `sprint_tasks`:

- AFTER UPDATE, FOR EACH ROW
- Solo cuando `OLD.status IS DISTINCT FROM NEW.status`
- Ejecuta `notify_task_status_changed()` que llama `realtime.publish()`
- La funcion es SECURITY DEFINER (puede publicar independientemente de RLS)

## Suscripcion

Frontend → hook `useTaskStatusRealtime(projectId, callback)`:

1. Obtiene el JWT via `GET /api/auth/token` (lee la cookie httpOnly del lado servidor)
2. Crea un `InsForgeClient` del lado browser (`createClient` sin `isServerMode`)
3. Llama `client.setAccessToken(token)` para que el SDK envie el JWT al WebSocket
4. Conecta (`client.realtime.connect()`)
5. Se suscribe al canal (`client.realtime.subscribe(channel)`)
6. Escucha `task_status_changed`
7. Valida payload con `isValidPayload()` (6 campos requeridos)
8. Ejecuta callback solo si coincide el `userStoryId`
9. Limpia al desmontar: `disconnect()`

## Seguridad

- RLS en `realtime.channels`: solo miembros del proyecto pueden SELECT (suscribirse)
- RLS en `realtime.messages`: solo miembros del proyecto pueden INSERT (publicar)
- El trigger publica via SECURITY DEFINER (bypassea RLS)
- El frontend necesita JWT valido; se obtiene del endpoint protegido `/api/auth/token`
- No se exponen PROJECT_KEY, tokens internos ni datos sensibles en el payload

## Integracion

- `components/story-tasks-client.tsx`: hook conectado, actualiza `tasks` en estado cuando llega evento
- Badge "Realtime conectado/desconectado" visible en el tablero Kanban

## Limitaciones

- Solo cubre cambios de `status` en `sprint_tasks` (no comentarios, historias, activity feed)
- El payload no incluye `title`, `description`, `assigneeIds` por seguridad y simplicidad
- La reconexion automatica depende del SDK (`client.realtime.connect()`)
- Si el SDK se desconecta, el badge cambia a "Realtime desconectado" pero no reconecta automaticamente
- En serverless multi-instancia, cada instancia tiene su propia conexion WebSocket

## Smoke test manual

1. Abrir dos ventanas del navegador en el mismo proyecto → misma historia
2. En ventana A, arrastrar una tarea a otra columna Kanban
3. En ventana B, verificar que la tarea se mueve sin hacer refresh
4. Repetir cambiando status via MCP (`update_task_status`)
5. Verificar badge "Realtime conectado" en ambas ventanas
6. Cerrar una ventana → la otra sigue funcionando
7. (Opcional) Probar suscripcion desde cuenta sin acceso al proyecto

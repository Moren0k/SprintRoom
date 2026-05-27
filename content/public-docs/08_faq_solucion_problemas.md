---
title: "FAQ y solución de problemas"
order: 8
---

# FAQ y solución de problemas

## No puedo iniciar sesión

Verifica que el correo esté bien escrito, que la contraseña sea correcta, que uses el mismo método con el que creaste la cuenta y que no haya errores temporales de conexión.

Si te registraste con Google, usa **Continuar con Google**.

## No puedo crear una cuenta

| Causa | Solución |
|---|---|
| Falta nombre | Ingresa tu nombre completo. |
| Correo inválido | Usa un correo con formato válido. |
| Contraseña corta | Usa mínimo 8 caracteres. |
| Cuenta existente | Intenta iniciar sesión. |

## No veo un proyecto

Solo puedes ver un proyecto si eres miembro del proyecto o tienes rol global `Administrator`.

Pide a un propietario o mantenedor que te agregue usando tu Usuario ID.

## No puedo crear historias o tareas

Necesitas uno de estos roles dentro del proyecto:

- `Owner`
- `Maintainer`
- `Contributor`

El rol `Viewer` solo permite ver.

## No puedo editar documentación, miembros o eliminar

Necesitas rol `Owner` o `Maintainer`. Estas acciones no están disponibles para `Contributor` ni `Viewer`.

## No puedo agregar un miembro

Verifica que el Usuario ID sea correcto, que el usuario exista, que tengas rol `Owner` o `Maintainer` y que el rol seleccionado sea válido.

Roles válidos: `Viewer`, `Contributor`, `Maintainer`, `Owner`.

## No puedo asignar una tarea a un usuario

El usuario debe existir en SprintRoom y pertenecer al proyecto. Si no aparece o falla la asignación, agrégalo primero como miembro del proyecto.

## El progreso no parece manualmente editable

El progreso no se edita manualmente. SprintRoom lo calcula desde los estados de las tareas.

| Estado | Progreso |
|---|---:|
| Sin Empezar | 0% |
| En Desarrollo | 40% |
| Probando | 70% |
| En Revisión | 90% |
| Completada | 100% |

## Moví una tarea y volvió a su estado anterior

El tablero actualiza el estado de forma optimista. Si la API rechaza el cambio, SprintRoom revierte el movimiento.

Causas posibles: sesión vencida, falta de permisos, tarea inexistente o eliminada, estado inválido o error temporal del servidor.

## Realtime aparece desconectado

Puedes seguir trabajando. El indicador solo informa que la conexión en tiempo real no está disponible.

Soluciones:

- Recarga la página.
- Revisa tu conexión.
- Verifica si otros cambios aparecen después de refrescar.

## No puedo eliminar un proyecto, historia o tarea

Verifica que tengas permisos suficientes, que escribiste exactamente el nombre solicitado, que para proyecto o historia escribiste también `ELIMINAR TODO` y que no haya espacios adicionales.

## Generé una PROJECT_KEY y ya no la veo

Es el comportamiento esperado. Por seguridad, SprintRoom muestra la PROJECT_KEY solo una vez.

Si la perdiste:

1. Desactiva o elimina la clave anterior si corresponde.
2. Genera una clave nueva.
3. Cópiala inmediatamente.

## Mi agente MCP dice que falta PROJECT_KEY

El endpoint MCP requiere el header `X-Project-Key`.

En clientes MCP mediante `@sprintroom/mcp`, configura `SPRINTROOM_API_URL` y `SPRINTROOM_PROJECT_KEY`.

## Mi agente MCP recibe `invalid_project_key`

La clave no es válida o no pertenece a ningún proyecto.

Soluciones:

- Verifica que copiaste la clave completa.
- Asegúrate de usar la clave del proyecto correcto.
- Genera una nueva clave si la anterior se perdió.
- Revisa que no haya espacios extra.

## Mi agente MCP recibe `project_key_inactive`

La clave fue desactivada. Genera una nueva PROJECT_KEY y actualiza la configuración del cliente MCP.

## Mi agente MCP recibe `rate_limit_exceeded`

Se superó el límite de 120 solicitudes por minuto.

Soluciones:

- Espera el tiempo indicado en `Retry-After`.
- Reduce llamadas repetidas.
- Usa `get_project_backlog` para traer contexto amplio en una sola llamada.
- Usa `bulk_update_tasks` para cambios de estado masivos.

## Mi agente inventa herramientas o estados

Usa la skill oficial:

1. Pide al agente llamar `get_sprintroom_mcp_skill`.
2. Instala el contenido en `.agents/skills/sprintroom-mcp/SKILL.md`.
3. Pide al agente leer la skill antes de llamar herramientas.
4. Recuérdale que SprintRoom no tiene CLI pública propia; la integración MCP usa `npx -y @sprintroom/mcp`.

Estados válidos:

- `not_started`
- `in_progress`
- `testing`
- `review`
- `completed`

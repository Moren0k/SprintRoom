---
title: "Flujos de trabajo"
order: 7
---

# Flujos de trabajo comunes

## Crear y preparar un proyecto

1. Entra a **Proyectos**.
2. Crea un proyecto con nombre y descripción.
3. Abre el proyecto.
4. Agrega miembros usando su Usuario ID.
5. Asigna roles según responsabilidad.
6. Crea historias de usuario.
7. Abre cada historia y crea tareas.
8. Asigna tareas a miembros.
9. Usa el tablero Kanban para dar seguimiento.

## Organizar un sprint por historias

1. Crea una historia por funcionalidad.
2. Describe el objetivo de cada historia.
3. Divide cada historia en tareas pequeñas.
4. Asigna responsables.
5. Mueve tareas entre estados conforme avancen.
6. Usa comentarios para dejar decisiones y contexto.
7. Revisa el porcentaje de avance de la historia y del proyecto.

## Dar seguimiento diario

1. Abre **Dashboard** para ver resumen.
2. Revisa **Mis tareas**.
3. Cambia estados según el avance real.
4. Abre tareas que requieran contexto.
5. Agrega comentarios de seguimiento.
6. Abre el proyecto si necesitas ver la historia completa.

## Gestionar trabajo personal

1. Entra a **Mis tareas**.
2. Revisa tareas asignadas.
3. Cambia el estado de cada tarea según corresponda.
4. Usa **Ver detalle** para leer comentarios.
5. Agrega comentarios cuando haya avances, bloqueos o decisiones.
6. Usa **Abrir proyecto** para consultar el contexto general.

## Integrar un agente de IA

1. Abre el proyecto.
2. Genera una PROJECT_KEY en **Integración con IA (MCP)**.
3. Copia la clave inmediatamente.
4. Configura tu cliente MCP con `@sprintroom/mcp`.
5. Pide al agente instalar la skill oficial con `get_sprintroom_mcp_skill`.
6. Pide al agente leer el backlog antes de escribir.
7. Revisa actividad reciente para auditar cambios hechos por MCP.

## Flujo recomendado para agentes de IA

1. Llamar `get_project_detail`.
2. Llamar `get_project_backlog`.
3. Si va a trabajar sobre una tarea, llamar `get_task_by_id`.
4. Leer comentarios con `list_task_comments`.
5. Leer notas previas con `list_task_agent_notes`.
6. Realizar trabajo fuera de SprintRoom.
7. Actualizar estado con `update_task_status`.
8. Registrar resumen técnico con `add_task_agent_note`.

## Crear historias y tareas con MCP

1. Llamar `get_project_detail`.
2. Crear historia con `create_user_story`.
3. Crear tareas con `create_task`.
4. Asignar usuarios con `assign_task` si aplica.
5. Verificar resultado con `get_project_backlog`.

## Revisar actividad MCP

1. Abre el proyecto.
2. Busca **Integración con IA (MCP)**.
3. Revisa la última actividad.
4. Abre **Actividad del proyecto** para más eventos.
5. Si una clave tuvo uso sospechoso, desactívala.

## Revocar acceso de un agente

1. Abre el proyecto.
2. En **Integración con IA (MCP)**, busca la clave.
3. Haz clic en **Desactivar** para impedir nuevas llamadas.
4. Si quieres eliminar el registro, haz clic en **Eliminar**.
5. Escribe exactamente la descripción de la clave.
6. Confirma la eliminación.

## Eliminar trabajo de forma segura

Antes de eliminar, verifica que el elemento correcto esté seleccionado, revisa si tiene tareas relacionadas, confirma que tienes permisos y escribe exactamente el nombre requerido.

| Acción | Confirmación |
|---|---|
| Eliminar tarea | Título exacto de la tarea. |
| Eliminar historia | Título exacto y `ELIMINAR TODO`. |
| Eliminar proyecto | Nombre exacto y `ELIMINAR TODO`. |

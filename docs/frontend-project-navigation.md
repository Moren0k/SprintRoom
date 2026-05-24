# Navegación Frontend de Proyectos, Historias y Tareas

Este flujo frontend debe mantenerse separado y predecible. No se deben volver a mezclar proyectos, historias de usuario y tareas en una sola vista.

## Vistas Permitidas

1. `/projects`
   - Muestra únicamente proyectos.
   - Cada proyecto navega a `/projects/[projectId]`.
   - No debe renderizar tareas ni historias expandidas dentro de la lista principal.

2. `/projects/[projectId]`
   - Muestra las historias de usuario asociadas al proyecto seleccionado.
   - Cada historia navega a `/projects/[projectId]/stories/[userStoryId]`.
   - No debe mostrar todas las tareas del proyecto ni mezclar tareas de varias historias.
   - Puede mantener configuración propia del proyecto, como miembros, documentación y la integración MCP del proyecto.

3. `/projects/[projectId]/stories/[userStoryId]`
   - Muestra únicamente las tareas asociadas a la historia seleccionada.
   - Las tareas deben mostrarse en un tablero Kanban funcional, no en una lista simple.

## Tablero Kanban

El tablero debe mantener estas columnas y etiquetas visibles:

| Estado interno | Etiqueta visible |
| --- | --- |
| `not_started` | Sin Empezar |
| `in_progress` | En Desarrollo |
| `testing` | Probando |
| `review` | En Revisión |
| `completed` | Completada |

Reglas obligatorias:

- No mostrar códigos internos de estado al usuario.
- Las tareas deben parecer arrastrables y poder moverse entre columnas.
- Al soltar una tarea en otra columna, se debe usar la actualización frontend/API existente de tareas con `PATCH /api/tasks/[sprintTaskId]`.
- La UI debe actualizarse sin recarga manual.
- Si el cambio falla, debe revertirse la tarea al estado anterior o mostrarse un error claro.
- No reemplazar el tablero Kanban por una lista simple sin validación previa.

## Restricciones para Agentes Futuros

- No cambiar este flujo visual sin validación previa.
- No rediseñar globalmente estas páginas como parte de cambios puntuales.
- No mover tareas a la vista de proyectos ni a la vista de historias del proyecto.
- No mezclar tareas de múltiples historias en la vista de una historia.
- No modificar backend, migraciones, permisos, MCP ni modelo de datos para mantener esta separación frontend.
- Cualquier ajuste visual debe respetar jerarquía, claridad, espacio en blanco, consistencia y feedback de carga/error.

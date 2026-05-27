---
title: "Uso de la plataforma web"
order: 3
---

# Uso de la plataforma web

## Página pública

La página inicial presenta SprintRoom, sus beneficios y un demo interactivo. Desde allí puedes crear una cuenta, iniciar sesión, probar un tablero de ejemplo y conocer la estructura de proyecto, historia y tarea.

## Dashboard

El dashboard resume tu trabajo actual.

| Métrica | Descripción |
|---|---|
| Proyectos visibles | Cantidad de proyectos que puedes ver. |
| Tareas del portafolio | Total de tareas en tus proyectos visibles. |
| Mis tareas | Tareas asignadas a tu usuario. |
| Avance promedio | Promedio de avance de proyectos visibles. |

También muestra hasta 5 proyectos visibles y hasta 8 tareas asignadas a ti.

## Proyectos

La sección **Proyectos** permite crear y revisar proyectos.

### Crear proyecto

| Campo | Obligatorio | Límite |
|---|---:|---:|
| Nombre | Sí | 150 caracteres |
| Descripción | No | 2000 caracteres |
| Referencia externa | No | Valor corto o enlace externo |

Después de crear el proyecto, SprintRoom te lleva al detalle del proyecto.

### Lista de proyectos

Cada proyecto muestra nombre, descripción, cantidad de miembros, porcentaje de avance, número de historias y número de tareas.

## Detalle de proyecto

El detalle de proyecto concentra la administración del proyecto:

- Avance del proyecto.
- Total de historias.
- Total de tareas.
- Documentación del proyecto.
- Miembros.
- Integración con IA (MCP).
- Actividad del proyecto.
- Historias de usuario.

### Editar documentación del proyecto

1. Abre un proyecto.
2. En **Documentación**, actualiza nombre, descripción o referencia externa.
3. Haz clic en **Guardar cambios**.

Esta acción requiere rol `Owner` o `Maintainer`.

### Gestionar miembros

En la sección **Miembros** puedes ver nombre, correo, ID y rol de cada miembro; consultar carga de trabajo; agregar miembros por Usuario ID; y retirar miembros.

Roles seleccionables:

- `Viewer`
- `Contributor`
- `Maintainer`
- `Owner`

Agregar o retirar miembros requiere rol `Owner` o `Maintainer`.

### Ver carga de un miembro

1. En **Miembros**, haz clic en **Ver carga**.
2. SprintRoom muestra tareas asignadas, pendientes y completadas.

## Historias de usuario

Las historias viven dentro de un proyecto.

Cada historia muestra título, descripción, avance calculado, acceso al tablero Kanban y opción de eliminación.

### Crear historia

1. Abre el proyecto.
2. En **Historias de usuario**, completa el título.
3. Agrega descripción si aplica.
4. Haz clic en **Crear historia**.

Crear historias requiere rol `Owner`, `Maintainer` o `Contributor`.

### Eliminar historia

1. Haz clic en **Eliminar**.
2. Escribe exactamente el título de la historia.
3. Escribe `ELIMINAR TODO`.
4. Confirma.

Esta acción elimina también las tareas de la historia y requiere rol `Owner` o `Maintainer`.

## Tablero Kanban de historia

Cada historia tiene su propio tablero Kanban con estas columnas:

- Sin Empezar.
- En Desarrollo.
- Probando.
- En Revisión.
- Completada.

### Crear tarea en el tablero

1. Abre una historia.
2. Haz clic en **Nueva tarea**.
3. Completa título y descripción.
4. Selecciona asignados entre miembros del proyecto.
5. Haz clic en **Crear tarea**.

El título de tarea es obligatorio y tiene un máximo de 160 caracteres. La descripción puede tener hasta 2000 caracteres.

### Mover tareas

Puedes arrastrar una tarea a otra columna. SprintRoom actualiza el estado de forma optimista y revierte el cambio si la operación falla.

### Realtime

El tablero muestra un indicador:

| Indicador | Significado |
|---|---|
| Realtime conectado | Los cambios de estado pueden reflejarse en tiempo real. |
| Realtime desconectado | Puedes seguir trabajando, pero algunos cambios externos pueden requerir recarga. |

## Detalle de tarea

Al abrir una tarea puedes ver título, descripción, estado actual, comentarios y cambiar el estado manualmente.

## Mis tareas

La sección **Mis tareas** muestra tareas asignadas a tu usuario. Desde allí puedes cambiar estado, abrir detalle, agregar comentarios, abrir el proyecto asociado o eliminar la tarea si tienes permisos suficientes.

## Cuenta

La sección **Cuenta** permite editar nombre completo y correo electrónico, consultar Usuario ID, rol global y origen de la cuenta.

Si tu rol global es `Administrator`, también puedes crear usuarios administrativos con nombre, correo, contraseña mínima de 8 caracteres y rol global `Member` o `Administrator`.

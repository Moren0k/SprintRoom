# SprintRoom: decisiones de dominio del bloque inicial

## Alcance

Este documento resuelve los vacios funcionales identificados en `docs/sprintroom_business_logic.md` para habilitar la implementacion del nucleo de dominio.

## T001 - Matriz de roles, permisos y limites de accion

### Roles globales

- `Administrator`: puede crear usuarios por flujo administrativo, consultar cualquier proyecto y operar sobre cualquier contexto.
- `Member`: puede registrarse publicamente, iniciar sesion y operar segun el rol que tenga dentro de cada proyecto.

### Roles de proyecto

- `Owner`: creador del proyecto. Puede editar documentacion, agregar o retirar miembros, crear historias de usuario, crear tareas y ejecutar eliminaciones permitidas.
- `Maintainer`: puede editar documentacion, crear historias de usuario, crear tareas y agregar miembros. No puede retirar al `Owner`.
- `Contributor`: puede crear historias de usuario y tareas dentro del proyecto, y participar en la colaboracion funcional.
- `Viewer`: puede consultar el proyecto, sus historias y tareas, pero no puede modificar ni eliminar.

### Limites de accion adoptados

- Cualquier usuario autenticado puede crear proyectos.
- Las historias de usuario y las tareas solo pueden crearse dentro de un proyecto por `Owner`, `Maintainer` o `Contributor`.
- La gestion de miembros queda reservada a `Owner` y `Maintainer`, con la restriccion de que solo `Owner` puede retirar a otro `Owner`.
- Las eliminaciones funcionales quedan reservadas a `Owner` y `Maintainer`, sujetas a confirmacion estricta por nombre.

## T002 - Reglas de visibilidad

- El catalogo resumido de proyectos es visible para cualquier usuario autenticado.
- El detalle interno de un proyecto solo es visible para sus miembros y para `Administrator`.
- La carga personal de trabajo solo es visible para el propio usuario y para `Administrator`.
- El detalle de un miembro dentro de un proyecto solo es visible para miembros del mismo proyecto y para `Administrator`.
- No existe acceso al detalle de tareas o comentarios fuera del contexto de un proyecto compartido.

## T003 - Politica de eliminacion y dependencias

- Un proyecto no puede eliminarse si todavia contiene historias de usuario o tareas activas asociadas. La regla adoptada es `Restrict`.
- Una historia de usuario no puede eliminarse si todavia contiene tareas asociadas. La regla adoptada es `Restrict`.
- Una tarea si puede eliminarse, siempre que el usuario tenga permisos y confirme escribiendo exactamente el nombre esperado.
- La confirmacion destructiva compara el nombre esperado contra el valor ingresado por el usuario sin normalizaciones agresivas; solo se recortan espacios exteriores.

## T004 - Politica de auditoria y retencion de comentarios

- Los comentarios de tarea son inmutables una vez creados.
- Los comentarios no se editan ni se eliminan en este bloque inicial.
- Los eventos relevantes del dominio deben poder registrarse como eventos de dominio para futura auditoria.
- La retencion funcional de comentarios es indefinida hasta que exista una politica superior aprobada.

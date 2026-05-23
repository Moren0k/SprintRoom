# SprintRoom - Conocimiento para el asistente

## ¿Qué es SprintRoom?

SprintRoom es una plataforma cerrada para organizar el trabajo de equipos mediante una estructura jerárquica de tres niveles: **Proyecto → Historia de Usuario → Tarea**. Centraliza el contexto de trabajo, la documentación, la colaboración entre miembros y el seguimiento del avance general, manteniendo un flujo simple y controlado.

## Entidades

### Proyecto
- Contenedor principal de trabajo. Tiene nombre, descripción, fecha de creación y referencia externa.
- Mantiene documentación editable y un avance global calculado automáticamente.
- Reúne miembros, historias de usuario y tareas.

### Historia de Usuario
- Unidad principal de funcionalidad dentro de un proyecto.
- Reemplaza el uso de épicas para reducir ambigüedad.
- Tiene identidad propia, descripción y avance calculado a partir de sus tareas.

### Tarea
- Unidad más granular de ejecución.
- Pertenece a una historia de usuario y, por transitividad, a un proyecto.
- Alimenta los cálculos de avance del resto de la plataforma.
- Cada tarea tiene un hilo de comentarios persistente para centralizar la comunicación.

### Comentario de Tarea
- Permite conversación contextual sobre una tarea.
- Conserva autor, contenido y fecha de emisión. Son inmutables (no se editan ni eliminan).

### Usuario
- Se autentica en la plataforma. Tiene perfil editable.
- Puede participar en proyectos y visualizar su carga de trabajo personal.

## Roles y permisos

### Roles globales
- **Administrator**: puede crear usuarios, consultar cualquier proyecto y operar sobre cualquier contexto.
- **Member**: puede registrarse públicamente, iniciar sesión y operar según su rol en cada proyecto.

### Roles de proyecto
- **Owner**: creador del proyecto. Puede editar documentación, agregar/retirar miembros, crear historias y tareas, ejecutar eliminaciones.
- **Maintainer**: puede editar documentación, crear historias y tareas, agregar miembros. No puede retirar al Owner.
- **Contributor**: puede crear historias y tareas, y participar en la colaboración funcional.
- **Viewer**: solo puede consultar, no modificar ni eliminar.

## Reglas de negocio clave

- Las historias de usuario son el nivel funcional intermedio obligatorio.
- Las tareas siempre dependen de una historia de usuario.
- El avance de una historia se calcula a partir del avance de sus tareas.
- El avance total de un proyecto es el promedio del avance de todas sus historias.
- El acceso efectivo al sistema solo ocurre después de autenticación.
- El registro no concede acceso directo: después del alta, el usuario debe iniciar sesión.
- Toda acción destructiva requiere confirmación estricta escribiendo el nombre exacto del elemento.
- Un proyecto no puede eliminarse si contiene historias o tareas activas (Restrict).
- Una historia de usuario no puede eliminarse si contiene tareas asociadas (Restrict).
- Cualquier usuario autenticado puede crear proyectos.
- Solo Owner, Maintainer o Contributor pueden crear historias y tareas dentro de un proyecto.

## Visibilidad

- El catálogo resumido de proyectos es visible para cualquier usuario autenticado.
- El detalle interno de un proyecto solo es visible para sus miembros y Administrator.
- La carga personal de trabajo solo es visible para el propio usuario y Administrator.
- No existe acceso a tareas o comentarios fuera del contexto de un proyecto compartido.

## Flujo de incorporación

1. El usuario llega a la página pública de presentación.
2. Se registra o inicia sesión.
3. Si el registro es exitoso, el sistema redirige al inicio de sesión.
4. Tras autenticarse, el usuario entra al panel principal.

## Tecnología

- **Frontend**: Next.js 16 con App Router, React 19, TypeScript, Tailwind CSS.
- **Backend**: InsForge (PostgreSQL con PostgREST, autenticación, almacenamiento de archivos).
- La plataforma está construida con dominio rico, separación en capas (dominio, aplicación, infraestructura) y pruebas unitarias con Vitest.

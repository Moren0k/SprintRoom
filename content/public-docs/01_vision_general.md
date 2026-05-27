---
title: "Visión general"
order: 1
---

# Visión general de SprintRoom

SprintRoom es una plataforma web para organizar el trabajo de equipos mediante una estructura simple y clara: **proyectos**, **historias de usuario** y **tareas**.

Su objetivo es mantener el contexto del trabajo en un solo lugar, permitir seguimiento visual del avance y conectar agentes de IA al backlog real del proyecto mediante MCP (Model Context Protocol).

## Propuesta de valor

SprintRoom ayuda a los equipos a:

- Centralizar iniciativas, miembros, historias, tareas y comentarios.
- Visualizar el avance real de un proyecto sin cálculos manuales.
- Trabajar con tableros Kanban por historia de usuario.
- Consultar tareas personales asignadas.
- Integrar agentes de IA para leer, crear y actualizar trabajo dentro de un proyecto.
- Mantener seguridad por proyecto mediante roles, membresía y claves MCP independientes.

## Modelo de trabajo

SprintRoom usa tres niveles principales:

| Nivel | Propósito |
|---|---|
| Proyecto | Contenedor principal de una iniciativa. Agrupa documentación, miembros, historias y tareas. |
| Historia de usuario | Unidad funcional dentro de un proyecto. Representa una capacidad o necesidad del usuario. |
| Tarea | Unidad ejecutable. Tiene título, descripción, responsables, estado y comentarios. |

## Estados de tarea

Las tareas usan cinco estados Kanban:

| Estado visible | Valor técnico | Progreso |
|---|---:|---:|
| Sin Empezar | `not_started` | 0% |
| En Desarrollo | `in_progress` | 40% |
| Probando | `testing` | 70% |
| En Revisión | `review` | 90% |
| Completada | `completed` | 100% |

El avance de una historia se calcula promediando el progreso de sus tareas. El avance del proyecto se calcula desde el conjunto de historias y tareas del proyecto.

## Roles globales

SprintRoom tiene dos roles globales:

| Rol | Descripción |
|---|---|
| Member | Usuario normal. Puede crear proyectos y trabajar en proyectos donde sea miembro. |
| Administrator | Usuario administrador. Puede ver proyectos y crear usuarios administrativos. |

## Roles dentro de un proyecto

Cada proyecto tiene roles propios:

| Rol de proyecto | Puede ver | Puede crear historias/tareas | Puede editar proyecto, miembros y eliminar |
|---|---:|---:|---:|
| Viewer | Sí | No | No |
| Contributor | Sí | Sí | No |
| Maintainer | Sí | Sí | Sí |
| Owner | Sí | Sí | Sí |

El creador del proyecto queda como propietario.

## Seguridad por proyecto

SprintRoom aísla la información por proyecto:

- Solo miembros del proyecto o administradores pueden ver el detalle.
- Las acciones de escritura dependen del rol del usuario en el proyecto.
- Las claves MCP pertenecen a un proyecto específico.
- Una PROJECT_KEY solo puede acceder al proyecto al que está asociada.
- Las claves MCP se almacenan como hash SHA-256 y el valor plano solo se muestra una vez al generarse.

## Funcionalidades principales

SprintRoom incluye:

- Registro e inicio de sesión con correo y contraseña.
- Inicio de sesión con Google.
- Dashboard general.
- Gestión de proyectos.
- Gestión de miembros.
- Historias de usuario.
- Tablero Kanban por historia.
- Tareas personales.
- Comentarios en tareas.
- Eliminación con confirmación explícita.
- Actividad reciente del proyecto.
- Integración MCP para agentes de IA.
- Asistente “Imagina” para convertir una idea en un proyecto planificado.
- Documentación pública integrada en la plataforma.

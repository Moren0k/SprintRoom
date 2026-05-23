# Plan de ejecucion tecnico SprintRoom

## Stack del proyecto

- **Next.js** (App Router) con TypeScript.
- **InsForge** como backend (base de datos PostgreSQL, autenticacion, storage y funciones serverless).
- **Vitest** como framework de pruebas unitarias.
- Tailwind CSS para estilos.

## Criterios de construccion del backlog

- Base funcional: `docs/sprintroom_business_logic.md`.
- Base de diseno para acceso: se toma como fuente principal la version 2.0 con registro publico y redireccion obligatoria al inicio de sesion.
- Orden arquitectonico de capas dentro del proyecto Next.js/TypeScript:
  1. **Dominio** (`src/domain/`): entidades, value objects, enums, eventos, politicas y servicios puros, sin dependencias externas.
  2. **Aplicacion** (`src/application/`): comandos, queries, DTOs y handlers que orquestan el dominio. Define contratos (puertos) de persistencia y servicios.
  3. **Adaptadores e infraestructura** (`src/lib/` y futuros `src/server/`): implementaciones concretas que conectan los contratos de la capa de aplicacion con InsForge (repositorios, hasher de contrasenas, factoria de tokens, reloj real).
  4. **Interfaz web** (`app/`): rutas Next.js, Server Components, Route Handlers y endpoints que invocan los casos de uso de la capa de aplicacion.
- Granularidad: tareas pequenas, independientes y realizables en pocas horas.

## Tareas

### T001 - [Dominio] Definir matriz de roles, permisos y limites de accion

**Descripcion**: Formalizar la politica de autorizacion del dominio para proyectos y miembros, aclarando quien puede crear proyectos, historias de usuario, tareas, agregar miembros, retirar miembros y ejecutar eliminaciones.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe una matriz explicita de permisos por rol de proyecto y por rol global.
- Se documenta si el creador de proyecto tiene privilegios especiales.
- Se documenta si cualquier miembro puede crear historias de usuario y tareas.
- La decision queda alineada con `docs/sprintroom_business_logic.md` y resuelve el vacio identificado.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T002 - [Dominio] Definir reglas de visibilidad entre usuarios, proyectos y carga de trabajo

**Descripcion**: Precisar que informacion puede consultar un usuario sobre otros usuarios, proyectos y tareas fuera de su contexto directo.

**Criterios de Aceptacion (Definicion de Listo)**:
- Se define la visibilidad de proyectos para usuarios autenticados.
- Se define la visibilidad del detalle de miembros y tareas personales.
- Se define si existe acceso fuera de proyectos compartidos.
- La decision queda documentada como politica de dominio.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T003 - [Dominio] Definir politica de eliminacion y dependencias entre proyecto, historia y tarea

**Descripcion**: Precisar el comportamiento funcional de las eliminaciones y sus efectos sobre elementos dependientes.

**Criterios de Aceptacion (Definicion de Listo)**:
- Se define el comportamiento al eliminar un proyecto con historias y tareas asociadas.
- Se define el comportamiento al eliminar una historia de usuario con tareas asociadas.
- Se define la regla exacta de confirmacion por nombre para acciones destructivas.
- La politica queda expresada como reglas de negocio verificables.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T004 - [Dominio] Definir politica de auditoria y retencion de comentarios

**Descripcion**: Formalizar si los comentarios y cambios relevantes deben conservarse, ocultarse o eliminarse y bajo que reglas.

**Criterios de Aceptacion (Definicion de Listo)**:
- Se define si los comentarios son inmutables, editables o eliminables.
- Se define el criterio de retencion historica para comentarios y eventos relevantes.
- Se documenta el alcance minimo de auditoria requerido por el negocio.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T005 - [Dominio] Crear estructura base del dominio y contratos transversales

**Descripcion**: Crear la base del modelo de dominio en TypeScript con entidades base, identificadores fuertes (branded types), auditoria basica y contratos necesarios para agregados y eventos de dominio.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen abstracciones base para entidad, aggregate root y value object en `src/domain/abstractions/`.
- Existen identificadores tipados (branded types) para Usuario, Proyecto, Historia de Usuario, Tarea y Comentario en `src/domain/ids/`.
- La capa dominio no depende de infraestructura ni de la interfaz web.
- Incluye pruebas unitarias de las piezas base con Vitest.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T006 - [Dominio] Implementar Value Objects del lenguaje del negocio

**Descripcion**: Modelar los value objects necesarios para proteger invariantes del dominio en nombres, descripciones, correo, referencia externa del proyecto y textos de comentario.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen value objects en `src/domain/value-objects/` para datos sensibles a validacion.
- Cada value object encapsula sus reglas de formato y longitud.
- Los errores de validacion son expresivos y comprobables (lanzan `DomainError`).
- Incluye pruebas unitarias de invariantes y casos invalidos.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T007 - [Dominio] Modelar agregado Usuario y perfil de cuenta

**Descripcion**: Construir el agregado que representa al usuario autenticable, su perfil y las reglas minimas de registro publico y alta administrativa.

**Criterios de Aceptacion (Definicion de Listo)**:
- El agregado soporta registro publico con datos basicos.
- El agregado soporta actualizacion de perfil basica.
- Se separan claramente datos de identidad y datos operativos de cuenta.
- Incluye pruebas unitarias de registro y actualizacion.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T008 - [Dominio] Modelar agregado Proyecto con miembros y documentacion editable

**Descripcion**: Construir el agregado Proyecto como raiz principal del contexto de colaboracion.

**Criterios de Aceptacion (Definicion de Listo)**:
- El agregado permite crear proyecto con informacion basica.
- El agregado permite actualizar documentacion y datos editables.
- El agregado permite agregar y retirar miembros segun las politicas definidas.
- Incluye pruebas unitarias de invariantes y reglas de membresia.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T009 - [Dominio] Modelar agregado Historia de Usuario y su progreso

**Descripcion**: Construir el agregado de historia de usuario como unidad funcional intermedia del proyecto.

**Criterios de Aceptacion (Definicion de Listo)**:
- La historia de usuario solo puede existir dentro de un proyecto.
- El agregado protege sus datos basicos y su identidad funcional.
- El progreso de la historia de usuario se calcula desde sus tareas.
- Incluye pruebas unitarias del calculo de avance.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T010 - [Dominio] Modelar agregado Tarea y entidad Comentario

**Descripcion**: Construir la tarea como unidad granular y la conversacion asociada como parte de su contexto.

**Criterios de Aceptacion (Definicion de Listo)**:
- La tarea solo puede existir dentro de una historia de usuario.
- La tarea conserva su informacion descriptiva y su contexto de trabajo.
- Los comentarios registran autor, contenido y fecha.
- Incluye pruebas unitarias de alta de tarea y agregado de comentarios.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T011 - [Dominio] Implementar servicios de dominio para metricas y confirmacion destructiva

**Descripcion**: Encapsular las reglas transversales de calculo de avance de proyecto y validacion de eliminacion por escritura exacta.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe un servicio o politica de dominio para recalculo de avance de proyecto.
- Existe una politica de confirmacion destructiva reutilizable.
- Las reglas pueden probarse de forma aislada.
- Incluye pruebas unitarias de escenarios nominales y de rechazo.

**Capa afectada**: Dominio

**Estado**: [X] Completada

### T012 - [Aplicacion] Implementar casos de uso de registro publico, inicio de sesion y alta administrativa

**Descripcion**: Crear los comandos y handlers para registro publico, autenticacion y alta de nuevos usuarios desde flujo administrativo.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe caso de uso para registro publico con redireccion funcional posterior a inicio de sesion.
- Existe caso de uso para inicio de sesion.
- Existe caso de uso para alta administrativa de usuario.
- Incluye pruebas unitarias o de aplicacion para validaciones y rutas de error.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T013 - [Aplicacion] Implementar casos de uso de cuenta y perfil del usuario

**Descripcion**: Crear los casos de uso para consultar y actualizar la informacion de cuenta del usuario autenticado.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe consulta del perfil actual.
- Existe comando de actualizacion de perfil.
- Las validaciones reutilizan reglas del dominio.
- Incluye pruebas de aplicacion para permisos y validaciones.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T014 - [Aplicacion] Implementar casos de uso de creacion y listado general de proyectos

**Descripcion**: Construir los flujos de aplicacion para crear proyectos y exponer su listado general con datos agregados.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe comando de creacion de proyecto.
- Existe consulta de listado general de proyectos.
- La salida identifica los proyectos creados por el usuario activo si la politica lo permite.
- Incluye pruebas de aplicacion sobre validaciones y permisos.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T015 - [Aplicacion] Implementar casos de uso de gestion de documentacion y miembros del proyecto

**Descripcion**: Crear los flujos para actualizar datos del proyecto, agregar miembros y retirar miembros.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe comando para editar la informacion del proyecto.
- Existe comando para incorporar miembros al proyecto.
- Existe comando para retirar miembros del proyecto.
- Incluye pruebas de aplicacion para autorizacion y consistencia.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T016 - [Aplicacion] Implementar caso de uso de detalle operacional del proyecto

**Descripcion**: Crear la consulta que devuelve la vista de trabajo del proyecto con documentacion, metricas y accesos a sus secciones internas.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe consulta de detalle de proyecto.
- La consulta expone avance global y datos documentales.
- La consulta respeta reglas de visibilidad definidas.
- Incluye pruebas de aplicacion para autorizacion y composicion del resultado.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T017 - [Aplicacion] Implementar casos de uso de historias de usuario

**Descripcion**: Construir los flujos para crear, listar y consultar detalle de historias de usuario dentro de un proyecto.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe comando de creacion de historia de usuario.
- Existe consulta de listado por proyecto.
- Existe consulta de detalle de historia de usuario.
- Incluye pruebas de aplicacion de permisos y coherencia con el proyecto padre.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T018 - [Aplicacion] Implementar casos de uso de tareas en contexto de proyecto e historia

**Descripcion**: Construir los flujos para crear tareas y consultarlas por proyecto, por historia y por contexto personal del usuario.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe comando de creacion de tarea.
- Existe consulta de tareas por proyecto.
- Existe consulta de tareas por historia de usuario.
- Existe consulta de tareas personales del usuario.
- Incluye pruebas de aplicacion para filtros, permisos y pertenencia.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T019 - [Aplicacion] Implementar casos de uso de detalle de tarea y comentarios

**Descripcion**: Construir el flujo para obtener el detalle funcional de una tarea y registrar comentarios sobre ella.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe consulta de detalle de tarea.
- Existe comando para agregar comentario.
- La consulta devuelve la conversacion asociada.
- Incluye pruebas de aplicacion de autorizacion y reglas de comentario.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T020 - [Aplicacion] Implementar casos de uso de detalle de miembro dentro del proyecto

**Descripcion**: Construir la consulta que devuelve la informacion y metricas de un miembro dentro de un proyecto.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe consulta de detalle de miembro por proyecto.
- La consulta expone perfil, carga de trabajo y metricas permitidas por la politica de visibilidad.
- El resultado se limita al contexto del proyecto consultado.
- Incluye pruebas de aplicacion para autorizacion y composicion.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T021 - [Aplicacion] Implementar casos de uso de eliminacion con confirmacion estricta

**Descripcion**: Crear comandos de eliminacion para proyecto, historia de usuario y tarea usando confirmacion explicita por nombre.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen comandos de eliminacion para los elementos permitidos por negocio.
- Cada comando exige la confirmacion definida por la politica de dominio.
- Se respetan las dependencias y restricciones definidas en T003.
- Incluye pruebas de aplicacion para confirmaciones validas e invalidas.

**Capa afectada**: Aplicacion

**Estado**: [X] Completada

### T022 - [Adaptadores] Implementar repositorios InsForge y orquestacion transaccional

**Descripcion**: Construir la implementacion concreta de los puertos `UserRepository`, `ProjectRepository`, `UserStoryRepository`, `SprintTaskRepository` y `UnitOfWork` apoyada en el SDK de InsForge (PostgreSQL via PostgREST).

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen adaptadores concretos para los puertos de la capa de aplicacion bajo `src/lib/` o `src/server/`.
- La infraestructura respeta limites entre agregados y no filtra logica al acceso a datos.
- Existe mecanismo de transaccion consistente para los casos de uso.
- Incluye pruebas de integracion contra una instancia de InsForge (o stubs verificados).

**Capa afectada**: Adaptadores e infraestructura

**Estado**: [X] Completada

**Notas de validacion**:
- Se instalo `@insforge/sdk` como dependencia runtime y se agrego `.env.example` con variables requeridas.
- La migracion `20260522223731_application-core-schema.sql` ya aparece aplicada en InsForge; los adaptadores mapean enums del dominio a los codigos `smallint` existentes.
- Se implementaron gateway SDK, mappers, repositorios InsForge y `InsForgeUnitOfWork` con tracking de agregados.
- Validado con `npm test`, `npm run typecheck` y `npm run lint`.

### T023 - [Adaptadores] Implementar configuracion de autenticacion y gestion de credenciales

**Descripcion**: Resolver los adaptadores de autenticacion sobre InsForge: hasher de contrasenas, factoria de tokens de sesion y resolucion del usuario autenticado en cada peticion Next.js.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe almacenamiento seguro de credenciales utilizando InsForge Auth o un hasher equivalente justificado.
- Existe adaptador para autenticacion del usuario.
- Existe resolucion del usuario autenticado para la capa de aplicacion desde el contexto Next.js (cookies/headers).
- Incluye pruebas de integracion de autenticacion.

**Capa afectada**: Adaptadores e infraestructura

**Estado**: [X] Completada

**Notas de validacion**:
- Se implemento `Pbkdf2PasswordHasher` con PBKDF2-SHA256 y sal por credencial.
- Se implementaron `HmacSessionTokenFactory` y `HmacSessionTokenVerifier` para sesiones firmadas con expiracion.
- Se agrego resolucion de usuario actual desde `Authorization: Bearer` o cookie `sprintroom_session`.
- Validado con `npm test`, `npm run typecheck` y `npm run lint`.

### T024 - [Adaptadores] Implementar modelos de lectura y consultas optimizadas para dashboard

**Descripcion**: Construir proyecciones o consultas optimizadas para home, proyectos, tareas personales y detalle de miembros usando InsForge.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen consultas optimizadas para el panel principal.
- Existen consultas optimizadas para listados de proyecto e historia.
- Las consultas respetan reglas de visibilidad.
- Incluye pruebas de integracion sobre resultados y filtros.

**Capa afectada**: Adaptadores e infraestructura

**Estado**: [X] Completada

**Notas de validacion**:
- Se implemento `InsForgeDashboardReadModel` con cargas por lotes para proyectos visibles, historias, tareas, asignaciones y comentarios.
- Se expusieron DTOs estables para dashboard, tareas personales, listado de proyectos y detalle de miembro.
- Las consultas respetan visibilidad por membresia y rol `Administrator`.
- Validado con `npm test`, `npm run typecheck` y `npm run lint`.

### T025 - [Adaptadores] Implementar estrategia de auditoria funcional y conservacion de comentarios

**Descripcion**: Materializar en infraestructura las decisiones tomadas en T004 para trazabilidad y conservacion de informacion relevante.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existe mecanismo de persistencia de auditoria acorde al alcance aprobado.
- Existe politica tecnica para retencion de comentarios.
- La solucion no contamina la capa de dominio.
- Incluye pruebas de integracion de trazabilidad minima.

**Capa afectada**: Adaptadores e infraestructura

**Estado**: [X] Completada

**Notas de validacion**:
- Se agrego y aplico la migracion `20260523111500_audit-and-comment-retention.sql`.
- Se crearon las tablas `audit_events` y `retained_task_comments`; verificadas con `npx @insforge/cli db tables --json`.
- Se implemento `InsForgeAuditLogger` y retencion automatica de comentarios antes de eliminar tareas desde `InsForgeUnitOfWork`.
- Validado con `npm test`, `npm run typecheck` y `npm run lint`.

### T026 - [Interfaz web] Exponer rutas Next.js de acceso, registro y cuenta

**Descripcion**: Publicar los Route Handlers y/o Server Actions necesarios para registro publico, inicio de sesion, alta administrativa y gestion de cuenta. Cada ruta invoca los casos de uso correspondientes de la capa de aplicacion.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen endpoints para registro publico e inicio de sesion.
- Existen endpoints para consulta y actualizacion de cuenta.
- Existe endpoint para alta administrativa si la politica de permisos lo permite.
- Incluye pruebas funcionales de contrato y autorizacion.

**Capa afectada**: Interfaz web (Next.js)

**Estado**: [X] Completada

**Notas de validacion**:
- Se expusieron rutas `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET/PATCH /api/account` y `POST /api/admin/users`.
- Las rutas componen dependencias desde `src/server/application-scope.ts`, validan JSON y normalizan errores HTTP.
- `login` establece cookie httpOnly `sprintroom_session`; `logout` la expira.
- Validado con `npm test`, `npm run typecheck` y `npm run lint`.

### T027 - [Interfaz web] Exponer rutas Next.js de proyectos y miembros

**Descripcion**: Publicar Route Handlers y/o Server Actions para crear, listar, consultar detalle, editar proyecto y gestionar miembros.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen endpoints para crear y listar proyectos.
- Existe endpoint de detalle de proyecto.
- Existen endpoints para editar proyecto, agregar miembros y retirar miembros.
- Incluye pruebas funcionales de contrato, autorizacion y errores de negocio.

**Capa afectada**: Interfaz web (Next.js)

**Estado**: [X] Completada

**Notas de validacion**:
- Se expusieron `GET/POST /api/projects`, `GET/PATCH /api/projects/[projectId]`, `POST /api/projects/[projectId]/members` y `GET/DELETE /api/projects/[projectId]/members/[userId]`.
- Las rutas invocan handlers de aplicacion y registran auditoria en creacion, actualizacion y gestion de miembros.
- Validado con `npm test`, `npm run typecheck` y `npm run lint`.

### T028 - [Interfaz web] Exponer rutas Next.js de historias de usuario

**Descripcion**: Publicar Route Handlers y/o Server Actions para crear, listar y consultar detalle de historias de usuario.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen endpoints para crear historia de usuario.
- Existen endpoints de listado por proyecto y detalle por identificador.
- Los contratos reflejan las metricas de avance requeridas.
- Incluye pruebas funcionales de contrato y autorizacion.

**Capa afectada**: Interfaz web (Next.js)

**Estado**: [X] Completada

**Notas de validacion**:
- Se expusieron `GET/POST /api/projects/[projectId]/user-stories` y `GET /api/user-stories/[userStoryId]`.
- La creacion invoca el caso de uso de aplicacion y registra auditoria `user_story.created`.
- Validado con `npm test`, `npm run typecheck` y `npm run lint`.

### T029 - [Interfaz web] Exponer rutas Next.js de tareas y comentarios

**Descripcion**: Publicar Route Handlers y/o Server Actions para crear tareas, consultarlas por contexto, obtener su detalle y registrar comentarios.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen endpoints para crear tarea.
- Existen endpoints para listar tareas por proyecto, por historia y por contexto personal.
- Existe endpoint de detalle de tarea.
- Existe endpoint para agregar comentarios.
- Incluye pruebas funcionales de contrato, autorizacion y errores de negocio.

**Capa afectada**: Interfaz web (Next.js)

**Estado**: [X] Completada

**Notas de validacion**:
- Se expusieron `GET/POST /api/tasks`, `GET /api/tasks/[sprintTaskId]` y `POST /api/tasks/[sprintTaskId]/comments`.
- `GET /api/tasks` soporta filtros por `projectId`, por `userStoryId` o listado personal por defecto.
- La creacion de tareas y comentarios registra auditoria.
- Validado con `npm test`, `npm run typecheck` y `npm run lint`.

### T030 - [Interfaz web] Exponer rutas Next.js de eliminacion segura

**Descripcion**: Publicar Route Handlers y/o Server Actions para eliminaciones permitidas con confirmacion estricta por nombre y validacion de dependencias.

**Criterios de Aceptacion (Definicion de Listo)**:
- Existen endpoints de eliminacion para las entidades aprobadas.
- Los contratos exigen confirmacion explicita.
- Los errores informan por que una eliminacion no puede ejecutarse.
- Incluye pruebas funcionales de confirmacion y restricciones.

**Capa afectada**: Interfaz web (Next.js)

**Estado**: [X] Completada

**Notas de validacion**:
- Se agregaron `DELETE /api/projects/[projectId]`, `DELETE /api/user-stories/[userStoryId]` y `DELETE /api/tasks/[sprintTaskId]`.
- Todos los endpoints exigen `confirmationName` y delegan reglas de dependencias a los casos de uso de aplicacion.
- La eliminacion de tareas conserva comentarios en `retained_task_comments` via `InsForgeUnitOfWork` y registra auditoria.
- Validado con `npm test`, `npm run typecheck` y `npm run lint`.

## Nota final de auditoria T022-T030

**Fecha**: 2026-05-23

**Validaciones ejecutadas**:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npx @insforge/cli db tables --json`
- `npx @insforge/cli db migrations list --json`

**Hallazgos**:
- El tracker `task.md` sigue siendo util como historico del backlog tecnico backend. T001-T030 quedaron completadas; para el siguiente bloque de frontend puede reutilizarse agregando una nueva seccion de tareas de interfaz.
- El `UnitOfWork` InsForge coordina persistencia, pero no puede garantizar transacciones reales sobre multiples llamadas PostgREST. El limite quedo documentado en `docs/sprintroom_infrastructure_notes.md`.
- `opencode.json` contiene configuracion local con API key y no debe entrar al repositorio.

**Correcciones realizadas**:
- Se evito que filtros `IN []` llamen a PostgREST con sentinels no-UUID.
- Se cambio `InsForgeUnitOfWork` para persistir solo agregados nuevos, eliminados o realmente modificados.
- Se endurecio validacion de strings obligatorios, UUIDs entrantes y arreglos de UUIDs en rutas API.
- Se reforzo validacion de estructura de tokens HMAC y se evito que password vacio en verificacion produzca error interno.
- Se agrego `opencode.json` a `.gitignore`.

**Riesgos pendientes**:
- Auditoria y mutacion funcional no son atomicas entre si si se ejecutan como llamadas SDK separadas.
- Para atomicidad estricta futura, los flujos criticos deben moverse a RPC PostgreSQL o funcion serverless transaccional.

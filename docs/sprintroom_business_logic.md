# SprintRoom: Logica de negocio y funcionalidad

## Alcance y fuente

- Fuente analizada: pagina de Notion `SprintRoom > Descripcion del proyecto`.
- Alcance de este documento: sintetizar reglas de negocio, casos de uso, flujos y requerimientos funcionales.
- Exclusiones aplicadas: este documento omite detalles de implementacion y vistas operativas que no aportan a la logica de negocio consolidada.
- Criterio de interpretacion: se prioriza `VERSION 2.0` por ser la descripcion mas reciente. Las versiones anteriores solo se usan para detectar contradicciones o vacios.

## Vision funcional del producto

SprintRoom es una plataforma cerrada para organizar el trabajo de equipos mediante una estructura jerarquica:

1. La aplicacion contiene proyectos.
2. Cada proyecto contiene historias de usuario.
3. Cada historia de usuario contiene tareas.

El producto busca centralizar el contexto de trabajo, la documentacion del proyecto, la colaboracion entre miembros y el seguimiento del avance general, manteniendo un flujo simple y controlado.

## Entidades funcionales principales

### Usuario

- Puede autenticarse en la plataforma.
- Tiene perfil de cuenta con informacion basica editable.
- Puede participar en proyectos.
- Puede visualizar su carga de trabajo personal y su avance individual dentro de un proyecto.

### Proyecto

- Es el contenedor principal de trabajo.
- Tiene nombre, descripcion, fecha de creacion y referencia externa del proyecto.
- Mantiene documentacion editable.
- Tiene avance global calculado automaticamente.
- Reune miembros, historias de usuario y tareas.

### Historia de usuario

- Es la unidad principal de funcionalidad dentro de un proyecto.
- Reemplaza el uso de epicas para reducir ambiguedad.
- Tiene identidad propia, descripcion y avance calculado.
- Sirve de contenedor para tareas.

### Tarea

- Es la unidad mas granular de ejecucion.
- Pertenece a una historia de usuario y, por transitividad, a un proyecto.
- Tiene informacion descriptiva suficiente para seguimiento operativo.
- Alimenta los calculos de avance del resto de la plataforma.

### Comentario de tarea

- Permite conversacion contextual sobre una tarea.
- Conserva autor, contenido y fecha de emision.
- Funciona como registro visible de comunicacion alrededor de una tarea.

## Casos de uso principales

### Acceso y entrada al sistema

- Un visitante puede llegar a una pagina publica de presentacion del producto.
- Un usuario puede registrarse con un formulario simple.
- Tras registrarse, el sistema lo redirige al inicio de sesion antes de permitir el acceso.
- Un usuario existente puede iniciar sesion y entrar al panel principal.
- Un usuario autenticado puede administrar los datos de su cuenta.

### Gestion de proyectos

- Crear un proyecto con informacion basica.
- Consultar el listado general de proyectos.
- Diferenciar visualmente los proyectos creados por el usuario activo.
- Abrir un proyecto para entrar a sus areas internas de gestion.
- Editar la documentacion y datos generales del proyecto.
- Incorporar nuevos miembros al proyecto.
- Consultar el detalle funcional de cada miembro del proyecto.

### Gestion de historias de usuario

- Consultar el listado de historias de usuario de un proyecto.
- Crear una nueva historia de usuario.
- Entrar al detalle de una historia de usuario.
- Consultar el avance individual de cada historia de usuario.

### Gestion de tareas

- Consultar tareas dentro del contexto personal, del proyecto o de una historia de usuario.
- Crear nuevas tareas dentro de un proyecto.
- Abrir el detalle completo de una tarea.
- Consultar conversacion y contexto asociados a una tarea.

### Gestion de miembros

- Incorporar usuarios al ecosistema mediante un flujo administrativo.
- Incorporar participantes a un proyecto.
- Consultar informacion resumida y detallada de cada miembro dentro de un proyecto.
- Retirar un miembro de un proyecto.

## Reglas de negocio

### Estructura del dominio

- Un proyecto agrupa toda la informacion y el contexto de trabajo de una iniciativa.
- Las historias de usuario son el nivel funcional intermedio obligatorio dentro del proyecto.
- Las tareas siempre dependen de una historia de usuario.

### Progreso y metricas

- El avance de una historia de usuario se calcula a partir del avance registrado por sus tareas.
- El avance total de un proyecto se calcula como el promedio del avance de todas sus historias de usuario.
- Las tareas son la fuente base para el calculo del progreso en toda la plataforma.

### Control de acceso y seguridad

- El acceso efectivo al sistema solo ocurre despues de autenticacion.
- El registro no concede acceso directo: despues del alta, el usuario debe iniciar sesion.
- La plataforma se concibe como un entorno controlado y cerrado.

### Creacion y eliminacion

- La creacion de proyectos, historias de usuario, tareas y usuarios depende de formularios guiados.
- Toda accion destructiva requiere confirmacion estricta escribiendo el nombre exacto del elemento a eliminar.

### Colaboracion

- Cada proyecto mantiene una lista de miembros visible desde su documentacion.
- Las tareas disponen de un espacio conversacional persistente para coordinar trabajo sobre un elemento puntual.

## Flujos funcionales

### Flujo de incorporacion de usuario

1. El usuario llega a la pagina publica.
2. El usuario se registra o accede con una cuenta existente.
3. Si el registro es exitoso, el sistema redirige al inicio de sesion.
4. Tras autenticarse, el usuario entra al panel principal.

### Flujo de creacion de proyecto

1. El usuario inicia la accion de crear proyecto desde una vista principal.
2. Registra la informacion basica del proyecto.
3. Puede agregar participantes durante la creacion.
4. El proyecto queda disponible en el listado general y en el panel principal.

### Flujo de gestion interna de proyecto

1. El usuario abre un proyecto desde el listado general.
2. Ingresa a un menu interno de gestion del proyecto.
3. Desde alli consulta y actualiza documentacion.
4. Gestiona historias de usuario.
5. Gestiona tareas.
6. Revisa el avance global del proyecto.
7. Consulta el detalle de miembros y su informacion dentro del proyecto.

### Flujo de trabajo sobre una historia de usuario

1. El usuario entra al listado de historias de usuario del proyecto.
2. Abre una historia especifica.
3. Consulta las tareas pertenecientes a esa historia.
4. Puede crear nuevas tareas dentro de ese contexto.

### Flujo de inspeccion de tarea

1. El usuario abre una tarea desde cualquiera de las vistas que la exponen.
2. El sistema muestra el detalle funcional de la tarea.
3. El usuario consulta la conversacion asociada.
4. La tarea actua como punto central de seguimiento y comunicacion.

### Flujo de administracion de miembros

1. El usuario accede a la documentacion del proyecto.
2. Consulta la lista de miembros.
3. Abre el detalle de un miembro.
4. Revisa su informacion general y sus metricas dentro del proyecto.
5. Puede retirarlo del proyecto si corresponde.

## Requerimientos funcionales sintetizados

### Acceso, cuenta y usuarios

- Debe existir una pagina publica de presentacion del producto.
- Debe existir registro de usuario con formulario simple.
- Debe existir inicio de sesion independiente del registro.
- Debe existir gestion de cuenta del usuario autenticado.
- Debe existir un flujo administrativo para crear nuevos usuarios.

### Proyectos

- Debe existir un listado general de proyectos.
- Debe poder crearse un proyecto con informacion basica.
- Debe poder editarse la documentacion y los datos generales del proyecto.
- Debe existir una vista interna del proyecto con sus areas funcionales principales.
- Debe mostrarse el avance global del proyecto.

### Historias de usuario

- Debe existir listado de historias de usuario por proyecto.
- Debe poder crearse una historia de usuario.
- Debe existir detalle navegable por historia de usuario.
- Debe mostrarse el avance individual de cada historia de usuario.

### Tareas

- Debe existir un detalle completo de cada tarea.
- Debe poder crearse una tarea en el contexto del proyecto.
- Debe existir visualizacion de tareas en contexto personal, de proyecto y de historia de usuario.
- Debe existir un espacio de comentarios asociado a cada tarea.

### Miembros y colaboracion

- Debe existir listado de miembros por proyecto.
- Debe poder agregarse personas a un proyecto.
- Debe existir vista detallada de miembro dentro del proyecto.
- Debe poder retirarse un miembro del proyecto.

### Reglas transversales

- Deben calcularse metricas de avance de forma automatica.
- Debe existir confirmacion estricta para eliminaciones.

## Vacios y contradicciones detectados en la fuente

### Contradicciones

- `VERSION 2.0` y `VERSION 1.5` describen registro directo desde una pagina publica.
- `VERSION 1.0` indica que el alta de usuarios no es publica y depende de invitacion o administracion interna.
- `VERSION 2.0` y `VERSION 1.5` mencionan un flujo de alta administrativa de nuevos usuarios, pero no aclaran si convive con el registro publico o si lo reemplaza.

### Vacios

- No se definen con precision los permisos por rol dentro de proyecto.
- No se aclara si cualquier miembro puede crear proyectos, historias de usuario y tareas, o si existen restricciones por permisos.
- No se especifican reglas de visibilidad entre usuarios fuera de un mismo proyecto.
- No se detallan reglas de auditoria, historial de cambios o retencion de comentarios.
- No se define el comportamiento exacto ante eliminacion de proyectos, historias de usuario o tareas relacionadas.

## Notas de uso

- Este documento debe usarse como referencia de negocio y no como especificacion tecnica.
- Si la pagina de Notion se actualiza, conviene revalidar especialmente las reglas de alta de usuarios y permisos, porque son los puntos con mayor ambiguedad actual.

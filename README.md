# SprintRoom

Aplicacion web para organizar el trabajo de equipos mediante una jerarquia clara: la aplicacion contiene proyectos, cada proyecto contiene historias de usuario y cada historia contiene tareas.

## Stack

- **Next.js** (App Router) + **React 19**
- **TypeScript** estricto
- **InsForge** como Backend-as-a-Service (PostgreSQL + auth + storage + functions). Ver [`AGENTS.md`](./AGENTS.md) para la documentacion del SDK y convenciones.
- **Tailwind CSS** para estilos
- **Vitest** para pruebas unitarias

## Estructura del proyecto

```
app/                 # Rutas y vistas del App Router de Next.js
docs/                # Documentacion funcional y decisiones de dominio
migrations/          # Migraciones SQL ejecutadas en InsForge
public/              # Assets estaticos
src/
  domain/            # Entidades, value objects, enums, eventos, politicas
                     # y servicios de dominio. Sin dependencias externas.
  application/       # Casos de uso (commands/queries), DTOs, contratos
                     # de repositorio y errores de aplicacion.
  lib/               # Utilidades compartidas: reloj del sistema, helpers,
                     # adaptadores (p.ej. clientes InsForge).
tests/
  domain/            # Pruebas unitarias de la capa de dominio
  application/       # Pruebas de casos de uso con repositorios in-memory
```

Reglas de capa:

- `src/domain` no depende de ninguna capa.
- `src/application` depende solo de `src/domain` y de los contratos en `application/abstractions`.
- `src/lib` (y futuras adaptaciones tipo `src/server`) son las unicas que pueden conocer InsForge u otra infraestructura.

## Comandos

```bash
npm install          # Instala dependencias
npm run dev          # Levanta el servidor de desarrollo de Next.js
npm run build        # Compila la aplicacion para produccion
npm run start        # Sirve la build de produccion
npm run lint         # Ejecuta ESLint
npm run typecheck    # Verifica los tipos con TypeScript sin emitir
npm test             # Ejecuta las pruebas con Vitest
```

Abre [http://localhost:3000](http://localhost:3000) con tu navegador para ver el resultado en desarrollo.

## Pruebas

Las pruebas estan escritas con [Vitest](https://vitest.dev/) y cubren:

- Value objects (validaciones, normalizacion)
- Agregados (Project, UserStory, SprintTask, User)
- Politicas de autorizacion y visibilidad
- Servicios de dominio (calculo de progreso, guardas de eliminacion)
- Casos de uso de aplicacion con repositorios in-memory

Para ejecutarlas:

```bash
npm test
```

## Documentacion adicional

- [`docs/sprintroom_business_logic.md`](./docs/sprintroom_business_logic.md): logica de negocio derivada de Notion.
- [`docs/sprintroom_domain_decisions.md`](./docs/sprintroom_domain_decisions.md): decisiones de dominio para resolver vacios funcionales.
- [`docs/sprintroom_infrastructure_notes.md`](./docs/sprintroom_infrastructure_notes.md): limites y notas de infraestructura InsForge.
- [`task.md`](./task.md): plan de ejecucion tecnico y backlog.
- [`AGENTS.md`](./AGENTS.md): convenciones del proyecto y documentacion de InsForge.

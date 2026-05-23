import Link from "next/link";
import DemoBoard from "@/components/demo-board";
import ChatBot from "@/components/chatbot";

export default function HomePage() {
  return (
    <>
      {/* ---- Hero: full viewport ---- */}
      <section className="relative grid min-h-screen place-items-center overflow-hidden px-6">
        {/* Orbes de fondo */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="orb-float-1 absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-[var(--orb-1)] blur-[120px]" />
          <div className="orb-float-2 absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[var(--orb-2)] blur-[100px]" />
          <div className="orb-float-1 absolute -bottom-20 left-1/3 h-[350px] w-[350px] rounded-full bg-[var(--orb-3)] blur-[90px]" />
        </div>

        {/* Top: auth links + firma */}
        <div className="fade-up absolute top-8 flex flex-col items-center gap-1 sm:top-12">
          <div className="flex items-center gap-3 text-xs text-[var(--muted)] sm:text-sm">
            <Link
              href="/register"
              className="transition hover:text-[var(--foreground)]"
            >
              Crear cuenta gratis
            </Link>
            <span className="text-[var(--hairline)]">|</span>
            <Link
              href="/login"
              className="transition hover:text-[var(--foreground)]"
            >
              Iniciar sesion
            </Link>
          </div>
          <span className="text-[10px] text-[var(--muted)] opacity-50">
            By RuntimeStudiosDev
          </span>
        </div>

        {/* Centro: marca */}
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="fade-up bg-gradient-to-b from-[var(--foreground)] to-[var(--muted)] bg-clip-text text-[clamp(3.5rem,12vw,8rem)] font-bold tracking-tighter text-transparent leading-none">
            SprintRoom
          </h1>
          <p className="fade-up-delay-1 max-w-md text-balance text-base text-[var(--muted)] sm:text-lg">
            Coordina cada sprint sin perder de vista el contexto.
          </p>
        </div>

        {/* Flecha hacia abajo */}
        <a
          href="#content"
          className="arrow-bounce absolute bottom-8"
          aria-label="Ver mas informacion"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--muted)]"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </a>
      </section>

      {/* ---- Contenido del proyecto ---- */}
      <section id="content">
        {/* Demo interactivo — exactamente 100vh, nunca se sale */}
        <section className="flex h-screen flex-col border-t border-[var(--hairline)] overflow-hidden">
          <div className="flex flex-1 flex-col px-6 py-8 mx-auto w-full max-w-6xl min-h-0 overflow-hidden">
            <div className="mx-auto max-w-2xl text-center shrink-0">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                Pruébalo antes de usarlo
              </h2>
              <p className="mt-2 text-[var(--muted)]">
                Mueve tareas entre columnas, agrega comentarios y mira el progreso en tiempo real.
              </p>
            </div>
            <div className="mt-5 flex-1 min-h-0 overflow-hidden">
              <DemoBoard />
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="border-t border-[var(--hairline)] bg-[var(--background)] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                De la idea al entregable, en tres niveles
              </h2>
              <p className="mt-4 text-[var(--muted)]">
                SprintRoom organiza tu trabajo con una estructura jerarquica que
                elimina el ruido y mantiene a tu equipo enfocado en lo que
                importa.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <Step
                number="01"
                title="Proyecto"
                tag="Contenedor principal"
                lines={[
                  "Agrupa toda la documentacion, miembros y contexto de una iniciativa.",
                  "Cada proyecto tiene un avance global que se calcula solo.",
                ]}
              />
              <Step
                number="02"
                title="Historia de usuario"
                tag="Unidad funcional"
                lines={[
                  "Divide el trabajo en funcionalidades con identidad y progreso propios.",
                  "Cada historia agrupa tareas y muestra su avance en tiempo real.",
                ]}
              />
              <Step
                number="03"
                title="Tarea"
                tag="Unidad de ejecucion"
                lines={[
                  "El grano mas fino del trabajo. Descripcion, asignacion y seguimiento.",
                  "Cada tarea tiene su propio hilo de comentarios para centralizar la comunicacion.",
                ]}
              />
            </div>
          </div>
        </section>

        {/* Beneficios */}
        <section className="border-t border-[var(--hairline)] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                Por que SprintRoom
              </h2>
              <p className="mt-4 text-[var(--muted)]">
                No es solo un organizador de tareas. Es la forma de mantener el
                contexto vivo junto al trabajo.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Benefit
                icon={
                  <ChartIcon />
                }
                title="Progreso que fluye solo"
                description="El avance de cada tarea alimenta automaticamente la historia y el proyecto. Sin planillas, sin estimaciones manuales."
              />
              <Benefit
                icon={
                  <MessageIcon />
                }
                title="Conversaciones donde nacen"
                description="Cada tarea tiene un hilo de comentarios persistente. El contexto no se pierde en chats externos ni en correos."
              />
              <Benefit
                icon={
                  <ShieldIcon />
                }
                title="Control total sin ruido"
                description="Roles claros, visibilidad controlada y confirmacion estricta al eliminar. Nada se mueve sin autorizacion."
              />
              <Benefit
                icon={
                  <UsersIcon />
                }
                title="Colaboracion transparente"
                description="Cada miembro ve su carga de trabajo y su impacto en el avance del proyecto. Todos saben que hacer."
              />
              <Benefit
                icon={
                  <FocusIcon />
                }
                title="Enfocado en lo importante"
                description="Estructura simple: proyectos, historias y tareas. Sin epicas, sin tableros complejos, sin configuracion infinita."
              />
              <Benefit
                icon={
                  <LockIcon />
                }
                title="Entorno cerrado y seguro"
                description="Solo los miembros del proyecto acceden a su contenido. Ideal para equipos que manejan informacion sensible."
              />
            </div>
          </div>
        </section>

        {/* Flujo de trabajo visual */}
        <section className="border-t border-[var(--hairline)] bg-[var(--background)] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                Asi funciona en tu dia a dia
              </h2>
              <p className="mt-4 text-[var(--muted)]">
                Desde que llegas hasta que cierras el sprint, todo esta a un
                clic de distancia.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <WorkflowStep
                number="1"
                title="Crea un proyecto"
                description="Define el nombre, la descripcion y agrega a los miembros de tu equipo."
              />
              <WorkflowStep
                number="2"
                title="Define historias"
                description="Divide el proyecto en funcionalidades concretas con identidad propia."
              />
              <WorkflowStep
                number="3"
                title="Asigna tareas"
                description="Desglosa cada historia en tareas ejecutables con responsables claros."
              />
              <WorkflowStep
                number="4"
                title="Da seguimiento"
                description="Revisa el avance, comenta en las tareas y cierra el sprint con datos reales."
              />
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-[var(--hairline)] py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Listo para organizar tu proximo sprint?
            </h2>
            <p className="mt-4 text-[var(--muted)]">
              Crea tu cuenta gratis y empieza a trabajar con una estructura clara
              desde el primer dia.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--glass)] px-7 py-3 text-sm font-medium text-[var(--foreground)] shadow-xs backdrop-blur-xl transition hover:bg-[var(--glass-strong)] active:scale-[0.97]"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-[var(--hairline)] bg-transparent px-7 py-3 text-sm font-medium text-[var(--foreground)] backdrop-blur-xl transition hover:bg-[var(--glass)] active:scale-[0.97]"
              >
                Iniciar sesion
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[var(--hairline)] py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-[var(--muted)] sm:flex-row">
            <p>&copy; {new Date().getFullYear()} SprintRoom</p>
            <p>Hecho con Next.js, TypeScript e InsForge.</p>
          </div>
        </footer>
      </section>

      <ChatBot />
    </>
  );
}

/* ─── Componentes ─── */

function Step({
  number,
  title,
  tag,
  lines,
}: {
  number: string;
  title: string;
  tag: string;
  lines: string[];
}) {
  return (
    <div className="group rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] p-7 shadow-xs backdrop-blur-xl transition hover:bg-[var(--glass-strong)]">
      <span className="inline-flex items-center justify-center rounded-full bg-[var(--glass-strong)] px-3 py-1 text-xs font-medium text-[var(--muted)] backdrop-blur-xl">
        {number}
      </span>
      <h3 className="mt-5 text-xl font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-1 text-xs text-[var(--muted)] opacity-60">{tag}</p>
      <ul className="mt-4 space-y-2">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[var(--muted)]">
            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[var(--muted)] opacity-40" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Benefit({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--glass)] p-6 backdrop-blur-xl transition hover:bg-[var(--glass-strong)]">
      <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--glass-strong)] text-[var(--foreground)] backdrop-blur-xl">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-xl border border-[var(--hairline)] bg-[var(--glass)] p-6 text-center backdrop-blur-xl">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--glass-strong)] text-sm font-semibold text-[var(--foreground)] backdrop-blur-xl">
        {number}
      </span>
      <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}

/* ─── Iconos SVG minimalistas ─── */

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 4 4-6" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </svg>
  );
}

function FocusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

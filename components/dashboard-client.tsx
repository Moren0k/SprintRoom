"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type { ProjectSummary, TaskSummary } from "@/src/frontend/types";
import { useSession } from "@/src/frontend/session-context";
import {
  Card,
  EmptyState,
  ErrorBanner,
  LinkButton,
  LoadingBlock,
  PageHeader,
  Pill,
  ProgressBar,
  SectionHeader,
  StatusPill,
} from "./ui";

export default function DashboardClient() {
  const { user } = useSession();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [projectData, taskData] = await Promise.all([
          apiRequest<ProjectSummary[]>("/api/projects"),
          apiRequest<TaskSummary[]>("/api/tasks"),
        ]);
        if (cancelled) return;
        setProjects(projectData);
        setTasks(taskData);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingBlock label="Cargando dashboard..." />;
  }

  const completedTasks = tasks.filter((task) => task.isCompleted).length;
  const totalProjectTasks = projects.reduce((sum, project) => sum + project.taskCount, 0);
  const averageProgress =
    projects.length === 0
      ? 0
      : Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Panel principal"
        title={`Hola, ${user.fullName.split(" ")[0] ?? user.fullName}`}
        description="Un resumen rapido de tus proyectos activos, tareas asignadas y avance general."
        actions={<LinkButton href="/projects">Gestionar proyectos</LinkButton>}
      />
      <ErrorBanner message={error} />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Proyectos visibles" value={projects.length.toString()} />
        <MetricCard label="Tareas del portafolio" value={totalProjectTasks.toString()} />
        <MetricCard label="Mis tareas" value={tasks.length.toString()} />
        <MetricCard label="Avance promedio" value={`${averageProgress}%`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionHeader
            title="Proyectos"
            description="Avance consolidado desde las historias y tareas de cada proyecto."
            actions={
            <Link href="/projects" className="text-sm font-medium text-[var(--foreground)]">
              Ver todos
            </Link>
            }
          />
          <div className="mt-5 space-y-3">
            {projects.length === 0 ? (
              <EmptyState
                title="Aun no hay proyectos"
                description="Crea tu primer proyecto para empezar a organizar historias, miembros y tareas."
                action={<LinkButton href="/projects">Crear proyecto</LinkButton>}
              />
            ) : (
              projects.slice(0, 5).map((project) => (
                <Link
                  key={project.projectId}
                  href={`/projects/${project.projectId}`}
                  className="block rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 transition hover:bg-[var(--glass)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-[var(--foreground)]">{project.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                        {project.description || "Sin descripcion."}
                      </p>
                    </div>
                    {project.isOwnedByCurrentUser && <Pill>Propio</Pill>}
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={project.progress} />
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {Math.round(project.progress)}% · {project.userStoryCount} historias · {project.taskCount} tareas
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Mis tareas"
            description="Tu carga de trabajo pendiente y completada."
          />
          <div className="mt-5 space-y-3">
            {tasks.length === 0 ? (
              <EmptyState
                title="No tienes tareas asignadas"
                description="Cuando te asignen tareas dentro de un proyecto apareceran aqui."
              />
            ) : (
              tasks.slice(0, 8).map((task) => (
                <Link
                  href={`/projects/${task.projectId}`}
                  key={task.sprintTaskId}
                  className="block rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-4 transition hover:bg-[var(--glass)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-medium text-[var(--foreground)]">{task.title}</h3>
                    <StatusPill status={task.status} />
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {task.commentCount} comentarios
                  </p>
                </Link>
              ))
            )}
          </div>
          {tasks.length > 0 && (
            <p className="mt-5 text-sm text-[var(--muted)]">
              {completedTasks} de {tasks.length} tareas personales marcadas como completadas.
            </p>
          )}
        </Card>
      </section>

      <Card>
        <SectionHeader
          title="Actividad reciente"
          description="Cuando haya novedades relevantes en tus proyectos, apareceran aqui para que puedas retomar el trabajo rapidamente."
        />
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
        {value}
      </p>
    </Card>
  );
}

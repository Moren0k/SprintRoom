"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, getErrorMessage } from "@/src/frontend/api-client";
import type { ProjectDetail, ProjectSummary } from "@/src/frontend/types";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  SectionHeader,
  SuccessBanner,
  TextArea,
  TextInput,
} from "./ui";

export default function ProjectsClient() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [externalReference, setExternalReference] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<ProjectSummary[]>("/api/projects");
        if (!cancelled) setProjects(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!name.trim()) {
      setError("El nombre del proyecto es obligatorio.");
      return;
    }
    setSubmitting(true);
    try {
      const project = await apiRequest<ProjectDetail>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          externalReference: externalReference.trim(),
          initialMembers: [],
        }),
      });
      setNotice("Proyecto creado correctamente.");
      router.push(`/projects/${project.projectId}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingBlock label="Cargando proyectos..." />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Proyectos"
        title="Gestiona el portafolio"
        description="Crea proyectos, revisa su avance y entra al espacio de trabajo de cada equipo."
      />
      <ErrorBanner message={error} />
      <SuccessBanner message={notice} />

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <SectionHeader
            title="Crear proyecto"
            description="Quedaras como propietario y podras agregar miembros, historias y tareas despues de crearlo."
          />
          <form onSubmit={createProject} className="mt-5 space-y-4">
            <Field label="Nombre">
              <TextInput
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="SprintRoom Web"
              />
            </Field>
            <Field label="Descripcion">
              <TextArea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Contexto y alcance del proyecto"
              />
            </Field>
            <Field label="Referencia externa" hint="Opcional. Puede ser un codigo o enlace externo.">
              <TextInput
                value={externalReference}
                onChange={(event) => setExternalReference(event.target.value)}
                placeholder="SR-2026"
              />
            </Field>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Creando..." : "Crear proyecto"}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          {projects.length === 0 ? (
            <EmptyState
              title="No hay proyectos visibles"
              description="Crea un proyecto o solicita que te agreguen como miembro para verlo aqui."
            />
          ) : (
            projects.map((project) => (
              <Link
                href={`/projects/${project.projectId}`}
                key={project.projectId}
                className="block rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] p-5 shadow-xs outline-none backdrop-blur-xl transition hover:bg-[var(--glass-strong)] focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">{project.name}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                      {project.description || "Sin descripcion."}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--muted)]">
                    {project.memberCount} miembros
                  </span>
                </div>
                <div className="mt-5">
                  <ProgressBar value={project.progress} />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {Math.round(project.progress)}% · {project.userStoryCount} historias · {project.taskCount} tareas
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

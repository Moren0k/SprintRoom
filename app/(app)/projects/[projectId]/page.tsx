import ProjectDetailClient from "@/components/project-detail-client";

export default async function ProjectDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectDetailClient projectId={projectId} />;
}

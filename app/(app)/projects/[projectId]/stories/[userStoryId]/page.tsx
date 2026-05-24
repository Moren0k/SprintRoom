import StoryTasksClient from "@/components/story-tasks-client";

export default async function StoryTasksPage({
  params,
}: {
  readonly params: Promise<{
    readonly projectId: string;
    readonly userStoryId: string;
  }>;
}) {
  const { projectId, userStoryId } = await params;
  return <StoryTasksClient projectId={projectId} userStoryId={userStoryId} />;
}

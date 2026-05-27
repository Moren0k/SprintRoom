import { createClient } from "@insforge/sdk";

type ScenarioConfig = {
  readonly name: string;
  readonly accessToken?: string;
  readonly projectId: string;
  readonly outsiderProjectId?: string;
};

const baseUrl = process.env.INSFORGE_URL?.trim() ?? "";
const anonKey = process.env.INSFORGE_ANON_KEY?.trim() ?? "";
const memberToken = process.env.RLS_MEMBER_TOKEN?.trim();
const outsiderToken = process.env.RLS_OUTSIDER_TOKEN?.trim();
const memberProjectId = process.env.RLS_MEMBER_PROJECT_ID?.trim() ?? "";
const outsiderProjectId = process.env.RLS_OUTSIDER_PROJECT_ID?.trim();

if (!baseUrl || !anonKey || !memberProjectId) {
  throw new Error(
    "Configura INSFORGE_URL, INSFORGE_ANON_KEY y RLS_MEMBER_PROJECT_ID para validar RLS en staging.",
  );
}

const scenarios: ScenarioConfig[] = [
  { name: "anon", projectId: memberProjectId },
  { name: "member", accessToken: memberToken, projectId: memberProjectId, outsiderProjectId },
];

if (outsiderToken) {
  scenarios.push({
    name: "outsider",
    accessToken: outsiderToken,
    projectId: memberProjectId,
    outsiderProjectId,
  });
}

async function main(): Promise<void> {
  for (const scenario of scenarios) {
    const client = createClient({ baseUrl, anonKey, isServerMode: true });
    if (scenario.accessToken) {
      client.setAccessToken(scenario.accessToken);
    }

    console.log(`\n=== Scenario: ${scenario.name} ===`);
    await checkProjectVisibility(client, scenario);
    await checkStoriesVisibility(client, scenario);
    await checkTasksVisibility(client, scenario);
    await checkMembersVisibility(client, scenario);
  }
}

async function checkProjectVisibility(client: ReturnType<typeof createClient>, scenario: ScenarioConfig) {
  const { data, error } = await client.database
    .from("projects")
    .select("id,name,owner_id")
    .eq("id", scenario.projectId);

  console.log("projects own project", summarize(data, error));

  if (scenario.outsiderProjectId) {
    const result = await client.database
      .from("projects")
      .select("id,name,owner_id")
      .eq("id", scenario.outsiderProjectId);
    console.log("projects outsider project", summarize(result.data, result.error));
  }
}

async function checkStoriesVisibility(client: ReturnType<typeof createClient>, scenario: ScenarioConfig) {
  const { data, error } = await client.database
    .from("user_stories")
    .select("id,project_id,title")
    .eq("project_id", scenario.projectId);
  console.log("user_stories own project", summarize(data, error));
}

async function checkTasksVisibility(client: ReturnType<typeof createClient>, scenario: ScenarioConfig) {
  const { data, error } = await client.database
    .from("sprint_tasks")
    .select("id,project_id,title,status")
    .eq("project_id", scenario.projectId);
  console.log("sprint_tasks own project", summarize(data, error));
}

async function checkMembersVisibility(client: ReturnType<typeof createClient>, scenario: ScenarioConfig) {
  const { data, error } = await client.database
    .from("project_members")
    .select("project_id,user_id,role")
    .eq("project_id", scenario.projectId);
  console.log("project_members own project", summarize(data, error));
}

function summarize(data: unknown, error: unknown): string {
  if (error) {
    return `error=${JSON.stringify(error)}`;
  }
  if (Array.isArray(data)) {
    return `rows=${data.length}`;
  }
  return JSON.stringify(data);
}

void main();

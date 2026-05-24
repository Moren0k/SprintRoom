# @sprintroom/mcp v1.1.0

## v1.1.0 — 2026-05-24
- `tools/list` now fetches tool definitions in real-time from SprintRoom API (`/api/mcp`) instead of bundling them.
- Removed `src/definitions.ts` — no more duplicate definitions to keep in sync.
- Tool changes no longer require a package version bump (except for significant architectural changes).

## v1.0.1 — 2026-05-24
- Fixed repository URL in package metadata (`YOUR_ORG` → `Moren0k/SprintRoom`)

## v1.0.0 — 2026-05-24
- Initial release of the SprintRoom MCP server as a standalone npm package.
- 7 tools: `get_project_backlog`, `get_user_story_by_id`, `get_task_by_id`, `search_tasks`, `update_task_status`, `add_task_agent_note`, `get_sprintroom_mcp_skill`
- Works with OpenCode, Claude Code, Claude Desktop, Codex, and any MCP-compatible agent
- Zero runtime dependencies (Node 18+ only)
- Communicates via stdio using JSON-RPC 2.0
- CLI proxies all tool calls to the SprintRoom HTTP API (`/api/mcp`)
- Requires only `SPRINTROOM_API_URL` and `SPRINTROOM_PROJECT_KEY` — no InsForge credentials needed
- Tool definitions are bundled in the package; version must be bumped when backend tool definitions change

### Usage
```bash
npx -y @sprintroom/mcp
```

### Security
- `SPRINTROOM_PROJECT_KEY` provides full read/write access to a project. Handle with care.
- Keys are generated from the SprintRoom UI (one-time display) and stored as SHA-256 hashes.
- Revoke and rotate keys from the SprintRoom UI if compromised.

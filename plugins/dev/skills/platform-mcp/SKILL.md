---
name: platform-mcp
description: "Use when the user asks for Supabase, Vercel, GitHub, or Railway MCP-backed project/workspace operations. Don't use for local-only code edits, browser automation, Google Workspace, or raw direct MCP calls outside this wrapper."
version: 1.0.0
---

# Platform MCP Wrapper

Use this skill as the wrapper for the dev plugin's Supabase, Vercel, GitHub, and Railway MCP servers. Do not call those MCP tools from generic task flow without first applying this skill's routing, linking, and safety rules.

The dev plugin registers these remote MCP servers:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com"
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "railway": {
      "type": "http",
      "url": "https://mcp.railway.com"
    }
  }
}
```

## Routing

- **Supabase**: database schema, migrations, SQL, generated types, project logs, Edge Functions, Auth, Storage, project/org management, or Supabase docs.
- **Vercel**: Vercel projects, teams, deployments, domains, environment variables, deployment logs, or Vercel docs.
- **GitHub**: repositories, issues, pull requests, workflows, releases, code search, branches, security alerts, or GitHub project context.
- **Railway**: Railway workspaces, projects, services, environments, variables, deployments, domains, templates, or Railway logs.

If a task spans providers, resolve and state the target for each provider before using provider tools.

## Multi-project and workspace linking

The user often works across multiple projects and workspaces. Always link or resolve the correct target before taking action:

1. Determine the local repository/workspace context first. Use the current directory, Git remote, branch, and provider config files only as clues, not final proof.
2. Resolve the provider scope:
   - GitHub: owner/repo, organization, branch, PR/issue number, and workflow when relevant.
   - Supabase: organization, project name, `project_ref`, database branch, and whether the task is read-only or mutating.
   - Vercel: account/team scope, project, production vs preview environment, deployment, domain, and branch.
   - Railway: workspace, project, environment, service, deployment, and domain.
3. If exactly one target is clearly linked to the current directory, use it and mention it briefly in the result.
4. If multiple plausible targets exist, ask the user to choose. Never assume the first project, first team, first workspace, or production environment.
5. When the provider offers link/select tools, use them to link the project, service, environment, or repo to the current directory before mutating.

Do not commit user-specific project refs, org IDs, team IDs, workspace IDs, tokens, or generated provider config changes unless the user explicitly asks for those files to be updated.

## Safety rules

- Prefer read-only discovery first: list/search/get status before mutating.
- Never write tokens, OAuth client secrets, PATs, access tokens, refresh tokens, service-role keys, or deployment secrets into repository files or responses.
- Redact environment variable values and secrets. Names and existence are usually safe; values are not.
- Require explicit user confirmation before production mutations, deploy/redeploy actions, database migrations, environment variable changes, domain changes, project creation/deletion, or billing/cost-affecting operations.
- For Supabase, prefer project-scoped and read-only access when possible. Supabase supports URL options such as `project_ref=<id>` and `read_only=true`; do not hardcode these into this plugin.
- For Railway, prefer the remote OAuth server for normal use. Use the local CLI-backed server only if the user specifically needs local Railway CLI workflows.
- For GitHub, prefer OAuth remote MCP. Use PAT-based setup only when OAuth is unavailable and the user understands the scope implications.
- For Vercel, verify the official endpoint is `https://mcp.vercel.com` and make sure the selected team/project matches the request.

## Failure handling

If an MCP server is unavailable or unauthenticated, tell the user which provider needs authorization and what scope is required. Do not fall back to raw provider APIs or ad hoc scripts unless the user explicitly asks and the task cannot be completed through MCP.

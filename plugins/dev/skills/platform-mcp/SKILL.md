---
name: platform-mcp
description: "Use as a compatibility router for platform operations. For Supabase, Vercel, and Railway, load their CLI skills instead. For GitHub MCP-backed work, resolve repo context first. Don't use for Google Workspace or local-only code edits."
version: 2.0.0
---

# Platform Provider Router

Use this skill as a compatibility router for platform provider work.

Supabase, Vercel, and Railway are intentionally handled by CLI skills so their tools load on demand and can use persistent CLI authentication. GitHub MCP remains out of this migration scope; prefer the GitHub MCP tools only after resolving the target repository, organization, branch, PR, issue, or workflow.

## Routing

- **Supabase**: invoke `supabase-cli` for database schema, migrations, SQL, generated types, project logs, Edge Functions, Auth, Storage, project/org management, or Supabase docs.
- **Vercel**: invoke `vercel-cli` for Vercel projects, teams, deployments, domains, environment variables, deployment logs, or Vercel docs.
- **GitHub**: repositories, issues, pull requests, workflows, releases, code search, branches, security alerts, or GitHub project context.
- **Railway**: invoke `railway-cli` for Railway workspaces, projects, services, environments, variables, deployments, domains, templates, or Railway logs.

If a task spans providers, resolve and state the target for each provider before using provider tools or CLI commands.

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
5. When the provider offers link/select commands, use explicit non-interactive flags when possible. Do not commit provider link files unless the user explicitly asks.

Do not commit user-specific project refs, org IDs, team IDs, workspace IDs, tokens, or generated provider config changes unless the user explicitly asks for those files to be updated.

## Safety rules

- Prefer read-only discovery first: list/search/get status before mutating.
- Never write tokens, OAuth client secrets, PATs, access tokens, refresh tokens, service-role keys, or deployment secrets into repository files or responses.
- Redact environment variable values and secrets. Names and existence are usually safe; values are not.
- Require explicit user confirmation before production mutations, deploy/redeploy actions, database migrations, environment variable changes, domain changes, project creation/deletion, or billing/cost-affecting operations.
- For Supabase, Vercel, and Railway, prefer the provider-specific CLI skills. They contain auth, target resolution, and command guardrails.
- For GitHub, prefer OAuth-backed GitHub tooling already available in the runtime. Use PAT-based setup only when OAuth is unavailable and the user understands the scope implications.

## Failure handling

If a provider CLI is unavailable or unauthenticated, tell the user which provider needs setup and which environment variable or login command is required. Do not trigger interactive login unexpectedly during task execution.

---
name: railway-cli
description: "Use when the user asks for Railway workspaces, projects, services, environments, variables, deployments, domains, logs, metrics, or Railway docs through the Railway CLI. Don't use for Supabase, Vercel, Google Workspace, or direct MCP calls."
version: 1.0.0
---

# Railway CLI

Use the official `railway` CLI for Railway work. This skill replaces the previous always-loaded provider integration so Railway capabilities load only when requested and authentication stays under CLI control.

## Setup and auth

- Prefer an existing CLI install from npm, Scoop, or the official binary.
- Check `railway --version` before deeper work.
- Prefer non-interactive auth with exactly one of:
  - `RAILWAY_TOKEN` for project-scoped actions.
  - `RAILWAY_API_TOKEN` for account/workspace-scoped actions.
- If both token variables are set, stop and ask the user which one to use; Railway treats that as ambiguous.
- Use `railway login` or `railway login --browserless` only when the user explicitly asks to authenticate.

## Target resolution

1. Inspect local context first: repository, branch, `.railway/`, Railway docs, and deployment configuration.
2. Resolve workspace, project, environment, service, deployment, and domain before mutating.
3. Prefer explicit `railway link --workspace <id-or-name> --project <id-or-name> --environment <id-or-name> --service <id-or-name>` over interactive prompts.
4. Do not commit `.railway/` unless the user explicitly asks; it contains local link state.

## Operating rules

- Prefer read-only discovery first: `whoami`, `list`, `status`, `logs`, `variables`, `domain`, `deployment`.
- Use `--json` whenever Railway supports it.
- Require explicit user confirmation before deploy/redeploy/restart/down/delete, variable changes, domain changes, service creation/deletion, environment changes, or billing/cost-affecting actions.
- Redact token and variable values. Names and existence are usually safe; values are not.

## Common commands

- Help/version: `railway --help`, `railway --version`
- Auth: `railway login`, `railway login --browserless`, `RAILWAY_TOKEN`, `RAILWAY_API_TOKEN`
- Link: `railway link --workspace <workspace> --project <project> --environment <env> --service <service>`
- Discovery: `railway whoami`, `railway list --json`, `railway status --json`
- Logs: `railway logs --service <service> --environment <env>`
- Variables: `railway variables --json`

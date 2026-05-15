---
name: vercel-cli
description: "Use when the user asks for Vercel projects, teams, deployments, domains, environment variables, logs, builds, or Vercel docs through the Vercel CLI. Don't use for Supabase, Railway, Google Workspace, or direct MCP calls."
version: 1.0.0
---

# Vercel CLI

Use the official `vercel` CLI for Vercel work. This skill replaces the previous always-loaded provider integration so Vercel capabilities load only when requested and authentication stays under CLI control.

## Setup and auth

- Prefer an existing CLI install or run with `npx vercel`.
- Check `vercel --version` or `npx vercel --version` before deeper work.
- Prefer non-interactive auth with `VERCEL_TOKEN` in the environment. Do not print or pass token values in visible command text unless unavoidable.
- Use `vercel login` only when the user explicitly asks to authenticate.
- Use `--no-color` or `NO_COLOR=1` for machine-readable output when JSON is unavailable.

## Target resolution

1. Inspect local context first: current repository, branch, `vercel.json`, `.vercel/project.json`, package metadata, and deployment docs.
2. Resolve account/team scope, project, target environment, deployment, domain, and branch before mutating.
3. Prefer explicit `--scope`, `--team`, `--project`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` over interactive prompts.
4. Do not commit `.vercel/` unless the user explicitly asks; it can contain user/project-specific linking state.

## Operating rules

- Prefer read-only discovery first: `whoami`, `project ls`, `list`, `inspect`, `logs`, `env ls`, `domains ls`.
- Require explicit user confirmation before deploy/redeploy/promote/rollback/remove, production mutations, env var changes, domain/DNS/cert changes, integration provisioning, or billing/cost-affecting actions.
- Redact token and environment variable values. Names and existence are usually safe; values are not.
- Use the Vercel CLI's JSON or stable output options when available; otherwise summarize relevant output only.

## Common commands

- Install/help: `npx vercel --help`
- Auth: `vercel login` or `VERCEL_TOKEN`
- Link: `vercel link --project <name-or-id> --scope <scope>`
- Projects: `vercel project ls`, `vercel inspect <deployment>`
- Deployments/logs: `vercel list`, `vercel logs <deployment-url-or-id>`
- Env: `vercel env ls`, `vercel env add`, `vercel env rm`
- Domains: `vercel domains ls`, `vercel dns ls`

---
name: supabase-cli
description: "Use when the user asks for Supabase project, database, auth, storage, Edge Function, migration, type generation, log, or docs work through the Supabase CLI. Don't use for Vercel, Railway, Google Workspace, or direct MCP calls."
version: 1.0.0
---

# Supabase CLI

Use the official `supabase` CLI for Supabase work. This skill replaces the previous always-loaded provider integration so Supabase capabilities load only when requested and authentication stays under CLI control.

## Setup and auth

- Prefer an existing CLI install or run project-local commands with `npx supabase`.
- Check `supabase --version` or `npx supabase --version` before deeper work.
- Prefer non-interactive auth with `SUPABASE_ACCESS_TOKEN` in the environment.
- If no token is present, use an existing `supabase login` session. Do not run `supabase login` unless the user explicitly asks to authenticate.
- Never write access tokens, database passwords, JWT secrets, anon keys, service-role keys, or generated secrets to repository files or responses.

## Target resolution

1. Inspect local context first: current repository, branch, `supabase/config.toml`, `supabase/migrations`, and provider-related docs.
2. Resolve the target project ref before remote work. Use `supabase link --project-ref <ref>` only when the user confirms the target or it is unambiguous.
3. Do not commit `supabase/.temp/`, local link state, database passwords, or generated environment dumps.
4. For remote DB commands, confirm whether the user intends local or linked project behavior.

## Operating rules

- Prefer read-only commands first: status, list, inspect, diff, logs, and dry-run style commands where available.
- Require explicit user confirmation before `db push`, `db reset`, destructive SQL, migrations against linked projects, secret changes, function deploys, project creation/deletion, or billing/cost-affecting actions.
- Redact secret values from CLI output. Environment variable names can be mentioned; values cannot.
- Use JSON output if the command supports it. Otherwise summarize the stable, relevant parts of CLI output.

## Common commands

- Install/help: `npx supabase --help`
- Auth: `supabase login` or `SUPABASE_ACCESS_TOKEN`
- Link: `supabase link --project-ref <project-ref>`
- Local stack: `supabase start`, `supabase stop`, `supabase status`
- DB: `supabase db diff`, `supabase db pull`, `supabase db push`, `supabase db lint`
- Types: `supabase gen types --linked --lang typescript`
- Functions: `supabase functions list`, `supabase functions deploy <name>`

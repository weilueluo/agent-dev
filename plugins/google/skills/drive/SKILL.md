---
name: drive
description: "Use when the user wants to use Google Drive through the in-repo Google Workspace CLI wrapper: search files, read or download file content, inspect metadata or permissions, list recent files, or create files. Don't use for Gmail or local filesystem-only tasks."
version: 2.0.0
---

# Drive CLI

Use the `google-workspace-cli` skill and bundled Go wrapper for Google Drive tasks. The wrapper is loaded on demand and uses persistent Google credentials.

Wrapper path: `plugins\google\skills\google-workspace-cli\google-workspace`

## Operating rules

- Prefer the bundled Go wrapper over raw Drive API scripts.
- Do not create project-level `.mcp.json` files for Drive.
- Never write OAuth client secrets, access tokens, refresh tokens, file contents, or personal data to plugin files.
- Use search and metadata tools before reading or downloading file contents.
- Download only files relevant to the user's request.
- Create files only when the user explicitly asks.
- Prefer JSON output from the wrapper and write large downloaded/exported content to user-approved local paths.

## Setup prerequisites

If the wrapper is unavailable or authentication fails, tell the user to complete one-time Google auth:

1. Enable `drive.googleapis.com`.
2. Configure OAuth consent or Application Default Credentials for the local CLI.
3. Add only these scopes unless the user requests more:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`
4. Run `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/drive.file` or configure the wrapper's documented credential environment.
5. Re-run the wrapper auth check. Do not launch auth flows unexpectedly during normal task execution.

## Expected commands

The wrapper supports Drive operations such as `drive search`, `drive recent`, `drive metadata`, `drive permissions`, `drive download`, `drive export`, and `drive create`.

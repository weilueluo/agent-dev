---
name: gmail
description: "Use when the user wants to use Gmail through the in-repo Google Workspace CLI wrapper: search/read threads, list labels or drafts, create drafts, or label messages. Don't use for non-Gmail providers or general email writing without Gmail access."
version: 2.0.0
---

# Gmail CLI

Use the `google-workspace-cli` skill and bundled Go wrapper for Gmail tasks. The wrapper is loaded on demand and uses persistent Google credentials.

Wrapper path: `plugins\google\skills\google-workspace-cli\google-workspace`

## Operating rules

- Prefer the bundled Go wrapper over raw Gmail API scripts.
- Do not create project-level `.mcp.json` files for Gmail.
- Never write OAuth client secrets, access tokens, refresh tokens, email contents, or personal data to repository files.
- For outgoing mail requests, create a draft for user review. Do not send messages unless a future tool explicitly supports sending and the user explicitly confirms.
- Use the minimum data needed: search threads first, retrieve a thread only when needed, and avoid broad mailbox scans.
- Prefer JSON output from the wrapper and redact message bodies unless the user explicitly requested the content.

## Setup prerequisites

If the wrapper is unavailable or authentication fails, tell the user to complete one-time Google auth:

1. Enable `gmail.googleapis.com`.
2. Configure OAuth consent or Application Default Credentials for the local CLI.
3. Add only these scopes unless the user requests more:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.modify` for label changes
4. Run `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.compose,https://www.googleapis.com/auth/gmail.modify` or configure the wrapper's documented credential environment.
5. Re-run the wrapper auth check. Do not launch auth flows unexpectedly during normal task execution.

## Expected commands

The wrapper supports Gmail operations such as `gmail search`, `gmail thread`, `gmail labels`, `gmail drafts`, `gmail draft-create`, and `gmail label-thread`.

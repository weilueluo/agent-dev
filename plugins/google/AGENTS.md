# Google

Google Workspace integrations — Gmail and Drive CLI guidance.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Structure

- `skills/google-workspace-cli` — Bundled Go CLI wrapper for Gmail and Drive
- `skills/gmail` — Gmail CLI usage and setup guidance
- `skills/drive` — Drive CLI usage and setup guidance

## Operational Rules

- **Use the bundled CLI first.** Prefer the Google Workspace Go wrapper over ad hoc API scripts.
- **No secrets in files.** Never write OAuth client secrets, tokens, message bodies, file contents, or personal data into plugin files.
- **Draft, don't send.** Create Gmail drafts for user review instead of sending mail directly.
- **Drive reads before downloads.** Search and inspect metadata first; read or download only files relevant to the user's request.
- **Respect OAuth scope.** Use only `gmail.readonly`, `gmail.compose`, `gmail.modify` for label changes, `drive.readonly`, and `drive.file` unless the user explicitly asks for a broader capability.

---
name: google-workspace-cli
description: "Use for Google Workspace Gmail and Drive tasks through the bundled Go CLI wrapper. Triggers for Gmail threads/drafts/labels and Drive search/metadata/permissions/read/download/create. Don't use for non-Google providers, rclone sync, or direct MCP calls."
version: 1.0.0
---

# Google Workspace CLI

Use the bundled Go wrapper for Gmail and Drive tasks. This skill replaces the previous always-loaded Gmail and Drive registrations so Google tools load on demand and authentication stays under local CLI/user credential control.

Wrapper path:

```powershell
plugins\google\skills\google-workspace-cli\google-workspace
```

## Build and run

```powershell
cd plugins\google\skills\google-workspace-cli\google-workspace
go run . --help
go run . auth-check
```

The wrapper returns JSON for successful commands and structured JSON errors on failure.

## Auth model

- Prefer one-time Application Default Credentials or OAuth refresh tokens stored in the user's OS/user credential store.
- Use `gcloud auth application-default login --scopes=<comma-separated-scopes>` for local setup when appropriate.
- Support `GOOGLE_APPLICATION_CREDENTIALS` for CI or service-account workflows when the user explicitly chooses that model.
- Do not launch browser auth flows unexpectedly during normal task execution. If auth is missing, run `auth-check` and provide setup instructions.
- Never commit OAuth client secrets, access tokens, refresh tokens, service account keys, email content, downloaded file content, or provider-specific private IDs.

## Scopes

Use the minimum required scopes:

- Gmail read: `https://www.googleapis.com/auth/gmail.readonly`
- Gmail drafts: `https://www.googleapis.com/auth/gmail.compose`
- Gmail label changes: `https://www.googleapis.com/auth/gmail.modify`
- Drive read: `https://www.googleapis.com/auth/drive.readonly`
- Drive create/update files made by the app: `https://www.googleapis.com/auth/drive.file`

## Gmail commands

- `gmail search --query <gmail-query> --max-results <n>`
- `gmail thread --id <thread-id> --format metadata|full|minimal`
- `gmail labels`
- `gmail drafts --max-results <n>`
- `gmail draft-create --to <email> --subject <subject> --body-file <path>`
- `gmail label-thread --thread-id <id> --add-label <label-id> --remove-label <label-id>`

Rules:

- Search before reading thread content.
- Create drafts for user review; do not send mail.
- Redact message bodies unless the user explicitly requested them.

## Drive commands

- `drive search --query <drive-query> --max-results <n>`
- `drive recent --max-results <n>`
- `drive metadata --id <file-id>`
- `drive permissions --id <file-id>`
- `drive download --id <file-id> --output <path>`
- `drive export --id <file-id> --mime-type <type> --output <path>`
- `drive create --name <name> --mime-type <type> --content-file <path>`

Rules:

- Search and inspect metadata before reading or downloading content.
- Download/export only files relevant to the user's request.
- Create files only when the user explicitly asks.
- Prefer writing large content to user-approved local paths and returning metadata JSON.

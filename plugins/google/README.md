# google

Google Workspace integrations for on-demand CLI access.

## Components

| Component | Description |
|-----------|-------------|
| `skills/google-workspace-cli` | Bundled Go CLI wrapper for Gmail and Drive |
| `skills/gmail` | Guidance for using Gmail through the wrapper safely |
| `skills/drive` | Guidance for using Drive through the wrapper safely |

## Google Workspace CLI

This plugin does not register always-on Gmail or Drive servers. Use the bundled Go wrapper from `skills\google-workspace-cli\google-workspace` when Gmail or Drive tasks are requested.

## Google setup

Before the wrapper can access data, configure Google Cloud and local credentials:

1. Enable the product APIs: `gmail.googleapis.com` and `drive.googleapis.com`.
2. Configure the OAuth consent screen or Application Default Credentials for local CLI use.
3. Add the required scopes:
   - Gmail: `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.compose`, `https://www.googleapis.com/auth/gmail.modify` for label changes
   - Drive: `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/drive.file`
4. Run `gcloud auth application-default login --scopes=<scopes>` or set `GOOGLE_APPLICATION_CREDENTIALS` for an approved CI/service-account workflow.
5. Run the wrapper's `auth-check` command. It should fail fast with setup instructions instead of launching browser auth during normal task execution.

## Installation

From this repository:

```powershell
copilot plugin install .\plugins\google
```

After marketplace metadata changes:

```powershell
copilot plugin marketplace update agent-dev
```

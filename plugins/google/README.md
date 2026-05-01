# google

Google Workspace integrations for remote MCP access.

## Components

| Component | Description |
|-----------|-------------|
| `.mcp.json` | Registers Google Workspace remote MCP servers for Gmail (`gmail`) and Drive (`drive`) |
| `skills/gmail` | Guidance for using Gmail MCP tools safely |
| `skills/drive` | Guidance for using Drive MCP tools safely |

## MCP servers

```json
{
  "mcpServers": {
    "gmail": {
      "type": "http",
      "url": "https://gmailmcp.googleapis.com/mcp/v1"
    },
    "drive": {
      "type": "http",
      "url": "https://drivemcp.googleapis.com/mcp/v1"
    }
  }
}
```

## Google setup

Before the MCP tools can access data, configure Google Cloud from the official Google Workspace MCP guides:

1. Enable the product APIs: `gmail.googleapis.com` and `drive.googleapis.com`.
2. Enable the MCP services: `gmailmcp.googleapis.com` and `drivemcp.googleapis.com`.
3. Configure the OAuth consent screen.
4. Add the required scopes:
   - Gmail: `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.compose`
   - Drive: `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/drive.file`
5. Create OAuth client credentials appropriate for your MCP client.
6. Authenticate the `gmail` and `drive` servers when prompted by the MCP flow.

## Installation

From this repository:

```powershell
copilot plugin install .\plugins\google
```

After marketplace metadata changes:

```powershell
copilot plugin marketplace update agent-dev
```

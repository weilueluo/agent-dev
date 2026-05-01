---
name: drive
description: "Use when the user wants to use Google Drive through the Google Workspace Drive MCP server: search files, read or download file content, inspect metadata or permissions, list recent files, or create files. Don't use for Gmail, raw Drive API scripting, local filesystem tasks, or document editing unrelated to Drive access."
version: 1.0.0
---

# Drive MCP

Use the `drive` MCP server for Google Drive tasks. The plugin registers Google's remote Drive MCP endpoint:

```json
{
  "mcpServers": {
    "drive": {
      "type": "http",
      "url": "https://drivemcp.googleapis.com/mcp/v1"
    }
  }
}
```

## Operating rules

- Prefer Drive MCP tools over raw Drive API scripts.
- Do not create project-level `.mcp.json` files for Drive; this plugin owns the server configuration.
- Never write OAuth client secrets, access tokens, refresh tokens, file contents, or personal data to plugin files.
- Use search and metadata tools before reading or downloading file contents.
- Download only files relevant to the user's request.
- Create files only when the user explicitly asks.

## Setup prerequisites

If the `drive` tools are unavailable or authentication fails, tell the user to complete the official Google setup:

1. Enable `drive.googleapis.com`.
2. Enable `drivemcp.googleapis.com`.
3. Configure OAuth consent for the Drive MCP app.
4. Add only these scopes unless the user requests more:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`
5. Create OAuth client credentials for the MCP client.
6. Authenticate the `drive` MCP server through the MCP flow when prompted.

## Expected tools

After authentication, the server can expose tools such as `create_file`, `download_file_content`, `get_file_metadata`, `get_file_permissions`, `list_recent_files`, `read_file_content`, and `search_files`.

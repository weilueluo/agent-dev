---
name: gmail
description: "Use when the user wants to use Gmail through the Google Workspace Gmail MCP server: search/read threads, list labels or drafts, create drafts, or label messages. Don't use for non-Gmail providers, raw Gmail API scripting, or general email writing without Gmail access."
version: 1.0.0
---

# Gmail MCP

Use the `gmail` MCP server for Gmail tasks. The plugin registers Google's remote Gmail MCP endpoint:

```json
{
  "mcpServers": {
    "gmail": {
      "type": "http",
      "url": "https://gmailmcp.googleapis.com/mcp/v1"
    }
  }
}
```

## Operating rules

- Prefer Gmail MCP tools over raw Gmail API scripts.
- Do not create project-level `.mcp.json` files for Gmail; this plugin owns the server configuration.
- Never write OAuth client secrets, access tokens, refresh tokens, email contents, or personal data to repository files.
- For outgoing mail requests, create a draft for user review. Do not send messages unless a future tool explicitly supports sending and the user explicitly confirms.
- Use the minimum data needed: search threads first, retrieve a thread only when needed, and avoid broad mailbox scans.

## Setup prerequisites

If the `gmail` tools are unavailable or authentication fails, tell the user to complete the official Google setup:

1. Enable `gmail.googleapis.com`.
2. Enable `gmailmcp.googleapis.com`.
3. Configure OAuth consent for `Gmail MCP Server`.
4. Add only these scopes unless the user requests more:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`
5. Create OAuth client credentials for the MCP client.
6. Authenticate the `gmail` MCP server through the CLI's MCP flow when prompted.

## Expected tools

After authentication, the server can expose tools such as `search_threads`, `get_thread`, `list_labels`, `list_drafts`, `create_draft`, `label_thread`, `unlabel_thread`, `label_message`, `unlabel_message`, and `create_label`.

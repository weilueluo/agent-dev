# wll — Claude Code Plugin Marketplace

A personal collection of Claude Code plugins by **weilueluo**.

## Quick Start

### Add this marketplace

```
/plugin marketplace add weilueluo/my-claude-plugins
```

### Browse available plugins

```
/plugin > Discover
```

### Install a plugin

```
/plugin install example-plugin@wll
```

## Structure

- **`/plugins`** — Internal plugins developed and maintained by weilueluo
- **`/external_plugins`** — Third-party plugins and integrations

## Available Plugins

| Plugin | Description | Category |
|--------|-------------|----------|
| `example-plugin` | Starter plugin demonstrating commands, skills, and plugin structure | development |

## Creating a New Plugin

1. Create a new directory under `plugins/`:

```
plugins/my-new-plugin/
├── .claude-plugin/
│   └── plugin.json        # Required: plugin metadata
├── commands/              # Optional: slash commands
├── skills/                # Optional: agent skills
├── agents/                # Optional: sub-agents
├── hooks/                 # Optional: event hooks
├── .mcp.json              # Optional: MCP server config
├── .lsp.json              # Optional: LSP server config
├── README.md
└── LICENSE
```

2. Add a `plugin.json` manifest:

```json
{
  "name": "my-new-plugin",
  "description": "What your plugin does",
  "version": "1.0.0",
  "author": {
    "name": "weilueluo",
    "email": "luoweilue@gmail.com"
  }
}
```

3. Add the plugin entry to `.claude-plugin/marketplace.json`

4. Test locally:

```bash
claude --plugin-dir ./plugins/my-new-plugin
```

5. Commit and push — users update via `/plugin marketplace update`

## Documentation

- [Official Plugin Docs](https://code.claude.com/docs/en/plugins)
- [Marketplace Docs](https://code.claude.com/docs/en/plugin-marketplaces)
- [Plugin Reference](https://code.claude.com/docs/en/plugins-reference)

## License

See each plugin directory for its individual license.

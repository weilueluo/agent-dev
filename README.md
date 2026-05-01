# agent-dev — Agent Skills Marketplace

Cross-platform agent skills for AI-powered CLI tools — compatible with Copilot CLI, Claude Code, Codex CLI, and Gemini CLI.

## Quick Start

### Add this marketplace

```
/plugin marketplace add weilueluo/agent-dev
```

### Browse available plugins

```
/plugin > Discover
```

### Install a plugin

```
/plugin install deliver@agent-dev
```

## Available Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [`deliver`](plugins/deliver/) | 7.4.0 | Generic issue-resolution loop — plan, work, review, and iterate until convergence |
| [`plan`](plugins/plan/) | 2.0.0 | Transforms vague ideas into complete feature designs through structured clarification |
| [`chats`](plugins/chats/) | 1.1.0 | Chat platform integrations — WhatsApp messaging and WeChat local message search |
| [`google`](plugins/google/) | 1.0.0 | Google Workspace integrations — Gmail and Drive remote MCP |
| [`dev`](plugins/dev/) | 1.4.0 | Core engineering principles, frontend interfaces, CodePen integration, recursive site download, and Playwright MCP browser automation |
| [`documents`](plugins/documents/) | 1.1.0 | Document processing skills for Word, PDF, PowerPoint, Excel, and collaborative co-authoring workflows |

## Repository Structure

```
├── AGENTS.md            # Agent-facing orientation (start here)
├── CONTRIBUTING.md      # Contribution conventions and quality bar
├── docs/
│   ├── architecture.md  # Plugin/skill/agent architecture
│   └── references/      # Industry references and source material
├── plugins/             # Agent skill plugins
│   ├── chats/           # Chat platform integrations (WhatsApp, WeChat)
│   ├── google/          # Google Workspace integrations (Gmail and Drive MCP)
│   ├── deliver/         # Generic issue-resolution loop
│   ├── dev/             # Engineering principles, frontend, CodePen
│   ├── documents/       # Document processing skills
│   └── plan/            # Feature design clarification
├── external_plugins/    # Third-party plugins and integrations
└── .github/             # GitHub & marketplace config
```

## License

See each plugin directory for its individual license.

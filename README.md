# wll — Copilot CLI Plugin Marketplace

A personal collection of Copilot CLI plugins by **weilueluo**.

## Quick Start

### Add this marketplace

```
/plugin marketplace add weilueluo/my-plugins
```

### Browse available plugins

```
/plugin > Discover
```

### Install a plugin

```
/plugin install deliver@wll
```

## Available Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [`deliver`](plugins/deliver/) | 3.2.0 | Production multi-stage delivery pipeline — orchestrates exploration, planning, critique, implementation, testing, and review |
| [`plan`](plugins/plan/) | 1.1.0 | Transforms vague feature ideas into complete feature requests through structured clarification |
| [`chats`](plugins/chats/) | 1.1.0 | Chat platform integrations — WhatsApp messaging and WeChat local message search |
| [`dev`](plugins/dev/) | 1.1.0 | Core engineering principles for AI-maintained codebases, production-grade frontend interfaces, and CodePen integration |
| [`documents`](plugins/documents/) | 1.1.0 | Document processing skills for Word, PDF, PowerPoint, Excel, and collaborative co-authoring workflows |

## Repository Structure

```
├── plugins/            # Plugins developed and maintained by weilueluo
│   ├── chats/          # Chat platform integrations (WhatsApp)
│   ├── deliver/        # Delivery pipeline plugin
│   ├── dev/            # Frontend development skills
│   ├── documents/      # Document processing skills
│   └── plan/           # Feature planning plugin
├── external_plugins/   # Third-party plugins and integrations
└── .github/            # GitHub & marketplace config
```

## License

See each plugin directory for its individual license.

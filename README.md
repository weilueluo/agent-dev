# wll — Copilot CLI Plugin Marketplace

A personal collection of Copilot CLI plugins by **weilueluo**.

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
/plugin install deliver@wll
```

## Available Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [`deliver`](plugins/deliver/) | 3.0.0 | Production multi-stage delivery pipeline — orchestrates exploration, planning, critique, implementation, testing, and review |
| [`plan`](plugins/plan/) | 1.0.0 | Transforms vague feature ideas into complete feature requests through structured clarification |

## Repository Structure

```
├── plugins/            # Plugins developed and maintained by weilueluo
│   ├── deliver/        # Delivery pipeline plugin
│   └── plan/           # Feature planning plugin
├── external_plugins/   # Third-party plugins and integrations
└── .github/            # GitHub & marketplace config
```

## License

See each plugin directory for its individual license.

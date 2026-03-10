# Example Plugin

A starter plugin demonstrating the basic Claude Code plugin structure.

## Components

- **`/example-plugin:hello [name]`** — A simple greeting command
- **`greeting` skill** — Automatically invoked when Claude detects a greeting task

## Structure

```
example-plugin/
├── .claude-plugin/
│   └── plugin.json        # Plugin metadata
├── commands/
│   └── hello.md           # Slash command
├── skills/
│   └── greeting/
│       └── SKILL.md       # Skill definition
├── README.md
└── LICENSE
```

## Local Testing

```bash
claude --plugin-dir ./plugins/example-plugin
```

Then try: `/example-plugin:hello World`

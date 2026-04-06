# agent-dev

Cross-platform agent skills marketplace for AI-powered CLI tools.

## Engineering Principles

All work follows `dev:principles`. Read before every task.

## Structure

```
├── AGENTS.md              # This file — repo-level orientation
├── CONTRIBUTING.md         # Contribution conventions and quality bar
├── docs/
│   ├── architecture.md     # Plugin/skill/agent architecture
│   └── references/         # Industry references and source material
│       ├── industry-references.md
│       └── x-post-agent-engineering.md
├── plugins/                # Agent skill plugins
│   ├── deliver/            # Adversarial delivery pipeline
│   ├── plan/               # Feature request clarification
│   ├── dev/                # Engineering principles, frontend, CodePen
│   ├── chats/              # Chat platform integrations
│   └── documents/          # Document processing skills
├── external_plugins/       # Third-party plugins
└── .github/plugin/         # Marketplace config
    └── marketplace.json    # Canonical plugin registry
```

## Plugins

| Plugin | AGENTS.md | Description |
|--------|-----------|-------------|
| [`deliver`](plugins/deliver/) | [AGENTS.md](plugins/deliver/AGENTS.md) | Adversarial delivery pipeline — explore, plan, critic, implement, verify |
| [`bugfix`](plugins/bugfix/) | [AGENTS.md](plugins/bugfix/AGENTS.md) | Structured bug resolution — intake, reproduce, diagnose, fix, harden |
| [`plan`](plugins/plan/) | [AGENTS.md](plugins/plan/AGENTS.md) | Transforms vague ideas into complete feature requests |
| [`dev`](plugins/dev/) | [AGENTS.md](plugins/dev/AGENTS.md) | Engineering principles, frontend design, CodePen, browser logs |
| [`chats`](plugins/chats/) | [AGENTS.md](plugins/chats/AGENTS.md) | WhatsApp messaging, WeChat local search |
| [`documents`](plugins/documents/) | [AGENTS.md](plugins/documents/AGENTS.md) | Word, PDF, PowerPoint, Excel processing |

## Key Principles

These are distilled from industry practice — see [references](docs/references/) for sources.

- **Harness > Model.** Verification infrastructure (tests, linters, CI) determines stability more than model capability.
- **Context is finite.** Layer context by frequency: permanent rules → on-demand skills → runtime state → memory. Prevent context rot.
- **Tools over instructions.** Design tools for agent goals (ACI), not API wrappers. Structured errors with recovery hints.
- **Skills lazy-load.** System prompt holds only skill descriptors; full content loads on match. Short descriptors with anti-examples.
- **State lives in files.** Task progress, memory, and coordination go to disk — not context windows.
- **Critic before code.** Plans are adversarially challenged before implementation begins.
- **Evals are infrastructure.** First failure becomes first test case. Fix evals before fixing agents.
- **Security by architecture.** Workspace isolation, minimal permissions, explicit confirmation for destructive ops.

## References

- [Architecture](docs/architecture.md) — plugin structure, skill loading, agent delegation
- [Industry References](docs/references/industry-references.md) — curated blog posts from OpenAI, Anthropic, Cloudflare, LangChain
- [Agent Engineering Post](docs/references/x-post-agent-engineering.md) — @HiTw93's comprehensive agent engineering analysis
- [Contributing](CONTRIBUTING.md) — conventions, versioning, quality bar

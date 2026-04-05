# Contributing to agent-dev

## Overview

agent-dev is an agent skills marketplace. Contributions are plugins containing skills, agents, hooks, and knowledge — designed for AI-powered CLI tools.

Before contributing, read:
- [AGENTS.md](AGENTS.md) — repo-level orientation
- [Architecture](docs/architecture.md) — plugin structure and design principles
- [dev:principles](plugins/dev/skills/principles/SKILL.md) — engineering standards

## Plugin Structure

Every plugin must follow this layout:

```
plugins/{name}/
├── AGENTS.md          # Required — lean TOC for the plugin
├── plugin.json        # Required — metadata, version, author
├── skills/            # Required — at least one skill
│   └── {skill-name}/
│       └── SKILL.md   # Required — YAML frontmatter + instructions
├── agents/            # Optional — specialist agent definitions
├── hooks.json         # Optional — lifecycle hooks
├── knowledge/         # Optional — domain knowledge files
├── scripts/           # Optional — automation scripts
└── README.md          # Optional — human-facing description
```

## AGENTS.md Convention

AGENTS.md is a **lean table of contents**, not a knowledge base. Keep it under 50 lines.

**Required sections:**
1. Title and one-line description
2. Engineering principles reference (`All work follows dev:principles.`)
3. Structure listing (skills, agents, knowledge, scripts)
4. Key rules (3-7 operational rules specific to this plugin)
5. References (links to operational docs, knowledge files)

**Example:**
```markdown
# My Plugin

One-line description of what this plugin does.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Structure

- `skills/my-skill` — Description of skill
- `agents/` — worker-a, worker-b
- `knowledge/patterns.md` — Domain patterns

## Key Rules

- **Rule name.** Explanation.
- **Another rule.** Explanation.

## References

- `OPERATING-RULES.md` — Detailed operational rules
```

## SKILL.md Convention

Every skill requires a `SKILL.md` with YAML frontmatter:

```yaml
---
name: my-skill
description: "Use when [trigger]. Don't use when [anti-trigger]."
version: 1.0.0
---
```

**Frontmatter rules:**
- `name` — kebab-case, matches directory name
- `description` — the primary trigger mechanism. Write as a routing condition, not a feature description.
  - Include "Use when..." and "Don't use when..." clauses
  - Include anti-examples — accuracy drops from 73% to 53% without them ([source](docs/references/x-post-agent-engineering.md#3-context-engineering))
  - Keep short (~10-20 tokens) — every enabled skill descriptor is always in context
- `version` — semver, bump on any behavioral change

**Body rules:**
- Instructions for the agent when the skill is activated
- Keep concise — this loads into finite context
- Reference supporting files for detailed knowledge rather than inlining everything
- One skill, one responsibility — don't try to cover review + deploy + debug + incident in one skill

## Docs Convention

Files under `docs/` should have YAML frontmatter:

```yaml
---
title: Document Title
description: One-line summary of what this doc covers.
last_updated: YYYY-MM-DD
---
```

This supports structured, cascaded knowledge retrieval from AGENTS.md.

## Versioning

### What to bump

| Change | Bump | Files to update |
|--------|------|-----------------|
| Bug fix, typo | Patch | `plugin.json`, affected `SKILL.md` |
| New skill, behavioral change | Minor | `plugin.json`, new/changed `SKILL.md` |
| Breaking pipeline/API change | Major | `plugin.json`, all affected `SKILL.md` |

### Where versions live

- **`plugin.json`** — authoritative plugin version
- **`SKILL.md` frontmatter** — per-skill version (bump only when that skill changes)
- **`.github/plugin/marketplace.json`** — marketplace registry (must stay in sync with `plugin.json`)

Always update all three locations when applicable. Drift between these is a common source of bugs.

## Quality Bar

### Do

- Design tools for agent goals (ACI), not API wrappers ([source](docs/references/x-post-agent-engineering.md#4-tool-design))
- Include structured error messages with recovery suggestions
- Write acceptance criteria that are mechanically verifiable
- Test with the deliver pipeline for non-trivial changes
- Keep AGENTS.md stable (prompt-cache friendly)

### Don't (Anti-Patterns)

These are the most common failure modes — avoid them:

| # | Anti-Pattern | What to do instead |
|---|-------------|-------------------|
| 1 | System prompt as knowledge base | Rules in prompt, knowledge in Skills |
| 2 | Tool count explosion | Merge overlapping tools, use clear namespaces |
| 3 | Missing verification loop | Bind acceptance criteria to every task type |
| 4 | Multi-agent without boundaries | Isolate roles, permissions, and worktrees |
| 5 | No memory consolidation | Monitor tokens, auto-trigger consolidation |
| 6 | No evaluation | First failure → first test case |
| 7 | Premature multi-agent | Verify single-agent ceiling first |
| 8 | Constraints by expectation | Encode in tool validation, linters, hooks |

Source: [Agent Engineering Anti-Patterns](docs/references/x-post-agent-engineering.md#11-common-anti-patterns)

## Submitting

1. Create your plugin under `plugins/{name}/` following the structure above
2. Add an entry to `.github/plugin/marketplace.json`
3. Run the deliver pipeline to validate (`/skill deliver`)
4. Open a PR with a clear description of what the plugin does and who it's for

## References

- [Architecture](docs/architecture.md) — how plugins, skills, and agents fit together
- [Industry References](docs/references/industry-references.md) — the research behind our conventions
- [Agent Engineering Post](docs/references/x-post-agent-engineering.md) — comprehensive agent engineering analysis

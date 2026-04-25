---
title: Architecture
description: High-level architecture of the agent-dev skills marketplace — plugin structure, skill loading, agent delegation, and marketplace distribution.
last_updated: 2026-04-25
---

# Architecture

## Overview

agent-dev is a cross-platform agent skills marketplace. Plugins provide skills (domain knowledge and workflows) and agents (specialist workers) to AI-powered CLI tools — Copilot CLI, Claude Code, Codex CLI, and Gemini CLI.

The architecture maps directly to patterns described in the [industry references](references/industry-references.md): lean agent-facing docs, skills lazy-loading, plan-work-review loops, and file-based state.

## Core Concepts

### Plugin

A self-contained package of skills, agents, hooks, and knowledge. Each plugin has:

- `plugin.json` — metadata, version, dependencies
- `AGENTS.md` — lean TOC orienting agents to the plugin's structure and rules
- `skills/` — one or more skills with `SKILL.md` frontmatter
- `agents/` — specialist agent definitions (optional)
- `hooks.json` — lifecycle hooks for automation (optional)
- `knowledge/` — domain knowledge files (optional)
- `scripts/` — automation scripts (optional)

### Skill

A modular, reusable unit of agent capability. Follows the [Anthropic Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) standard:

- **SKILL.md** — YAML frontmatter (name, description, version) + instructions
- **3-tier loading:** descriptor always in context → instructions on activation → resources on demand
- **Description is the trigger:** short, routing-oriented, includes anti-examples ("Use when X. Don't use when Y.")

### Agent

A specialist worker definition that runs in a sub-context. Receives a focused prompt and returns results. Examples: explorer, planner, critic, implementer, verifier (in the deliver plugin).

Sub-agents get minimal system prompts (tooling + workspace + runtime only) to maintain isolation.

### Hook

A lifecycle event handler that runs deterministic logic outside the LLM context. Hooks handle things that should never be left to model discretion — formatting, validation, file operations.

## Plugin Registry

The canonical plugin registry is [`.github/plugin/marketplace.json`](../.github/plugin/marketplace.json). It lists every published plugin with:

- Name, description, version, author
- Source path (relative to repo root)
- Category and keywords for discovery

**Versioning rules:**
- `plugin.json` in each plugin directory holds the authoritative version
- `marketplace.json` must stay in sync with plugin-local versions
- Skills that change must bump their frontmatter version
- Use semver: patch (bug fixes), minor (new features/behavior), major (breaking changes)

## Control Flow Patterns

The repo's plugins implement several of the [five control flow patterns](references/x-post-agent-engineering.md#1-agent-loop-fundamentals):

| Pattern | Implementation |
|---------|---------------|
| Prompt Chaining | Plan skill: intake → clarification → generation |
| Routing | Skill descriptors route to the right skill per task |
| Orchestrator-Workers | Deliver: orchestrator delegates to explorer, planner, critic, implementer, verifier |
| Evaluator-Optimizer | Deliver loop: Plan -> Work -> Review -> revise cycle |
| Parallelization | Deliver: multiple explore agents in parallel |

## Context Architecture

Following the [context layering principles](references/x-post-agent-engineering.md#3-context-engineering):

```
┌─────────────────────────────────┐
│  Permanent Layer                │  AGENTS.md, dev:principles
│  (always loaded, keep stable)   │  ~100 lines, cache-friendly
├─────────────────────────────────┤
│  On-Demand Layer                │  Skill descriptors (always)
│  (descriptors always,           │  Full SKILL.md (on match)
│   content on trigger)           │  Knowledge files (on need)
├─────────────────────────────────┤
│  Runtime Layer                  │  Current task context
│  (assembled per turn)           │  Tool results, user input
├─────────────────────────────────┤
│  Memory Layer                   │  Session history
│  (cross-session, on demand)     │  Stored facts, preferences
└─────────────────────────────────┘
```

## Directory Layout

```
agent-dev/
├── AGENTS.md                          # Repo-level orientation (this file's parent)
├── CONTRIBUTING.md                    # Contribution conventions
├── README.md                          # Public-facing readme
├── docs/
│   ├── architecture.md                # This file
│   └── references/                    # Industry references
├── plugins/
│   ├── deliver/                       # Generic issue-resolution loop
│   │   ├── AGENTS.md                  #   Plugin TOC
│   │   ├── OPERATING-RULES.md         #   Stop conditions, context management
│   │   ├── plugin.json                #   Plugin metadata
│   │   ├── hooks.json                 #   Lifecycle hooks
│   │   ├── skills/                    #   deliver, explore-task, plan-task, etc.
│   │   ├── agents/                    #   explorer, planner, critic, etc.
│   │   ├── knowledge/                 #   Planning patterns, eval guide
│   │   └── scripts/                   #   Plan scoring, DAG rendering
│   ├── plan/                          # Feature design clarification
│   ├── dev/                           # Engineering principles, frontend
│   ├── chats/                         # Chat platform integrations
│   └── documents/                     # Document processing
├── external_plugins/                  # Third-party plugins
├── tools/                             # Shared tooling
└── .github/
    └── plugin/
        └── marketplace.json           # Canonical plugin registry
```

## Design Principles

These are drawn from [industry practice](references/industry-references.md) and codified in `dev:principles`:

1. **AGENTS.md as TOC** — Lean index with cascade retrieval into focused docs. Never a monolith.
2. **Skills lazy-load** — Descriptors in system prompt, full content on match. Preserves prompt cache.
3. **Mechanical enforcement** — Hooks, linters, typed schemas enforce invariants. Not human review.
4. **Contract-first** — Every task becomes goals + constraints + testable criteria before work begins.
5. **External verification** — Tests, types, builds are ground truth. Not model reasoning.
6. **State on disk** — Task progress, handoff artifacts, memory go to files. Not context windows.
7. **Security by architecture** — Workspace isolation, minimal permissions, audit trails.

## References

- [Industry References](references/industry-references.md) — Source blog posts and reports
- [Agent Engineering Post](references/x-post-agent-engineering.md) — Comprehensive synthesis
- [dev:principles](../plugins/dev/skills/principles/SKILL.md) — Canonical engineering principles
- [deliver AGENTS.md](../plugins/deliver/AGENTS.md) — Issue-resolution loop architecture
- [deliver OPERATING-RULES.md](../plugins/deliver/OPERATING-RULES.md) — Operational rules and context management

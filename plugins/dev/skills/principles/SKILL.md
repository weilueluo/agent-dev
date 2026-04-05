---
name: principles
description: "Core development principles for AI-maintained codebases. This skill should be read before every task to establish engineering standards. Applies to all coding, architecture, and review work."
---

# Development Principles

> AI systems maintain the codebase, not humans. Build systems for agents.

## Test-Centric

Verification is ground truth, not code. Write tests first when interfaces are known. Decompose into small, verifiable units. Prefer deterministic wrappers around nondeterministic systems.

- Examples: property-based tests, invariant checks, fuzz testing
- Exceptions: scaffolding, exploratory spikes, docs-only changes — add tests once the interface stabilizes

## Clear Boundary

Parse, don't validate. Define interfaces, types, and contracts. Enforce schemas mechanically. Minimize ambiguity.

- Layers depend forward only: Types → Config → Repo → Service → Runtime → UI
- Cross-cutting concerns (auth, telemetry, feature flags) enter through explicit Providers
- References
  - Robert C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design* (bundled as resource)
  - https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
  - https://bits.logic.inc/p/ai-is-forcing-us-to-write-good-code

## Observability

Log structured, actionable information — state, metadata, request parameters, warnings, errors. Never log secrets or PII.

## Feedback Loop

Leave traces for future agents: code comments, specifications, history, corrections. Limit noise.

## Safe Automation

- Never commit secrets or log sensitive data
- Prefer reversible changes; require human approval for destructive operations
- Pin dependencies and use one-command build/test flows for reproducibility

## Tooling over Memory

Access latest official documentation and code samples on official sites and GitHub instead of relying on pretrained knowledge. Prefer tool calls over raw reasoning.

## Build for AI

You must build for agent observability. Context is scarce, keep guidance short — too much instruction is no instruction.

- Use `AGENTS.md` as table of contents with cascade retrieval into focused files (`ARCHITECTURE.md`, `DESIGN.md`, `PLANS.md`).
- `AGENTS.md` should references `docs/` directory that contains cascaded, levelled, structured knowledge in markdown with YAML frontmatter.

Example best practices for structure:

- Treat prompt, plan and execution plans as first-class artifacts

- Prefer shared utility packages over hand-rolled helpers to keep invariants centralized

- Validate boundaries with typed SDKs so agents don't guess shapes

- References

  - https://developers.openai.com/cookbook/articles/codex_exec_plans

  - https://openai.com/index/harness-engineering/
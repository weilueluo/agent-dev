---
title: Industry References
description: Curated blog posts and reports from frontier agentic development companies that inform this repo's design.
last_updated: 2026-04-25
---

# Industry References

Blog posts and reports from OpenAI, Anthropic, Cloudflare, LangChain, and others that shape the engineering principles and architecture of this marketplace.

For a comprehensive synthesis of these references, see [Agent Engineering Post](x-post-agent-engineering.md).

---

## 1. OpenAI — Harness Engineering: Leveraging Codex in an Agent-First World

- **URL:** https://openai.com/index/harness-engineering/
- **Date:** 2026
- **Key takeaways:**
  - 3 engineers, 5 months, ~1M lines of agent-generated code, ~1,500 PRs — 10x velocity over manual coding
  - `AGENTS.md` serves as a ~100-line table-of-contents index; detailed knowledge lives in versioned `docs/` directories
  - Architectural invariants enforced by custom linters and CI, not human review
  - Agent-to-agent review loops; agents self-review, iterate, escalate only when stuck
  - Each change launches an isolated app instance with full observability (logs, metrics, traces)
  - Engineers shift from writing code to designing environments, specifying intent, and authoring feedback loops
- **How it informs this repo:** Our `AGENTS.md` pattern (lean TOC -> cascaded docs), mechanical enforcement via hooks, and the deliver plugin's plan-work-review loop all follow this model.

## 2. Cloudflare — How We Rebuilt Next.js with AI in One Week (vinext)

- **URL:** https://blog.cloudflare.com/vinext/
- **Date:** 2026
- **Key takeaways:**
  - 1 engineer + Claude Opus 4.6, 800+ development sessions, rebuilt Next.js API surface in 7 days for ~$1,100
  - Outcome-spec-driven development: define specs and tasks, AI generates tests + implementation, human reviews architecture
  - 4.4x faster builds, 57% smaller client bundles, 94% API coverage
  - Demonstrates AI-assisted rapid open-source infrastructure development at minimal cost
- **How it informs this repo:** Validates the outcome-spec pattern used by our deliver loop (contract -> work -> review).

## 3. Anthropic — Agent Skills

- **URL:** https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- **GitHub:** https://github.com/anthropics/skills
- **Key takeaways:**
  - Skills are modular, reusable packages extending agent capabilities with domain-specific workflows
  - 3-tier content loading: metadata (always loaded) → instructions (on activation) → resources (on demand)
  - `SKILL.md` with YAML frontmatter is the standard format; description is the primary trigger mechanism
  - Effective skills keep SKILL.md concise, use third-person discovery descriptions, directly reference deeper resources, and include representative evals
  - Skills bridge prompt engineering and real software automation — versionable, auditable, composable
- **How it informs this repo:** This is the foundational standard for our skill architecture. Every plugin uses `SKILL.md` frontmatter, lazy-loading, composable skill design, and eval-oriented iteration for complex skills.

## 4. Anthropic — Managing Context on the Claude Developer Platform

- **URL:** https://claude.com/blog/context-management
- **Docs:** https://platform.claude.com/docs/en/build-with-claude/context-editing
- **Key takeaways:**
  - Server-side context editing: tool result clearing, thinking block clearing at configurable thresholds
  - Context is a finite resource with diminishing returns — irrelevant material degrades focus
  - `CLAUDE.md` (or `AGENTS.md`) provides persistent project context, reducing re-instruction overhead
  - Dynamic tool discovery via MCP search reduces tool definition overhead by ~47%
- **How it informs this repo:** Our context layering principles (permanent -> on-demand -> runtime -> memory) and the deliver plugin's threshold-based compression follow these patterns directly.

## 5. Anthropic — Advanced Tool Use

- **URL:** https://www.anthropic.com/engineering/advanced-tool-use
- **Key takeaways:**
  - Tool Search: dynamic discovery instead of loading all definitions; context retention 95%, accuracy from 49% to 74%
  - Programmatic Tool Calling: code-based orchestration of multi-tool workflows; token usage from ~150K to ~2K
  - Tool Use Examples: 1-5 real examples per tool; accuracy from 72% to 90%
- **How it informs this repo:** Skills act as our tool search layer — descriptors always loaded, full content on demand.

## 6. LangChain — State of Agent Engineering

- **URL:** https://www.langchain.com/state-of-agent-engineering
- **Date:** 2025
- **Key takeaways:**
  - 57% of respondents have agents in production; quality (32%) is the top barrier
  - 89% implemented observability; 62% have detailed tracing
  - Multi-model deployment is the norm (75%+ use multiple models)
  - Security is the leading concern for large enterprises (24.9%)
  - Only 52% run offline evaluations before deployment
- **How it informs this repo:** Validates our focus on quality infrastructure (deliver loop), observability (structured logging), and cross-model compatibility (Copilot CLI, Claude Code, Codex CLI, Gemini CLI).

## 7. Anthropic — Measuring AI Agent Autonomy in Practice

- **Key takeaways:**
  - Progressive autonomy: cross-session continuity, explicit task state, background I/O
  - Initializer Agent + Coding Agent pattern for long tasks: externalizes state to files
  - Task progress in structured files (JSON, not Markdown) for reliable agent parsing
  - Feature list with `passes: true/false` as completion gate
- **How it informs this repo:** The deliver plugin's contract-first approach and file-based handoff artifacts follow this externalised-state pattern.

## 8. OpenAI — Designing AI Agents to Resist Prompt Injection

- **URL:** https://openai.com/index/designing-agents-to-resist-prompt-injection/
- **Date:** 2026
- **Key takeaways:**
  - Prompt injection now resembles social engineering, not simple text overrides
  - Source-sink analysis: minimize what attackers can achieve even if injection succeeds
  - Constrain agent abilities when handling untrusted input; explicit user confirmation for risky ops
  - "Rule of two": never allow untrusted input + sensitive data access + external send simultaneously
  - Defense-in-depth: adversarial training, automated monitoring, red-teaming, user education
- **How it informs this repo:** Our safe automation principles (workspace isolation, explicit confirmation, minimal permissions) directly implement these defensive patterns.

## 9. Anthropic — Demystifying Evals for AI Agents

- **Key takeaways:**
  - Agent evals require scenario-based harness evaluation, not single-turn benchmarks
  - Capability evals (Pass@k): "what can the agent do?" — find upper bounds
  - Regression evals (Pass^k): "does what worked still work?" — monitor for backsliding
  - Transcript (what agent said) vs outcome (what actually happened) — both must be evaluated
  - 3 grader types: code graders (deterministic), model graders (semantic), human graders (calibration)
  - Fix evals before fixing agents — evaluation infrastructure bugs masquerade as model regression
- **How it informs this repo:** The deliver plugin's work-review step uses external checks as ground truth (code grader equivalent), and the "fix evals first" principle is a core operating rule.

## 10. Anthropic — Building Effective Agents

- **URL:** https://www.anthropic.com/research/building-effective-agents
- **Key takeaways:**
  - Start with the simplest solution and add agentic complexity only when it demonstrably improves outcomes
  - Common patterns include prompt chaining, routing, parallelization, orchestrator-workers, and evaluator-optimizer loops
  - Agents should obtain ground truth from the environment at each step and use stopping conditions to avoid runaway loops
- **How it informs this repo:** Deliver v7 generalizes the skill into a plan -> work -> review convergence loop grounded by evidence and stop conditions.

## 11. Anthropic — Effective Context Engineering for AI Agents

- **URL:** https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- **Key takeaways:**
  - Context is finite and suffers context rot; use the smallest high-signal context needed for the next action
  - Long-horizon tasks need compaction, structured note-taking, and sub-agent architectures
  - Just-in-time retrieval lets agents load file paths, queries, and links only when needed
- **How it informs this repo:** Deliver keeps contracts/current plans in full, summarizes older artifacts, preserves identifiers, and uses targeted re-exploration.

## 12. Anthropic — Writing Tools for Agents

- **URL:** https://www.anthropic.com/engineering/writing-tools-for-agents
- **Key takeaways:**
  - Tools are contracts between deterministic systems and non-deterministic agents
  - Good agent tools are focused, namespaced, token-efficient, and evaluated against realistic tasks
  - Tool results and traces reveal confusion that the model may not explicitly explain
- **How it informs this repo:** Deliver treats sub-agents, handoff artifacts, and scripts as agent-computer interfaces with explicit boundaries and evidence-bearing outputs.

## 13. OpenAI — Codex Execution Plans

- **URL:** https://developers.openai.com/cookbook/articles/codex_exec_plans
- **Key takeaways:**
  - Long-running agent tasks benefit from self-contained, living plans
  - Plans should describe purpose, progress, surprises, decisions, validation, recovery, and exact commands
  - Acceptance must be observable behavior, not merely code changes
- **How it informs this repo:** `plugins/deliver/skills/deliver/reference/plans-and-exec-plans.md` adapts ExecPlans for deliver's generic issue-resolution loop.

## 14. Google Cloud — Agent Factory Recap

- **URL:** https://cloud.google.com/blog/topics/developers-practitioners/agent-factory-recap-a-deep-dive-into-agent-evaluation-practical-tooling-and-multi-agent-systems
- **Key takeaways:**
  - Agent evaluation should inspect final outcome, reasoning, tool utilization, and memory/context retention
  - Combine ground truth checks, LLM-as-judge, and human-in-the-loop review
  - Use traces to find root causes and validate fixes
- **How it informs this repo:** Deliver's review reports and loop traces record both outcomes and the path taken to reach them.

## 15. Google Developers — Production-Ready AI Agents

- **URL:** https://developers.googleblog.com/production-ready-ai-agents-5-lessons-from-refactoring-a-monolith/
- **Key takeaways:**
  - Replace monolithic prompts/scripts with orchestrated, specialized sub-agents
  - Use structured outputs, dynamic retrieval, observability, and circuit breakers
  - Install boundaries so loops do not burn tokens indefinitely
- **How it informs this repo:** Deliver v7 keeps specialized roles, structured handoffs, explicit traces, and max-iteration escalation.

## 16. Cloudflare — Agents SDK

- **URL:** https://developers.cloudflare.com/agents/
- **Key takeaways:**
  - Real agents need durable state, tools, schedules, workflows, and human-in-the-loop approval
  - Workflows should support retries and long-running execution
  - Tools can be exposed to other agents through MCP
- **How it informs this repo:** Deliver treats stateful handoff artifacts and human checkpoints as first-class loop controls.

## 17. Microsoft AutoGen — Selector Group Chat

- **URL:** https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html
- **Key takeaways:**
  - Multi-agent systems benefit from clear participant names and descriptions
  - Planning agents decompose tasks, delegate, and use termination conditions
  - Dynamic selection works best when roles and boundaries are explicit
- **How it informs this repo:** Deliver uses distinct explorer, planner, reviewer, worker, and verifier roles with explicit routing signals.

---

## Additional Reference

- **Simon Willison** — "I ported JustHTML from Python to JavaScript with Codex CLI"
  - Practical demonstration of agent-first development workflow with Codex CLI
  - Validates the cross-platform agent skill approach this repo enables

## Synthesis

These references converge on several themes that directly shaped this repo's architecture:

| Theme | Sources | Repo Implementation |
|-------|---------|---------------------|
| Lean agent-facing docs | OpenAI Harness, Anthropic Skills | `AGENTS.md` as TOC, cascaded `docs/` |
| Skill progressive disclosure | Anthropic Skills, Agent Skills standard | Concise SKILL.md files with direct references and eval prompts |
| Mechanical enforcement | OpenAI Harness, LangChain State | Hooks, linters, CI — not human review |
| Plan-work-review convergence | Anthropic Agents, OpenAI ExecPlans, Google Agent Factory | Deliver loop: contract -> plan -> work -> review -> decide |
| Context layering | Anthropic Context, Advanced Tool Use | Permanent -> on-demand -> runtime -> memory |
| Skills lazy-loading | Anthropic Skills, Advanced Tool Use | SKILL.md descriptors → full load on match |
| File-based state | Anthropic Autonomy, OpenAI Harness | Handoff artifacts, task progress on disk |
| Security by architecture | OpenAI Injection, LangChain State | Workspace isolation, minimal permissions |
| Evals as infrastructure | Anthropic Evals, LangChain State | Contract criteria, verify step, ground truth |

---
title: "Agent Engineering: Principles, Architecture, and Practice"
description: Structured summary of @HiTw93's comprehensive analysis of agent engineering fundamentals.
source: "https://x.com/HiTw93 — 你不知道的 Agent：原理、架构与工程实践 (Mar 2026)"
last_updated: 2026-04-05
---

# Agent Engineering: Principles, Architecture, and Practice

Structured summary of [@HiTw93 (Tw93)](https://x.com/HiTw93)'s post "你不知道的 Agent：原理、架构与工程实践" (March 2026). This post synthesizes lessons from open-source agent implementations, production experience, and references from [OpenAI, Anthropic, Cloudflare, and LangChain](industry-references.md).

---

## 1. Agent Loop Fundamentals

The core agent loop is ~20 lines: perceive → decide → act → feedback, repeating until the model returns pure text (no tool calls).

**Key insight:** The loop itself is remarkably stable across implementations. New capabilities attach externally — extending tool sets, adjusting system prompts, externalizing state — rather than modifying the loop body. The loop should never become a giant state machine.

**Three integration points for new capabilities:**
1. Extend tool sets and handlers
2. Adjust system prompt structure
3. Externalize state to files or databases

**Workflow vs Agent:** Execution path hardcoded in code = Workflow. LLM dynamically decides next step = Agent. Neither is inherently better — match the pattern to the task.

**Five control flow patterns:**
- **Prompt Chaining** — sequential steps, each processing the previous output
- **Routing** — classify input, direct to specialized handler
- **Parallelization** — split into independent subtasks (sectioning) or run same task multiple times (voting)
- **Orchestrator-Workers** — central LLM decomposes and delegates dynamically
- **Evaluator-Optimizer** — generator produces, evaluator gives feedback, loop until quality threshold

## 2. Harness > Model

Harness = verification infrastructure: acceptance baselines, execution boundaries, feedback signals, rollback mechanisms.

**Key insight:** What determines whether a system runs stably is often not the model but the surrounding engineering infrastructure. More expensive models don't always bring proportionally better results — harness quality and test automation have higher impact on success rates.

**OpenAI's agent-first development:** 3 engineers, 5 months, ~1M lines, ~1,500 PRs at 10x velocity. The speed came from engineering decisions:
- Knowledge must exist in the codebase itself (AGENTS.md as ~100-line index)
- Constraints encoded as linters/CI rules, not documentation
- Agent completes full task autonomy: verify → reproduce → fix → validate → PR → merge
- Minimize merge friction: flaky tests get retried, not blocked

**Task quadrant:** Tasks with clear goals + automated verification are ideal for agents. Clear goals without automation are bottlenecked by human review speed. Automated verification without clear goals leads to efficiently going in the wrong direction.

## 3. Context Engineering

Transformer attention is O(n²) — longer context dilutes key signals. Most failures attributed to "model capability" trace back to poorly organized context (Context Rot).

**Five context layers:**
1. **Permanent** — identity, project conventions, absolute prohibitions. Short, hard, executable.
2. **On-demand** — Skills and domain knowledge. Descriptors always present, full content loaded on trigger.
3. **Runtime injection** — current time, channel ID, user preferences. Assembled per-turn.
4. **Memory** — cross-session experience in MEMORY.md. Read on demand, not default-loaded.
5. **System** — hooks and code rules for deterministic logic. Never enters context at all.

**Rule:** Don't put deterministic logic in context. Use hooks, code rules, or tool constraints instead.

**Three compression strategies:**
1. Sliding window — drop old messages (cheap, loses early context)
2. LLM summary — model generates digest (medium cost, loses details but preserves decisions)
3. Tool result replacement — placeholder replaces original output (cheap, good for tool-heavy workflows)

**Prompt Caching:** Stable prefixes (system prompt, tool definitions) get cached KV pairs. Stable large system prompts are cheaper than frequently-changing small ones (90% read discount after one-time write cost). Skills lazy-loading preserves prefix stability.

**Skill descriptors:** Must be short (routing condition, not feature description). Include anti-examples — accuracy drops from 73% to 53% without them, rises to 85% with them. Scan available skills every turn, but keep scan cost low.

**Compression preserves:** architecture decisions > modified files > verification status > unresolved TODOs > tool output (droppable). Never alter identifiers (UUIDs, hashes, URLs, file paths).

## 4. Tool Design

Tools determine what agents can do. 5 MCP servers can bring ~55K tokens of tool definitions — nearly 30% of a 200K context window before any conversation begins.

**Three generations of tool design:**
1. **API Wrapping** — one tool per endpoint, too fine-grained
2. **ACI (Agent-Computer Interface)** — tools match agent goals, not API operations
3. **Advanced Tool Use** — dynamic discovery, code-based orchestration, example-driven

**ACI principles:**
- Tools describe when to use AND when NOT to use
- Structured errors with recovery suggestions (not just "Error: failed")
- Definition and implementation bound together (e.g., Zod schema)
- Debug by checking tool definitions first — most selection errors come from inaccurate descriptions

**Tool restraint:** Don't add tools for things shell can handle, static knowledge can cover, or Skills can address.

## 5. Memory System

Agents have no native temporal continuity — context clears after each session.

**Four memory types:**
1. **Working memory** (context window) — current task's minimum info, token-limited
2. **Procedural memory** (Skills) — how to do things, loaded on demand
3. **Episodic memory** (JSONL session history) — what happened, disk-persisted, searchable
4. **Semantic memory** (MEMORY.md) — agent-curated important facts, injected at session start

**Memory consolidation:** Triggered at ~50% token threshold. Success path: summarize → append to MEMORY.md → update index pointer. Failure path: archive raw messages to disk. Key principle: only move pointers, never delete originals — consolidation must be reversible.

**For most agents:** Structured Markdown + keyword search provides sufficient debuggability and maintainability. Only introduce vector search when scale exceeds thousands of entries and semantic similarity is genuinely needed.

## 6. Progressive Autonomy

Not about fewer human confirmations — about agents sustaining stable progress over longer time spans.

**Cross-session continuity:** Split into Initializer Agent (generates feature-list.json, init.sh, initial commit, progress file) and Coding Agent (loops: restore from progress file + git log → implement feature → test → update progress → commit → exit). Crash recovery is automatic.

**Explicit task state:** One `in_progress` at a time. Update state before continuing. Use JSON, not Markdown, for structured files agents must reliably modify.

**Background I/O:** Slow subprocess operations go to background threads; results injected via notification queue before next LLM turn. Simpler and more stable than full async runtime.

## 7. Multi-Agent Organization

**Two modes:**
- **Conductor** (synchronous) — human + single agent, tight per-turn interaction. Context lost on session end.
- **Orchestrator** (asynchronous) — human sets goals, multiple agents work in parallel, human reviews output. Produces persistent artifacts (branches, PRs).

**Infrastructure order:**
1. Protocol first (JSONL inbox: `{ request_id, from_agent, to_agent, content, status, timestamp }`)
2. Isolation next (worktrees per agent for file changes)
3. Task graph (`.tasks/` for dependencies)
4. Then collaboration and parallelism

**Hallucination amplification:** Multiple agents interacting can compound errors — Agent A drifts, B reinforces, C amplifies. Cross-validation breaks the chain.

**Sub-agent constraints:** Max depth limit (prevent infinite recursion). Minimal system prompt: Tooling + Workspace + Runtime only — no Skills, no Memory, no extra permissions.

## 8. Evaluation

**Why agent evals are harder:** Multi-step, tool-using, environment-modifying behavior can't be captured by single-turn benchmarks.

**Two key metrics (don't mix):**
- **Pass@k** — "can the agent do this at all?" (capability, development phase)
- **Pass^k** — "does what worked still work?" (regression, pre-launch)

**Three grader types:**
1. Code graders — string match, unit tests, structural comparison (most deterministic)
2. Model graders — rubric scoring, pairwise comparison, multi-model voting
3. Human graders — expert sampling, annotation calibration (reliable but slow)

**Transcript vs Outcome:** "Agent said it's done" (transcript) vs "database actually has the record" (outcome). Both must be evaluated.

**Building evals from zero:** Start with 20-50 real failure cases. Clean environment per run. Cover positive AND negative examples. Code graders first, model graders for semantic quality, human graders for calibration.

**Critical rule:** Fix evals before fixing agents. Evaluation infrastructure bugs (resource limits, grader bugs, stale test cases) masquerade as model regression.

## 9. Observability

**Trace requirements:**
- Complete prompt (including system prompt)
- Full multi-turn `messages[]`
- Every tool call + parameters + return value
- Reasoning chain (if thinking mode enabled)
- Final output + token consumption + latency

**Two-layer observability:**
1. Human sampling — rule-based selection of error cases, long conversations, negative feedback → manual quality judgment
2. LLM auto-evaluation — broader coverage, calibrated by layer 1 annotations

**Online eval sampling (not random):**
- Negative feedback → 100% into queue
- High-cost conversations (token threshold exceeded) → priority review
- Time-window sampling → daily random for normal traffic coverage
- Post model/prompt change → 48-hour full review

**Event stream architecture:** Agent loop emits events at `tool_start`, `tool_end`, `turn_end`. Full trace persists to disk. Multiple downstream consumers (logs, UI, eval framework, human review queue) subscribe independently — main loop never changes for downstream needs.

## 10. OpenClaw: A Reference Implementation

OpenClaw demonstrates these principles in a running system with five decoupled layers:

1. **Gateway** — WebSocket service, unified message routing
2. **Channel adapters** — 23+ platforms, unified interface (`start`, `stop`, `send`)
3. **Pi Agent** — main loop, session state, scheduling (fully decoupled from channels)
4. **Tool set** — shell/fs/web/browser/MCP, ACI-designed
5. **Context + Memory** — Skills lazy-loading + MEMORY.md, 50% token threshold auto-consolidation

**System prompt layering:** SOUL.md (identity) → AGENTS.md → TOOLS.md → USER.md → MEMORY.md → Skills index → runtime injection (time, channel, chat ID).

**Three trigger modes:** Normal conversation (full system prompt), sub-agent (minimal: runtime only), heartbeat (HEARTBEAT.md, system-initiated checks every 5 minutes).

**Crash recovery:** Task state persisted to `.openclaw/tasks/{taskId}.json`. Resume from checkpoint on restart.

**Security:** Whitelist authorization → workspace path isolation (realpath + relative check) → audit log (JSONL append-only) → untrusted content wrapping → provider failover chain.

## 11. Common Anti-Patterns

| # | Anti-Pattern | Symptom | Fix |
|---|-------------|---------|-----|
| 1 | System prompt as knowledge base | Growing prompt, key rules ignored | Rules in prompt, knowledge in Skills |
| 2 | Tool count explosion | Agent frequently selects wrong tool | Merge overlapping tools, clear namespaces |
| 3 | Missing verification loop | "Done" without proof | Bind acceptance criteria per task type |
| 4 | Multi-agent without boundaries | State drift, hard to attribute failures | Role + permission isolation, worktrees |
| 5 | No memory consolidation | Decision quality degrades after turn 20 | Monitor tokens, auto-trigger at threshold |
| 6 | No evaluation | Unknown regression after any change | First failure → first test case |
| 7 | Premature multi-agent | Coordination overhead > parallelism gains | Verify single-agent ceiling first |
| 8 | Constraints by expectation | Rules in docs, agent selectively follows | Tool validation, linters, hooks |

## 12. Summary

Core themes compressed for reference:

- **Agent loop** is stable — extend via tools, prompts, external state; don't modify the loop
- **Harness > model** — automated verification and clear goals matter more than model upgrades
- **Context engineering** prevents rot — layer by frequency, compress by priority, cache stable prefixes
- **ACI tool design** — goal-oriented, bounded, self-documenting, example-driven
- **Memory** — working + procedural + episodic + semantic; consolidation must be reversible
- **Autonomy** — externalize state to files, split initializer/worker, JSON over Markdown
- **Multi-agent** — protocol → isolation → task graph → then parallelism
- **Evals** — Pass@k for capability, Pass^k for regression; fix evals before fixing agents
- **Observability** — event stream base, two-layer (human + LLM), rule-based sampling
- **Security** — whitelist, workspace isolation, audit log, source-sink injection defense

---

*Source: [@HiTw93 (Tw93)](https://x.com/HiTw93) — "你不知道的 Agent：原理、架构与工程实践" (March 2026)*
*Referenced posts: see [industry-references.md](industry-references.md)*

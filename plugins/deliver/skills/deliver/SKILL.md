---
name: deliver
description: "Execute a complete delivery pipeline for a task. Use when asked to build, fix, refactor, migrate, or implement any change that benefits from structured planning and validation."
version: 5.0.1
---

# deliver

You are the orchestrator. Run the GAN loop — proposer vs critic, grounded by external verification. Delegate steps to specialist agents. Do NOT delegate orchestration.

## Principles

Follow `dev:principles`. Additionally:

- **Contract-first.** Every task → goals, constraints, testable success criteria.
- **Do not trust without critic.** Every proposal gets adversarial review.
- **Do not rely on agreement.** Prefer simple, correct, testable solutions.
- **External ground truth.** Tests, types, builds, lint — not reasoning.

## Process

### 1 — Frame

Convert task into a **contract**:

- **Goals** — specific, measurable outcomes
- **Constraints** — invariants that must not be violated
- **Success criteria** — each verifiable by external check (test, typecheck, build, lint, mechanical inspection). Flag any that cannot be externally verified.

The contract is the single source of truth. All steps reference it.

### 2 — Explore

Delegate to **explorer agent**. Provide: contract + task description.

Runs **once**. Re-explore only on explicit `re-explore` signal from critic/verifier — targeted, not full.

### 3 — GAN Loop (max 3 iterations)

Each iteration: **propose → critic → verify → decide**.

#### 3a — Propose

Two sub-steps in sequence:

1. **Plan** → delegate to **proposer agent**. Creates/revises strategy, phases, acceptance criteria, non-goals, mitigations. On iteration 2+: must address every blocking issue from critic/verifier and show what changed.

2. **Implement** → delegate to **implementer agent**. Executes plan, verifies locally, documents changes and deviations.

#### 3b — Critic

Delegate to **critic agent**. Adversarial — finds real flaws, does not confirm.

Produces: issues (with severity + evidence), strengths, and exactly one **signal**:
- `accept` — proceed to verify
- `revise-plan` — strategy flawed
- `revise-implementation` — plan sound, code has issues
- `re-explore` — critical context missing

#### 3c — Verify

Delegate to **verifier agent**. Runs external checks: build → typecheck → lint → tests → write tests for gaps → full suite.

Produces: per-criterion pass/partial/fail/untested, failure classification (blocking/degraded/cosmetic), confidence (high/medium/low), residual risk, blocking failure count.

#### 3d — Decide

Orchestrator decides (do not delegate):

- **ACCEPT** — all criteria pass + no blocking critic issues + confidence ≥ medium
- **ITERATE** — blocking failures or unmet criteria remain → route via critic signal
- **ESCALATE** — max 3 iterations reached, OR no improvement after 2 iterations (measured: blocking verify failures + blocking/high critic issues), OR unresolvable issue

On escalate: report what was attempted, what failed, and what options remain.

### 4 — Deliver

On ACCEPT, produce: task summary, contract, iteration count, criteria status, files changed, confidence, key decisions, follow-ups.

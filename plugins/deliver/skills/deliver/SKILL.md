---
name: deliver
description: "Execute a complete delivery pipeline for a task. Use when asked to build, refactor, migrate, or implement any change that benefits from structured planning and validation."
version: 6.1.0
---

# deliver

You are the orchestrator. Drive the loop, delegate to specialists, never implement directly.

## When to Use

Use the full pipeline for tasks that benefit from structured planning and validation: multi-file changes, refactors, migrations, new features with testable criteria.

**Do NOT use** for: single-line fixes, typo corrections, config changes, documentation-only edits, or any task where the change is obvious and < 50 lines. For these, implement directly. For bug reports, errors, crashes, or regressions, use the bugfix skill instead.

## Complexity Routing

Before entering the loop, classify the task:

- **Trivial** (typo, config, docs): implement directly, no pipeline.
- **Standard** (single feature, bug fix, < 5 files): full pipeline, max 2 iterations.
- **Complex** (refactor, migration, multi-service, > 10 files): full pipeline, max 3 iterations, human checkpoint enabled after critic accepts.

## Loop

```
FRAME → EXPLORE → LOOP(PLAN → CRITIC → VERIFY-CRITIC → IMPLEMENT → VERIFY → DECIDE)
                                                                          max 3
```

### 1. Frame

Convert the task into a **contract**: goals, constraints, testable success criteria. Every criterion must be mechanically verifiable (test, build, lint, typecheck, inspection). Rewrite any that are not.

### 2. Explore

Delegate to **explorer agent**. Produces an `exploration_report`: relevant files, constraints, unknowns, risk hotspots.

### 3. Loop (max 3 iterations)

#### 3a. Plan

Delegate to **planner agent**. Produces a `plan` following `reference/plans-and-exec-plans.md`: strategy, phased execution with dependencies and acceptance criteria, non-goals, mitigations, rollback.

On iteration 2+: planner addresses every blocking issue from the previous critic and verifier reports. Must show what changed and why.

#### 3b. Critic (plan)

Delegate to **critic agent** with the plan. Adversarial review before implementation begins. Produces a `critic_report` with exactly one signal:

- `accept` — plan is sound, proceed to implement
- `revise-plan` — strategy flawed, return to 3a (max 2 revise-plan sub-loops per iteration)
- `re-explore` — critical context missing, return to 2

**Human checkpoint (complex tasks only):** When complexity routing classified the task as Complex, present the accepted plan to the user before proceeding to Implement. Wait for confirmation or adjustments.

#### 3c. Verify Critic

Delegate to **critic-verifier agent** with the `critic_report`, `plan`, and `contract`. Validates that the critic's findings are grounded in real evidence — not hallucinated, misread, or based on incorrect assumptions. Produces a `verified_critic_report`:

- Each issue marked `confirmed`, `downgraded`, or `dismissed` with verification evidence.
- A verified signal that may differ from the critic's original if phantom issues changed the picture.

The orchestrator uses the **verified signal** (not the critic's raw signal) for routing:

- `accept` → proceed to Implement
- `revise-plan` → return to 3a (same sub-loop cap applies)
- `re-explore` → return to 2

#### 3d. Implement

Delegate to **implementer agent**. Executes the plan incrementally. Produces an `implementation_report`: files changed, deviations, verification focus areas.

#### 3e. Verify

Delegate to **verifier agent**. Runs external checks (build, typecheck, lint, tests). Writes tests for coverage gaps. Maps results to contract criteria. Produces a `verify_report`: criteria status (pass/partial/fail/untested), failures classified, confidence, blocking failure count.

#### 3f. Decide

- **Accept**: all contract criteria pass verification AND no blocking critic issues AND confidence ≥ medium.
- **Iterate**: blocking issues remain AND iteration < 3 AND improvement observed (fewer blocking failures than previous iteration).
- **Escalate**: max iterations reached OR no improvement after 2 iterations OR unresolvable issue. Report to user.

## Handoff Artifacts

| Step | Produces | Consumed by |
|------|----------|-------------|
| Frame | `contract` (goals, constraints, criteria) | all steps |
| Explore | `exploration_report` | planner, critic |
| Plan | `plan` (strategy, phases, criteria) | critic, implementer, verifier |
| Critic | `critic_report` (issues, strengths, signal) | critic-verifier |
| Verify Critic | `verified_critic_report` (verified issues, signal) | decide, planner (next iter) |
| Implement | `implementation_report` (files, deviations) | verifier |
| Verify | `verify_report` (criteria status, confidence) | decide, planner (next iter) |
| Pipeline end | `pipeline_trace` (all artifacts + timing + decisions) | post-mortem, learning log |

## Rules

- **Contract-first.** No work without testable success criteria.
- **Critic before code.** Plan is challenged before implementation begins.
- **External verification is ground truth.** Tests, types, builds — not reasoning.
- **Plans follow** `reference/plans-and-exec-plans.md`.
- **Engineering principles** from `dev:principles` apply to all steps.
- **Escalate, don't auto-accept on stall.**
- **Targeted re-explore only.** When critic signals `re-explore`, investigate the specific gap — do not restart full exploration.

## Context Management

On iteration 2+, compress previous iteration artifacts before starting the new iteration. See `OPERATING-RULES.md` for full retention priority and summarization rules.

Key principles:
- **Threshold-based**: compress when accumulated artifacts exceed 50% of available context
- **Recency-based**: current iteration in full, previous iterations summarized
- **Priority-based**: `contract` and current `plan` are never compressed; old `implementation_report` is dropped first
- **Never alter identifiers**: commit hashes, file paths, UUIDs must survive compression intact

## Observability

At pipeline completion, the orchestrator produces a `pipeline_trace` recording:
- Timestamp and duration for each step
- All handoff artifacts (or summaries for iteration 2+)
- Decision points and signals (critic signals, decide outcomes)
- Iteration count, final disposition (accept/escalate), and total token estimate

## Learning

After a successful delivery, append new patterns discovered during the loop to `knowledge/planning-patterns.md` Learning Log. Record: what strategy worked, what the critic caught, what the verifier found, and any anti-pattern encountered.

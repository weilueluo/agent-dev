---
name: deliver
description: "Execute a complete delivery pipeline for a task. Use when asked to build, fix, refactor, migrate, or implement any change that benefits from structured planning and validation."
version: 6.0.0
---

# deliver

You are the orchestrator. Drive the loop, delegate to specialists, never implement directly.

## Loop

```
FRAME → EXPLORE → LOOP(PLAN → CRITIC → IMPLEMENT → VERIFY → DECIDE)
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
- `revise-plan` — strategy flawed, return to 3a
- `re-explore` — critical context missing, return to 2

#### 3c. Implement

Delegate to **implementer agent**. Executes the plan incrementally. Produces an `implementation_report`: files changed, deviations, verification focus areas.

#### 3d. Verify

Delegate to **verifier agent**. Runs external checks (build, typecheck, lint, tests). Writes tests for coverage gaps. Maps results to contract criteria. Produces a `verify_report`: criteria status (pass/partial/fail/untested), failures classified, confidence, blocking failure count.

#### 3e. Decide

- **Accept**: all contract criteria pass verification AND no blocking critic issues AND confidence ≥ medium.
- **Iterate**: blocking issues remain AND iteration < 3 AND improvement observed (fewer blocking failures than previous iteration).
- **Escalate**: max iterations reached OR no improvement after 2 iterations OR unresolvable issue. Report to user.

## Handoff Artifacts

| Step | Produces | Consumed by |
|------|----------|-------------|
| Frame | `contract` (goals, constraints, criteria) | all steps |
| Explore | `exploration_report` | planner, critic |
| Plan | `plan` (strategy, phases, criteria) | critic, implementer, verifier |
| Critic | `critic_report` (issues, signal) | decide, planner (next iter) |
| Implement | `implementation_report` (files, deviations) | verifier |
| Verify | `verify_report` (criteria status, confidence) | decide, planner (next iter) |

## Rules

- **Contract-first.** No work without testable success criteria.
- **Critic before code.** Plan is challenged before implementation begins.
- **External verification is ground truth.** Tests, types, builds — not reasoning.
- **Plans follow** `reference/plans-and-exec-plans.md`.
- **Engineering principles** from `dev:principles` apply to all steps.
- **Escalate, don't auto-accept on stall.**
- **Targeted re-explore only.** When critic signals `re-explore`, investigate the specific gap — do not restart full exploration.


---
name: deliver
description: "Execute a complete delivery pipeline for a task. Use when asked to build, fix, refactor, migrate, or implement any change that benefits from structured planning and validation."
version: 5.0.0
---

# deliver

You are the pipeline orchestrator. You run a GAN-style adversarial loop — proposer vs critic, grounded by external verification. You delegate each step to the correct specialist agent and manage iteration, routing, and stop conditions.

**You are the orchestrator. Do NOT delegate to another orchestrator.** Delegate each step to the specialist agent for that step.

## When to Use

When a task benefits from structured exploration, planning, implementation, and verification. Not needed for trivial one-line changes.

## Principles

All steps operate under the engineering principles in `dev:principles`. Key rules for the loop:

- **Do not trust own output without critic.** Every proposal gets adversarial review.
- **Do not rely on agreement.** Prefer simple, correct, testable solutions.
- **Use external checks.** Tests, types, builds, lint, API responses — ground truth over reasoning.
- **Contract-first.** Convert every task into goals, constraints, and testable success criteria before work begins.

## Inputs

- **task description**: What needs to be done.

## Process

### Step 1 — Frame the Contract

Before any exploration or planning, convert the task description into a clear contract:

- **Goals**: What must be achieved. Specific, measurable outcomes.
- **Constraints**: What must not be violated. Boundaries and invariants.
- **Success criteria**: Testable conditions. Each criterion must be verifiable by an external check (test, type check, build, lint, API call) or by mechanical inspection (file exists, config value set, pattern present). If a criterion cannot be externally verified, flag it.

The contract is the single source of truth for the entire loop. All steps reference it.

### Step 2 — Explore

Delegate to the **explorer agent**.

Provide: the contract (goals, constraints, success criteria) and the task description.

The explorer maps the codebase, surfaces constraints, catalogs known facts, identifies unknowns, and flags risk hotspots. Collect the exploration report.

Exploration runs **once** at the start. Re-exploration only happens if the critic or verifier explicitly signals an exploration gap (see loop routing below). Re-exploration is always **targeted** — focused on the specific gap, not a full re-run.

### Step 3 — GAN Loop

Run the adversarial loop. Each iteration has four steps: **propose → critic → verify → decide**.

**Max iterations: 3.** Track iteration count and improvement across iterations.

#### Step 3a — Propose

The propose step has two sub-steps executed in sequence:

**Sub-step 1: Plan** — Delegate to the **proposer agent** (planning mode).

Provide: the contract, exploration report, and (if iteration > 1) the previous critic report and verify report.

The proposer creates or revises:
- A strategy and execution plan with phased steps
- Acceptance criteria per phase (derived from the contract's success criteria)
- Non-goals
- Risk mitigations

On iteration 1, the proposer starts fresh. On subsequent iterations, the proposer must address every blocking issue raised by the critic and every failing check from the verifier. The proposer must not simply restate the previous plan — it must show what changed and why.

**Sub-step 2: Implement** — Delegate to the **implementer agent**.

Provide: the plan from sub-step 1, exploration report, and (if iteration > 1) the previous critic report, verify report, and prior implementation context.

The implementer executes the plan incrementally, verifies changes locally (build, typecheck if available), and documents files changed and any deviations.

#### Step 3b — Critic

Delegate to the **critic agent**.

Provide: the contract, exploration report, the plan from 3a, and the implementation report from 3a.

The critic is **adversarial**. Its job is to find real flaws, not to confirm the proposal. Rules:

- Do not trust the proposer's claims. Verify against the contract and exploration findings.
- Do not just agree. If everything looks correct, explain *why* with evidence — silence is not acceptance.
- Challenge assumptions, find missing edge cases, check constraint violations.
- Prefer simple, correct solutions. Flag unnecessary complexity.
- Reference `dev:principles` and `knowledge/planning-patterns.md` anti-patterns.

The critic produces:
- **Specific issues** with evidence and severity (blocking / high / medium / low)
- **What's working** — strengths to preserve
- **Signal**: one of:
  - `accept` — proposal is sound, proceed to verify
  - `revise-plan` — strategy or plan has flaws (specify what)
  - `revise-implementation` — plan is sound but implementation has issues (specify what)
  - `re-explore` — critical exploration gap discovered (specify what's missing)

#### Step 3c — Verify

Delegate to the **verifier agent**.

Provide: the contract, plan, implementation report, and critic report.

The verifier runs **external checks** — these are ground truth, not reasoning:

1. **Build** the code
2. **Type check** if the project has a type checker
3. **Lint** if the project has a linter
4. **Run existing test suite**
5. **Write tests for gaps** — if success criteria lack test coverage, add tests
6. **Run the full test suite** including new tests

The verifier also:
- **Classifies failures**: blocking (must fix), degraded (should fix), cosmetic (can defer)
- **Maps results to success criteria**: for each criterion in the contract, report pass / partial / fail / untested
- **Reports residual risk**: what's not covered by checks
- **Estimates confidence**: high (>90%), medium (70-90%), low (<70%)

#### Step 3d — Decide

The orchestrator (you) makes the decision. Do not delegate this step.

Evaluate the critic report and verify report against the contract's success criteria:

**ACCEPT** if ALL of:
- All success criteria pass in verification (or are verified by mechanical inspection)
- No blocking issues from the critic remain unaddressed
- Confidence is medium or higher

**ITERATE** if ANY of:
- Blocking verification failures exist → route based on critic signal
- Blocking critic issues remain → route to next iteration's propose
- Success criteria not yet met → route to next iteration

**ESCALATE TO USER** if ANY of:
- Max 3 iterations reached without acceptance
- No measurable improvement after 2 iterations. Improvement is measured by: fewer blocking verification failures AND fewer blocking/high-severity critic issues compared to previous iteration. If both counts are equal or worse, there is no improvement.
- Critic or verifier signals an unresolvable issue (e.g., contradictory requirements, missing external dependency)

When escalating, report: what was attempted, what failed, what the critic found, what the verifier found, and what options remain.

**Loop routing for next iteration:**
- Critic signaled `revise-plan` → next iteration's propose revises strategy
- Critic signaled `revise-implementation` → next iteration's propose keeps plan, revises implementation
- Critic signaled `re-explore` → run targeted re-exploration before next propose
- Verifier found blocking failures → feed failure details into next iteration's propose

### Step 4 — Deliver

When decide returns ACCEPT, produce a delivery report:

- **Task**: what was requested
- **Contract**: goals, constraints, success criteria
- **Iterations**: how many loop iterations ran
- **Final state**: which success criteria pass, which have residual risk
- **Files changed**: list of all files modified
- **Confidence**: overall confidence level from verifier
- **Key decisions**: notable choices and trade-offs made during the loop
- **Follow-ups**: items for later (if any deferred issues exist)

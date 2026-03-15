---
name: deliver
description: "Execute a complete delivery pipeline for a task. Use when asked to build, fix, refactor, migrate, or implement any change that benefits from structured planning and validation."
version: 3.0.0
---

# deliver

You are the workflow orchestrator. You directly manage the delivery pipeline — classifying the task, choosing a mode, working through each phase, and deciding when to delegate vs work inline.

## When to Use

When a task benefits from structured exploration, planning, implementation, testing, and review. Not needed for trivial one-line changes.

## Inputs

- **$ARGUMENTS**: Task description from the user
- **mode** (optional): quick, standard, deep, or high-risk. Auto-detected if not specified.

## Step 1 — Classify and Choose Mode

Assess the task along these dimensions:
- **Scope**: how many files/modules affected?
- **Risk**: what breaks if this goes wrong?
- **Ambiguity**: is the path obvious or are there multiple viable approaches?

Then choose a mode:

| Mode | When | Stages |
|------|------|--------|
| **quick** | Single-file, low risk, obvious path | light explore → minimal plan → implement → smoke test → brief review |
| **standard** | Normal bug/feature, moderate complexity | explore → plan → implement → test → review |
| **deep** | Multiple strategies, significant refactor, cross-cutting | explore → plan → critique → implement → test → review |
| **high-risk** | Migration, auth/security, infra, wide blast radius | deep explore → plan → critique → incremental implement → thorough test → strict review |

When in doubt, choose the more cautious mode.

## Step 2 — Work Through Phases

Execute the phases for your chosen mode in order. For each phase, decide whether to:
- **Work inline** — perform the phase yourself directly. This is the default.
- **Delegate** — use a specialist agent when the phase benefits from focused, isolated work (e.g., deep exploration of an unfamiliar codebase, or isolated implementation of a complex phase).

The pipeline must work correctly whether or not any specialist agents are invoked. Delegation is an optimization, not a requirement.

### Phase: Exploration

Build understanding of the task and codebase context.

Think through:
1. Frame the task — what does "done" look like?
2. Orient — project structure, tech stack, conventions
3. Map relevant files — what matters and how risky is each?
4. Surface constraints — explicit and implicit
5. Catalog known facts the planner needs
6. Identify unknowns — classify as blocking, important, or minor
7. Flag risk hotspots
8. Note investigation gaps

Optionally delegate to the explorer agent for focused, deep discovery.

Produce exploration findings for the next phase.

### Phase: Planning

Design the strategy and execution plan.

Think through:
1. Absorb exploration findings. If blocking unknowns remain, loop back to exploration.
2. Consult `knowledge/planning-patterns.md` and `knowledge/lessons-learned.md`
3. Choose perspectives relevant to this task (2-6 depending on complexity)
4. Generate strategies — one is fine for quick/standard; compare 2-3 for deep/high-risk
5. Choose a strategy and explain why
6. Design execution phases with dependencies and acceptance criteria
7. Define non-goals
8. Document mitigations and rollback

Optionally delegate to the planner agent for focused strategy work.

Produce a plan for the next phase.

### Phase: Plan Critique (deep and high-risk modes)

Review the plan before implementation.

Think through:
1. Cross-reference plan against exploration findings
2. Evaluate: completeness, sequencing, dependency clarity, acceptance clarity, rollback readiness, risk coverage
3. Check against anti-patterns from `knowledge/planning-patterns.md`
4. Decide: **accept**, **revise-plan**, or **re-explore**

Optionally delegate to the plan-critic agent.

If revise-plan: loop back to planning with specific guidance (max 2 rounds).
If re-explore: loop back to exploration with specific gaps (max 1 round).

### Phase: Implementation

Turn the plan into working changes.

Think through:
1. Read each phase — files, criteria, dependencies
2. Check prerequisites
3. Plan minimal change set
4. Implement incrementally, following existing conventions
5. Verify — build, typecheck, lint if available
6. Check for strategy conflict and unrelated changes
7. Document files changed, deviations, unresolved issues

Optionally delegate to the implementer agent for focused implementation work.

### Phase: Testing

Validate the implementation.

Think through:
1. Map each acceptance criterion to a verification method
2. Establish baseline (run existing tests first if possible)
3. Run checks — build, typecheck, lint, test suite
4. Write tests for gaps
5. Classify any failures: blocking, degraded, or cosmetic
6. Assess per-criterion status: passed, partial, failed, untested, blocked
7. Estimate confidence honestly
8. Report residual risk

Optionally delegate to the tester agent.

Based on results:
- **proceed to review** — no blockers, confidence ≥ 70%
- **revise** — fixable failures, strategy still valid
- **replan** — failures indicate strategy is wrong

### Phase: Review

Make the final quality call.

Think through:
1. Review all changes for correctness, design, maintainability, convention adherence
2. Walk each acceptance criterion — satisfied, partially met, or not met
3. Evaluate any deviations from the plan
4. Weigh test results and residual risk
5. Choose exactly one disposition:
   - **approve** — meets criteria, no significant issues
   - **approve-with-follow-ups** — solid delivery, 1-3 items for later
   - **revise** — fixable issues, strategy still sound
   - **replan** — strategy itself is flawed

## Step 3 — Handle Feedback Loops

Route feedback based on the disposition:

| Signal | Routes To | Max Cycles |
|--------|-----------|------------|
| Critic: revise-plan | Planning phase | 2 |
| Critic: re-explore | Exploration phase | 1 |
| Tester: revise | Implementation phase | 2 |
| Tester: replan | Replanning → Planning | 1 |
| Reviewer: revise | Implementation phase | 2 |
| Reviewer: replan | Replanning → Planning | 1 |

**Replanning**: When replan is triggered, analyze what went wrong, assess salvageable work, generate a materially different strategy, and produce revised phases. Max 1 replan per run.

If cycles exhaust without resolution, escalate to the user.

## Step 4 — Deliver

When the review approves (with or without follow-ups), produce a delivery report:

- **Task**: what was requested
- **Mode**: which mode was used
- **Stages executed**: which phases ran and whether they were inline or delegated
- **Final disposition**: approve or approve-with-follow-ups
- **Files changed**: list of all files modified
- **Confidence**: overall confidence level
- **Follow-ups**: any items for later (if applicable)
- **Key decisions**: notable choices made during the pipeline

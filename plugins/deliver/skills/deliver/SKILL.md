---
name: deliver
description: "Execute a complete delivery pipeline for a task. Use when asked to build, fix, refactor, migrate, or implement any change that benefits from structured planning and validation."
version: 4.0.0
---

# deliver

You are the pipeline orchestrator. You manage the delivery pipeline directly — classifying the task, choosing a mode, running phases in order, and delegating each phase to the correct specialist agent.

**You are the orchestrator. Do NOT delegate to the orchestrator agent.** Delegate each phase to the specialist agent for that phase.

## When to Use

When a task benefits from structured exploration, planning, implementation, testing, and review. Not needed for trivial one-line changes.

## Inputs

- **$ARGUMENTS**: Task description from the user
- **mode** (optional): quick, standard, deep, or high-risk. Auto-detected if not specified.

## Step 1 — Classify and Choose Mode

Assess the task:
- **Scope**: how many files/modules affected?
- **Risk**: what breaks if this goes wrong?
- **Ambiguity**: is the path obvious or are there multiple viable approaches?

Choose a mode:

| Mode | When | Phases |
|------|------|--------|
| **quick** | Single-file, low risk, obvious path | explore → plan → implement → review |
| **standard** | Normal bug/feature, moderate complexity | explore → plan → implement → test → review |
| **deep** | Multiple strategies, significant refactor, cross-cutting | explore → plan → critique → implement → test → review |
| **high-risk** | Migration, auth/security, infra, wide blast radius | explore → plan → critique → implement → test → review |

Quick mode skips plan critique and testing. Standard mode skips plan critique. Deep and high-risk run all phases — they differ in the depth expected within each phase.

When in doubt, choose the more cautious mode.

## Step 2 — Execute Pipeline

Run phases in order. Delegate each phase to its specialist agent. Do not skip phases unless the chosen mode excludes them.

### Phase 1 — Exploration

Delegate to the **explorer agent**.

Provide: the task description and chosen mode.

The explorer maps the codebase, surfaces constraints, catalogs known facts, identifies unknowns, and flags risk hotspots. Collect the exploration findings for Phase 2.

### Phase 2 — Planning

Delegate to the **planner agent**.

Provide: the task description, mode, and exploration findings from Phase 1.

The planner absorbs findings, generates strategies (1 for quick/standard, 2-3 for deep/high-risk), chooses a strategy with rationale, designs execution phases with acceptance criteria, defines non-goals, and documents mitigations. Collect the plan for the next phase.

### Phase 3 — Plan Critique (deep and high-risk only)

Delegate to the **plan-critic agent**.

Provide: the plan from Phase 2 and exploration findings from Phase 1.

The critic evaluates the plan for completeness, sequencing, criteria clarity, and risk coverage. Returns one decision:
- **accept** → proceed to Phase 4
- **revise-plan** → return to Phase 2 with revision guidance (max 2 rounds)
- **re-explore** → return to Phase 1 with specific gaps (max 1 round)

### Phase 4 — Implementation

Delegate to the **implementer agent**.

Provide: the approved plan (phases, acceptance criteria, dependencies), exploration findings, and any prior implementation context if this is a revision cycle.

The implementer executes phases incrementally, verifies changes, and documents files changed and any deviations. Collect the implementation report for Phase 5.

### Phase 5 — Testing (standard, deep, and high-risk only)

Delegate to the **tester agent**.

Provide: the plan, implementation report, and list of files changed.

The tester maps criteria to checks, runs validations, classifies failures, estimates confidence, and reports residual risk. Returns one recommendation:
- **proceed** → continue to Phase 6
- **revise** → return to Phase 4 with failure details (max 2 rounds)
- **replan** → trigger replanning, then return to Phase 2 (max 1 replan per run)

### Phase 6 — Review

Delegate to the **reviewer agent**.

Provide: exploration findings, plan, implementation report, and test report (if testing ran).

The reviewer evaluates correctness, design, plan adherence, and test adequacy. Returns exactly one disposition:
- **approve** → deliver
- **approve-with-follow-ups** → deliver with noted follow-ups
- **revise** → return to Phase 4 with specific issues (max 2 rounds)
- **replan** → trigger replanning, then return to Phase 2 (max 1 replan per run)

## Step 3 — Handle Feedback Loops

| Signal | Source | Routes To | Max Cycles |
|--------|--------|-----------|------------|
| revise-plan | Critic | Phase 2 — Planning | 2 |
| re-explore | Critic | Phase 1 — Exploration | 1 |
| revise | Tester | Phase 4 — Implementation | 2 |
| replan | Tester | Replanning → Phase 2 | 1 |
| revise | Reviewer | Phase 4 — Implementation | 2 |
| replan | Reviewer | Replanning → Phase 2 | 1 |

**Replanning**: Analyze what went wrong, assess salvageable work, generate a materially different strategy, and produce revised phases. Max 1 replan per run.

If cycles exhaust without resolution, escalate to the user.

## Step 4 — Deliver

When the reviewer approves (with or without follow-ups), produce a delivery report:

- **Task**: what was requested
- **Mode**: which mode was used
- **Phases executed**: which phases ran (with any loops noted)
- **Final disposition**: approve or approve-with-follow-ups
- **Files changed**: list of all files modified
- **Confidence**: overall confidence level
- **Follow-ups**: items for later (if applicable)
- **Key decisions**: notable choices made during the pipeline

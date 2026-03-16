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

## Multi-Agent Parallel Dispatch

Phases 2 (Planning), 3 (Plan Critique), and 6 (Review) use **multi-agent parallel dispatch** to increase analytical coverage and reduce blind-spot risk. The orchestrator chooses how many agents to dispatch (1–4) for each phase. When only 1 agent is dispatched, standard single-agent behavior applies and no synthesis step is needed.

### Dispatch Pattern

For each of these three phases, the orchestrator:

1. **Generates 1–4 perspective prompts** tailored to the current task. Perspectives are complementary lenses for the agent's analysis — choose them dynamically based on the task domain, risk profile, and complexity. Never use a fixed list. Examples:

   - **Planning**: "minimum-risk, maximum-rollback-safety focus", "delivery-speed, minimum-change focus", "long-term maintainability and design quality focus"
   - **Critique**: "completeness and gap analysis focus", "feasibility and implementation risk focus", "criteria clarity and testability focus"
   - **Review**: "correctness and edge-case focus", "design quality and maintainability focus", "plan adherence and scope discipline focus"

2. **Dispatches 1–4 instances of the same agent type in parallel** (e.g., 1–4 planner agents, not different agent types). Each agent receives the standard phase inputs plus its unique perspective prompt. Use the task tool's `model` parameter to assign different AI models across agents where available — if a model is unavailable, the agent falls back to the default model. Each agent receives the full input context, not a summary.

3. **Collects all outputs** after parallel dispatch completes.

4. **Synthesizes a single handoff artifact** conforming to the stage's handoff schema. Synthesis is performed inline by the orchestrator (not by a separate agent). See each phase below for stage-specific synthesis instructions.

### Complementarity with Internal Perspectives

The planner agent generates its own 2–6 internal analytical perspectives as part of its planning process. The external perspective prompt provides a *lens* or *orientation* for the agent's entire session, while the internal perspectives are analytical angles *within* that lens. These two mechanisms are complementary — each parallel planner operates under its assigned external lens and generates its own internal perspectives within that lens.

### Fresh Perspectives on Re-Runs

When a feedback loop triggers a re-run of a parallelized phase, generate **fresh** perspective prompts — do not reuse perspectives from the previous round. Fresh perspectives reduce the chance of repeating the same blind spot.

## Step 2 — Execute Pipeline

Run phases in order. Do not skip phases unless the chosen mode excludes them.

### Phase 1 — Exploration

Delegate to the **explorer agent**.

Provide: the task description and chosen mode.

The explorer maps the codebase, surfaces constraints, catalogs known facts, identifies unknowns, and flags risk hotspots. Collect the exploration findings for Phase 2.

### Phase 2 — Planning

Generate 1–4 perspective prompts per the Multi-Agent Parallel Dispatch protocol. Delegate to 1–4 **planner agents in parallel**, each receiving: the task description, mode, exploration findings from Phase 1, and its unique perspective prompt. Vary models via the `model` parameter.

Each planner absorbs findings, generates strategies (1 for quick/standard, 2-3 for deep/high-risk), chooses a strategy with rationale, designs execution phases with acceptance criteria, defines non-goals, and documents mitigations. Each planner's internal perspective mechanism (2–6 analytical perspectives) operates within its assigned external lens.

**Synthesis** — After all planners return, synthesize a single `planner_handoff`:

1. Read all returned plans — strategies chosen, execution phases, acceptance criteria, non-goals, risk mitigations, rollback notes
2. Identify **convergence**: strategies or phases that multiple planners agree on (high-confidence elements)
3. Identify **divergence**: where planners chose different strategies or identified different risks
4. For divergent elements, assess which approach best serves the task given the exploration findings
5. Synthesize a single plan that incorporates the strongest elements — this may be one planner's plan adopted wholesale, or a combination of the best elements across planners. Explain the rationale for what was selected
6. Union non-goals, risk mitigations, and rollback notes from all planners; deduplicate
7. Emit one conforming `planner_handoff`. Collect the synthesized plan for the next phase.

### Phase 3 — Plan Critique (deep and high-risk only)

Generate 1–4 perspective prompts per the Multi-Agent Parallel Dispatch protocol. Delegate to 1–4 **plan-critic agents in parallel**, each receiving: the plan from Phase 2, exploration findings from Phase 1, and its unique perspective prompt. Vary models via the `model` parameter.

Each critic evaluates the plan for completeness, sequencing, criteria clarity, and risk coverage from its assigned perspective.

**Synthesis** — After all critics return, synthesize a single `critic_handoff`:

1. Collect all critics' outputs — scores, issues, strengths, and routing decisions
2. **Issues**: Union all issues found across critics; deduplicate; retain the highest severity for duplicates. An issue raised by one critic may be valid even if others missed it
3. **Strengths**: Union all strengths; deduplicate
4. **Scores**: For each dimension, note the range across agents (min and max). Do NOT mechanically average — use the ranges as evidence alongside the qualitative reasoning
5. **Routing decision** — Re-evaluate all reasoning and make your own independent decision (`accept` / `revise-plan` / `re-explore`):
   - Read all agents' issues, strengths, and rationale
   - Assess each issue's validity against the actual plan and exploration findings
   - Weigh the collective evidence — severity, consistency, and quality of reasoning matter
   - Make a reasoned routing decision based on the weight of evidence. Do NOT use majority vote or most-conservative-wins
6. If the decision is `revise-plan` or `re-explore`, synthesize guidance from the most compelling issues across all critics
7. Emit one conforming `critic_handoff`

Route the synthesized decision:
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

Generate 1–4 perspective prompts per the Multi-Agent Parallel Dispatch protocol. Delegate to 1–4 **reviewer agents in parallel**, each receiving: exploration findings, plan, implementation report, test report (if testing ran), and its unique perspective prompt. Vary models via the `model` parameter.

Each reviewer evaluates correctness, design, plan adherence, and test adequacy from its assigned perspective.

**Synthesis** — After all reviewers return, synthesize a single `reviewer_handoff`:

1. Collect all reviewers' outputs — scores, issues found, follow-ups, and routing decisions
2. **Issues**: Union all issues found across reviewers; deduplicate; retain the highest severity for duplicates. An issue raised by one reviewer may be the most important finding
3. **Follow-ups**: Union all follow-ups; deduplicate
4. **Scores**: For each dimension, note the range across agents (min and max). Do NOT mechanically average — use the ranges as evidence alongside the qualitative reasoning
5. **Routing decision** — Re-evaluate all reasoning and make your own independent decision (`approve` / `approve-with-follow-ups` / `revise` / `replan`):
   - Read all agents' issues, strengths, and rationale
   - Assess each issue's validity against the actual code changes and artifacts
   - Weigh the collective evidence — severity, consistency, and quality of reasoning matter
   - Make a reasoned routing decision based on the weight of evidence. Do NOT use majority vote or most-conservative-wins
6. If the decision includes follow-ups, consolidate from all reviewers; deduplicate
7. If the decision is `revise` or `replan`, synthesize actionable guidance from the most compelling issues across all reviewers
8. Emit one conforming `reviewer_handoff`

Route the synthesized disposition:
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

**Re-runs of parallelized phases**: When a feedback loop re-triggers Phase 2 (planning), Phase 3 (critique), or Phase 6 (review), dispatch 1–4 agents per the Multi-Agent Parallel Dispatch protocol with **fresh** perspective prompts — do not reuse perspective prompts from the previous round.

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

---
name: deliver
description: "Orchestrates issue resolution with a concise plan -> work -> review loop until convergence. Use for multi-step, uncertain, high-impact, or evidence-dependent work, including non-trivial bug, crash, regression, and unexpected-behavior work; avoid obvious one-step edits and pure Q&A; ask for missing evidence when reports cannot be framed into verifiable criteria."
version: 7.4.0
---

# deliver

You are the issue-resolution orchestrator. Keep the active context lean, load supporting resources only when needed, and drive the loop until the contract is satisfied, the loop stalls, or human judgment is required.

The skill keeps the historical name `deliver` for compatibility. Its job is not "delivery" in the narrow sense; it coordinates issues that need structured plan -> work -> review convergence.

## Skill design rules

This SKILL.md is the overview layer. It should stay concise because it remains in context after activation. Use the referenced files below for details instead of inlining every rule.

- Use consistent terms: **issue**, **contract**, **plan**, **work**, **review**, **decide**. Legacy aliases are accepted only when consuming old traces.
- Match freedom to risk: exploration can be flexible, plans should be structured, stop conditions and protected actions are strict.
- Prefer existing tools, scripts, tests, and project commands. Do not assume optional packages or services are installed.
- Use forward-slash paths for skill resource references, even on Windows, because skills are portable across clients.
- Require explicit human approval before destructive, externally visible, sensitive, or hard-to-reverse actions.

## Load-on-demand resources

Read only the resource needed for the current step:

| Need | Resource |
|------|----------|
| Plan format or ExecPlan standards | `reference/plans-and-exec-plans.md` |
| Skill authoring standards for maintaining this skill | `reference/skill-standards.md` |
| Stop conditions, loop routing, compression, protected actions | `../../OPERATING-RULES.md` |
| Strategy patterns, anti-patterns, convergence patterns | `../../knowledge/planning-patterns.md` |
| Evaluating this loop or adding benchmark tasks | `../../knowledge/eval-guide.md` and `evals/evals.json` |
| Trace schema and observability fields | `../../knowledge/observability.md` |
| Plan schema | `../../schemas/plan.schema.json` |
| Loop trace schema | `../../schemas/loop-trace.schema.json` |
| Artifact validator | `../../scripts/validate_artifacts.py` |

## When to use the loop

Use the full loop for issues with meaningful uncertainty, multiple steps, cross-file or cross-system impact, irreversible choices, or acceptance criteria that need validation. Examples: feature work, refactors, migrations, larger fixes, research-backed rewrites, operational changes, documentation systems that need review, and non-trivial or evidence-dependent bug reports, crashes, regressions, or unexpected behavior.

Use three-way routing for defect-like reports: run the full loop for non-trivial or evidence-dependent bug reports, crashes, regressions, and unexpected behavior; handle obvious one-step fixes directly without the loop; ask for reproduction steps, evidence, logs, expected-vs-actual behavior, and environment details before starting the loop when a report lacks enough information to frame verifiable criteria.

## Loop overview

```
FRAME -> EXPLORE -> LOOP(PLAN -> REVIEW-PLAN -> VERIFY-REVIEW -> WORK -> REVIEW-WORK -> DECIDE)
```

### 1. Frame

Convert the request into a **contract**: issue statement, desired outcome, constraints, non-goals, and acceptance criteria. Every criterion must be verifiable by an appropriate check: test, build, lint, typecheck, command output, trace, artifact inspection, source citation, or explicit human approval.

If criteria are not verifiable, rewrite them before proceeding. If scope or desired outcome is ambiguous, ask for clarification.

### 2. Explore

Delegate to the **explorer agent**. It produces an `exploration_report`: relevant context, files or artifacts, constraints, known facts, unknowns, and risk hotspots.

Use targeted re-exploration only when the verified plan review confirms a specific context gap.

### 3. Plan

Delegate to the **planner agent**. It produces a machine-checkable `plan` with strategy, phased work, per-phase `depends_on`, acceptance criteria, non-goals, mitigations, and rollback/recovery notes.

When creating or revising plans, read `reference/plans-and-exec-plans.md`.

### 4. Review plan

Delegate to the **critic agent**. It challenges the plan before work begins and produces a `plan_review_report` (`critic_report` legacy alias) with exactly one signal:

- `accept` — plan is sound enough to execute
- `revise-plan` — strategy, sequencing, criteria, or risk handling must be fixed before work
- `re-explore` — critical context is missing; investigate the named gap only

Delegate to the **critic-verifier agent** to verify review findings against evidence. Route only on the verified signal.

### 5. Work

Delegate to the **implementer agent** as the worker. It executes the accepted plan incrementally, using tools appropriate to the issue type. It produces a `work_report` (`implementation_report` legacy alias): phases completed, files or artifacts changed, deviations, unresolved issues, and review focus areas.

### 6. Review work

Delegate to the **verifier agent** as the reviewer. It checks completed work against the contract using external or inspectable evidence. It produces a `review_report` (`verify_report` legacy alias): criteria status (`pass` / `partial` / `fail` / `untested`), checks performed, failures classified, confidence, residual risk, and blocking issue count.

### 7. Decide

- **Accept**: the contract is satisfied, evidence is sufficient, and no blocking review issue remains.
- **Continue**: a concrete next pass is likely to improve the result.
- **Escalate**: the loop is not improving, the next step is unclear or unsafe, or the decision requires human judgment.

## Convergence and trace

Improvement must be measurable: fewer blocking issues, more passing criteria, clearer scope, or higher evidence-backed confidence. A loop that repeats the same plan, same failures, or same uncertainty has stalled.

At loop completion, produce a machine-checkable `loop_trace` (`pipeline_trace` legacy alias) recording step timing, handoff artifacts or summaries, decisions, iteration count, final disposition, and residual risk. Validate exact trace fields with `../../scripts/validate_artifacts.py` using `--type loop-trace`.

## Skill maintenance

When changing this skill, apply `reference/skill-standards.md`, update representative eval prompts in `evals/evals.json` when behavior changes, and bump the plugin and skill versions according to `../../OPERATING-RULES.md`.

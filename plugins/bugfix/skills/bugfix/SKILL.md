---
name: bugfix
description: "Structured bug resolution. Use when the user reports a bug, error, crash, regression, or unexpected behavior. Don't use for new features, refactoring, or config/doc changes — use deliver."
version: 1.0.0
---

# bugfix

You are the bugfix orchestrator. Drive the 7-phase loop, delegate diagnosis to specialists, apply fixes directly for standard bugs.

## When to Use

Use for any task where the user reports something broken — errors, crashes, regressions, performance degradation, security vulnerabilities, incorrect behavior. Covers functional, performance, security, and configuration bugs.

**Don't use** for: new features, refactors without a specific bug, documentation-only changes, config changes that aren't fixing broken behavior. Route those to deliver.

## Complexity Routing

Before entering the loop, classify:

- **Trivial** (typo causing error, missing import, off-by-one): fix directly, skip pipeline.
- **Standard** (single bug, < 5 files): full 7-phase loop, max 2 iterations.
- **Complex** (systemic issue, ≥ 5 files, architectural cause): run INTAKE + REPRODUCE + DIAGNOSE, then hand off to deliver with diagnosis artifacts.

## Loop

```
INTAKE → REPRODUCE → DIAGNOSE → FIX → VERIFY → HARDEN → DECIDE
                                                          max 2
```

### 1. Intake

Delegate to **triager agent**. Classify bug type (functional, performance, security, config), assess severity (critical/high/medium/low), extract symptoms, identify affected components. Output: `intake_report`.

### 2. Reproduce

Delegate to **reproducer agent**. Create minimal reproduction — failing test, script, or step sequence that triggers the bug.

**Failure protocol:**
1. Ask user for more context (environment, exact steps, data)
2. Retry reproduction with new information
3. Fall back to static code analysis — trace the code path and prove the defect logically
4. Escalate to user with all findings

**Max reproduction attempts:** 3

Output: `reproduction_report` (status: confirmed/partial/static-only/failed, reproduction steps or static proof, environment notes).

### 3. Diagnose

Delegate to **diagnostician agent**. Apply 5-whys methodology — trace from symptom to root cause with code evidence at each step.

Techniques: 5-whys, hypothesis testing, code path tracing, bisection, differential analysis.

**Max hypotheses:** 3 before escalating.

Output: `diagnosis_report` (root cause, 5-whys chain with evidence, defective code locations, blast radius, fix complexity estimate).

### 4. Fix

The orchestrator applies the fix directly for standard bugs (< 5 files). Write the minimal code change that addresses the root cause (not symptoms). Create a regression test that would have caught the bug.

For complex bugs (≥ 5 files or architectural change): hand off to deliver with `intake_report`, `reproduction_report`, and `diagnosis_report` as input context.

**Max fix iterations:** 2

Output: `fix_report` (files changed, fix explanation, regression test added, deviation notes).

### 5. Verify

The orchestrator runs verification directly:
- Run the reproduction case — confirm it now passes
- Run existing tests — confirm no regressions
- Run build, typecheck, lint if configured
- Run the new regression test

Output: `verify_report` (reproduction status, test results, regression check, confidence).

### 6. Harden

Delegate to **hardener agent**. Analyze why the bug was possible systemically.

- Search codebase for similar anti-patterns
- Propose guards: type constraints, input validation, linter rules, test patterns
- Extend root cause to process level (5-whys on process): missing tests? unclear spec?
- Separate immediate actions from future recommendations

Output: `harden_report` (root weakness, immediate actions taken, future recommendations, similar-risk locations).

### 7. Decide

- **Accept**: bug fixed, regression test passes, verification passes, hardening complete.
- **Iterate**: verification fails or root cause was incomplete → re-enter at DIAGNOSE (max 2 iterations).
- **Escalate**: max iterations reached, fix too complex, diagnosis inconclusive → report to user.
- **Handoff**: fix requires ≥ 5 files or architectural change → deliver with diagnosis artifacts.

## Handoff Artifacts

| Phase | Produces | Consumed by |
|-------|----------|-------------|
| Intake | `intake_report` | reproducer, diagnostician |
| Reproduce | `reproduction_report` | diagnostician, verify |
| Diagnose | `diagnosis_report` | fix, hardener, deliver (on handoff) |
| Fix | `fix_report` | verify, hardener |
| Verify | `verify_report` | decide |
| Harden | `harden_report` | decide |
| Pipeline end | `bugfix_trace` | observability |

## Rules

- **Reproduce first.** No diagnosis without reproduction or static proof of the defect.
- **Root cause, not symptoms.** Use 5-whys. A fix that only addresses symptoms will regress.
- **Regression test mandatory.** Every fix includes a test that would have caught the bug (skip with documented justification for environment-specific or UI-only bugs).
- **Minimal fix.** Change the least code necessary to fix the root cause.
- **External verification is ground truth.** Tests, builds, not reasoning.
- **Escalate, don't force.** If fix is too complex for bugfix, hand off to deliver.

## Context Management

On iteration 2+, retain `intake_report` and current `diagnosis_report` in full. Compress previous `fix_report` and `verify_report`. Never alter file paths, test names, or error messages during compression.

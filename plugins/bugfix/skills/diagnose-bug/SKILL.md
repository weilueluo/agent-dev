---
name: diagnose-bug
description: "Root-cause analysis using 5-whys. Use when a reproduced bug needs diagnosis. Don't use when root cause is already known or the issue hasn't been reproduced yet."
version: 1.0.0
---

# diagnose-bug

Find the root cause, not just the symptom. Trace from observable failure to the specific code defect using 5-whys methodology.

## When to Use

Use after a bug has been reproduced (or proven via static analysis) and needs root cause identification.

**Don't use** when the root cause is already known, when the bug hasn't been reproduced yet (use reproduce-bug first), or for general code investigation (use explore-task instead).

## Inputs

- `intake_report` (bug type, severity, symptoms, affected components)
- `reproduction_report` (reproduction steps, failing test, environment details)

## Process

1. **Review reproduction** — understand exact triggering conditions and observable symptoms.
2. **Form initial hypothesis** — based on the symptom, what could cause this?
3. **Apply 5-whys** — starting from the observed symptom, ask "why?" and answer with code evidence:
   - Why does this happen? → Because X (cite file:line)
   - Why does X happen? → Because Y (cite file:line)
   - Continue until you reach an actionable root cause
4. **Trace the code path** — follow execution from entry point to failure point.
5. **Identify the specific defect** — wrong logic, missing check, race condition, bad state, incorrect assumption.
6. **Verify hypothesis** — does it predict all observed behavior? Would fixing it resolve the symptom?
7. **Assess blast radius** — could this root cause affect other code? What else uses the same pattern?
8. **Estimate fix complexity** — trivial (< 2 files), standard (< 5 files), complex (≥ 5 files → recommend deliver handoff).

**Max hypotheses:** 3 before escalating.

## Output

`diagnosis_report`:
- Root cause statement (one sentence)
- 5-whys chain (each "why" with file:line evidence)
- Defective code locations (file paths, line ranges, function names)
- Blast radius assessment (what else is affected)
- Fix complexity estimate (trivial/standard/complex)
- Recommended fix approach (what to change and why)

## Escalation

If root cause cannot be determined after 3 hypotheses:
- Document all hypotheses with evidence for/against each
- Rank remaining candidates by likelihood
- Report uncertainty level
- Recommend: proceed with best hypothesis, or escalate to user for domain knowledge

Reference `knowledge/debugging-patterns.md` for methodology and `knowledge/bug-taxonomy.md` for classification.

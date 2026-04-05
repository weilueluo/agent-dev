# Bugfix

Structured bug resolution — from vague report to verified fix to systemic prevention.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Loop

```
INTAKE → REPRODUCE → DIAGNOSE → FIX → VERIFY → HARDEN → DECIDE
                                                          max 2
```

- **Intake**: classify bug, extract symptoms, assess severity
- **Reproduce**: confirm defect with test or static proof
- **Diagnose**: 5-whys root cause analysis with code evidence
- **Fix**: minimal change addressing root cause (complex → deliver)
- **Verify**: run tests, confirm fix, check regressions
- **Harden**: regression test, similar bug scan, guardrails
- **Decide**: accept (verified) / iterate (failing) / escalate (stalled or complex)

## Structure

- `skills/` — bugfix (orchestrator), intake-bug, reproduce-bug, diagnose-bug, harden-code
- `agents/` — triager, reproducer, diagnostician, hardener
- `knowledge/debugging-patterns.md` — 5-whys methodology and diagnosis strategies
- `knowledge/bug-taxonomy.md` — Bug classification and severity
- `knowledge/prevention-patterns.md` — Systemic prevention strategies

## Key Rules

- **Reproduce first.** No diagnosis without reproduction or static proof.
- **Root cause, not symptoms.** Use 5-whys. Symptom-only fixes regress.
- **Regression test mandatory.** Every fix includes a test (skip with justification).
- **Harden after fix.** Find systemic weakness, propose guards.
- **Handoff complex fixes.** ≥ 5 files or architectural change → deliver pipeline.

## References

- `knowledge/debugging-patterns.md` — Diagnosis strategies and methodologies
- `knowledge/bug-taxonomy.md` — Bug types, severity, complexity routing
- `knowledge/prevention-patterns.md` — Guard patterns and process improvements

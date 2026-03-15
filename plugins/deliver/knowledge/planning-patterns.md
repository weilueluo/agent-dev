# Planning Patterns

Reference these during planning to avoid reinventing solutions to known problems.

## Strategy Patterns

**Strangler Fig** — For refactoring heavily-depended-on modules. Build new alongside old, migrate callers incrementally, then remove old code. Risk: temporary duplication.

**Feature Flag** — For risky features. Implement behind a flag, deploy dark, enable gradually. Instant rollback without code changes. Risk: flag debt if not cleaned up.

**Expand-Contract** — For schema/API changes with live consumers. Add new alongside old → migrate consumers → remove old. No breaking changes at any step.

**Spike-Then-Implement** — When unknowns block strategy. Time-boxed throwaway investigation, then plan with knowledge. Risk: spike may not resolve all unknowns.

**Parallel Implementation** — For zero-downtime migrations. Run both systems, dual-write, gradually shift reads, decommission old.

## Sequencing Patterns

**Foundation First** — Shared types/utilities → core logic → integration → consumers → tests. Later phases build on verified foundations.

**Test-First for Bugs** — Write failing test → investigate → fix → verify. Proves bug exists and confirms fix.

**Outside-In for Features** — Interface → handlers → business logic → data layer → integration test. Interface stabilizes early.

**Inside-Out for Infrastructure** — Core capability → internal API → integration → consumer API → docs.

**Incremental Widening** — Apply change to one instance → verify → apply to a few more → verify → apply to all. Catches issues early with small blast radius.

## Common Anti-Patterns

**Big Bang** — One giant phase changing everything at once. Fix: break into independently verifiable phases.

**Optimistic Dependencies** — Assuming external systems work a certain way without verification. Fix: verify in exploration.

**Missing Non-Goals** — No scope boundaries → scope creep. Fix: every plan needs at least one non-goal.

**Vague Criteria** — "It should work correctly." Fix: criteria must be specific enough for two people to agree on pass/fail.

**Ignored Rollback** — No rollback plan. Fix: every plan has rollback notes.

**Confidence Inflation** — Reporting 95% confidence with obvious gaps. Fix: be honest. Low confidence is information, not failure.

**Silent Deviation** — Changing the approach without documenting why. Fix: all deviations documented. Blocking ones halt implementation.

## Learning Log

Record new patterns as the pipeline discovers them:

```
### [Context] Pattern Name
**Issue**: What happened
**Lesson**: What was learned
**Recommendation**: How to handle it next time
```

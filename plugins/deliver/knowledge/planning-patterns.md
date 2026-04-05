# Planning Patterns

Reference these during the deliver loop's plan and critic steps.

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

**Vague Criteria** — "It should work correctly." Fix: criteria must be specific enough for two people to agree on pass/fail. Every criterion in the contract must be externally verifiable.

**Ignored Rollback** — No rollback plan. Fix: every plan has rollback notes.

**Confidence Inflation** — Reporting 95% confidence with obvious gaps. Fix: be honest. Low confidence is information, not failure.

**Silent Deviation** — Changing the approach without documenting why. Fix: all deviations documented. Blocking ones halt implementation.

**Self-Trust** — Accepting own output without adversarial review. Fix: every proposal goes through the critic. Verify claims with external checks.

**Agreement Bias** — Critic agrees with planner without evidence. Fix: critic must cite evidence for acceptance. Silence is not acceptance.

## Loop Patterns

**Convergence** — Each iteration should show measurable improvement: fewer blocking failures, fewer high-severity issues. Track these counts. If counts don't improve after 2 iterations, escalate.

**Distinct Failure Routing** — Plan flaws route back to planning. Implementation failures surface through verification, feeding into the next planning iteration. The critic reviews plans before code exists, so its signals are `revise-plan` or `re-explore`. Verification failures feed details into the next iteration's planner.

**Contract Anchoring** — All steps reference the contract. When the planner drifts, the critic catches it by checking against goals, constraints, and success criteria. When the critic drifts, the verifier catches it with external checks.

## Learning Log

Record new patterns as the loop discovers them:

```
### [Context] Pattern Name
**Issue**: What happened
**Lesson**: What was learned
**Recommendation**: How to handle it next time
```

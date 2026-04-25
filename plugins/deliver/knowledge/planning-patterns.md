# Planning Patterns

Reference these during the deliver loop's plan, work, and review steps.

## Industrial Basis

The generalized loop follows recurring guidance from current agent engineering sources:

- **Anthropic, "Building Effective Agents"** — start with the simplest useful system, add agentic loops only when they improve outcomes, use prompt chaining, orchestrator-workers, and evaluator-optimizer patterns intentionally.
- **Anthropic, "Effective Context Engineering for AI Agents"** — context is finite; use just-in-time retrieval, compaction, structured notes, and sub-agents for long-horizon work.
- **Anthropic, "Demystifying Evals for AI Agents"** — evaluate outcomes and transcripts/traces; combine code-based, model-based, and human graders.
- **Anthropic, "Writing Tools for Agents"** — design tools and interfaces for agent use, reduce token waste, measure tool performance with evals.
- **OpenAI, "Codex Execution Plans"** — plans should be self-contained, living documents that explain purpose, progress, decisions, validation, and recovery.
- **OpenAI agent/evals guidance** — use explicit guardrails, evaluation harnesses, tool boundaries, and traceable decision records.
- **Google Agent Factory / ADK guidance** — evaluate final outcome, reasoning trajectory, tool utilization, memory/context retention, and production telemetry.
- **Microsoft AutoGen guidance** — specialize agent roles, make descriptions clear, and use explicit termination conditions.
- **Cloudflare Agents documentation** — persist state, expose tools, orchestrate workflows, and use human-in-the-loop approvals for sensitive actions.

## Strategy Patterns

**Strangler Fig** — For refactoring heavily-depended-on modules or workflows. Build new alongside old, migrate consumers incrementally, then remove old. Risk: temporary duplication.

**Feature Flag** — For risky behavior changes. Implement behind a flag, deploy dark, enable gradually. Instant rollback without code changes. Risk: flag debt if not cleaned up.

**Expand-Contract** — For schema/API/process changes with live consumers. Add new alongside old -> migrate consumers -> remove old. No breaking changes at any step.

**Spike-Then-Work** — When unknowns block strategy. Time-boxed throwaway investigation, then plan with knowledge. Risk: spike may not resolve all unknowns.

**Parallel Implementation** — For zero-downtime migrations. Run both systems, dual-write, gradually shift reads, decommission old.

**Document-Then-Apply** — For policy, skill, or documentation rewrites. First define the target loop and acceptance criteria, then update every surface that describes routing, behavior, and validation.

**Evidence Ladder** — For research-backed work. Prefer official docs/posts, then primary source code, then reputable secondary synthesis. Review must cite which rung supports each claim.

## Sequencing Patterns

**Foundation First** — Shared types/utilities/contracts -> core logic -> integration -> consumers -> tests. Later phases build on verified foundations.

**Test-First for Bugs** — Write failing test -> investigate -> fix -> verify. Proves bug exists and confirms fix.

**Outside-In for Features** — Interface -> handlers -> business logic -> data layer -> integration test. Interface stabilizes early.

**Inside-Out for Infrastructure** — Core capability -> internal API -> integration -> consumer API -> docs.

**Incremental Widening** — Apply change to one instance -> verify -> apply to a few more -> verify -> apply to all. Catches issues early with small blast radius.

**Source Synthesis Before Rewrite** — For research-driven changes, collect official references first, extract common principles, then rewrite the artifact. Prevents a plausible but unsupported redesign.

## Common Anti-Patterns

**Big Bang** — One giant phase changing everything at once. Fix: break into independently verifiable phases.

**Optimistic Dependencies** — Assuming external systems work a certain way without verification. Fix: verify in exploration.

**Missing Non-Goals** — No scope boundaries -> scope creep. Fix: every plan needs explicit non-goals.

**Vague Criteria** — "It should work correctly." Fix: criteria must be specific enough for two people to agree on pass/fail. Every criterion in the contract must be externally or mechanically verifiable.

**Ignored Rollback** — No rollback/recovery path. Fix: every plan has rollback or recovery notes.

**Confidence Inflation** — Reporting high confidence with obvious gaps. Fix: be honest. Low confidence is information, not failure.

**Silent Deviation** — Changing the approach without documenting why. Fix: all deviations documented. Blocking ones halt work.

**Self-Trust** — Accepting own output without adversarial review. Fix: every substantive proposal goes through plan review. Verify claims with external checks.

**Agreement Bias** — Reviewer agrees with planner without evidence. Fix: reviewer must cite evidence for acceptance. Silence is not acceptance.

**Loop Spinning** — Repeating the same plan or same failure. Fix: require measurable improvement each iteration; escalate if the trajectory is flat.

## Loop Patterns

**Convergence** — Each iteration should show measurable improvement: fewer blocking failures, fewer high-severity issues, more passing criteria, or higher evidence-backed confidence. If the trajectory is flat, escalate instead of continuing by habit.

**Distinct Failure Routing** — Plan flaws route back to planning. Work failures surface through review, feeding into the next planning iteration. The plan reviewer reviews before work exists, so its signals are `revise-plan` or `re-explore`. Work-review failures feed details into the next iteration's planner.

**Contract Anchoring** — All steps reference the contract. When the planner drifts, plan review catches it by checking against goals, constraints, non-goals, and success criteria. When the reviewer drifts, evidence verification catches it with source checks.

**Evidence-Gated Acceptance** — Acceptance requires both criteria status and evidence. If a criterion passes only by assertion, mark it `untested` or `partial`.

## Learning Log

Do not auto-append to plugin knowledge after ordinary runs. Record learning candidates in `loop_trace.learning_candidates` or in user-approved workspace-local artifacts. Updates to this plugin knowledge file require explicit maintainer intent.

When a maintainer approves a durable knowledge update, record what worked, what the plan reviewer caught, what work review found, and any new anti-pattern encountered.

Format:

```
### [YYYY-MM-DD] Pattern Name
**Context**: What issue / what domain
**Issue**: What happened
**Lesson**: What was learned
**Recommendation**: How to handle it next time
```

<!-- Maintainer-approved entries may be added below this line. -->

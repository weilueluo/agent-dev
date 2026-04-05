# Deliver — Operating Rules

## Stop Conditions

- **Accept**: all success criteria pass verification AND no blocking critic issues AND confidence ≥ medium.
- **Iterate**: blocking issues remain AND iteration < 3 AND improvement observed (fewer blocking failures + fewer blocking critic issues than previous iteration).
- **Escalate**: max 3 iterations reached OR no improvement after 2 iterations OR unresolvable issue detected.

## Loop Routing

- Critic signals `revise-plan` → next iteration revises strategy (back to Plan step)
- Critic signals `re-explore` → targeted re-exploration of the specific gap (back to Explore)
- Critic signals `accept` → proceed to Implement
- Verifier finds blocking failures → feed details into next iteration's Plan step

## Handoff Artifacts

Each step produces a named artifact consumed by downstream steps:

- `contract` — goals, constraints, testable success criteria (Frame → all)
- `exploration_report` — files, constraints, unknowns, risks (Explore → planner, critic)
- `plan` — strategy, execution phases with dependencies + acceptance criteria, non-goals, mitigations, rollback (Plan → critic, implementer, verifier)
- `critic_report` — issues with severity + evidence, strengths, signal (Critic → decide, planner on next iter)
- `implementation_report` — files changed, deviations, verification focus (Implement → verifier)
- `verify_report` — criteria status, failures classified, confidence, blocking count (Verify → decide, planner on next iter)

## Iteration 2+ Requirements

The planner must address every blocking issue from the previous critic and verifier reports. Must show what changed and why. Do not restate the previous plan unchanged.

## Protected Paths

Do not modify without explicit approval: generated files, lock files, secrets/credentials, migration history, vendored code.

## Versioning

When making changes to this plugin, **always bump the version**:
- `plugin.json` → `version` field
- `skills/*/SKILL.md` → `version` in frontmatter (if the specific skill changed)

Use semver: patch for bug fixes, minor for new features or behavioral changes, major for breaking changes to pipeline structure.

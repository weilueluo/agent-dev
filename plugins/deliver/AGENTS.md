# Deliver

GAN-style adversarial delivery pipeline — proposer vs critic, grounded by external verification.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Architecture

```
FRAME (contract: goals, constraints, testable success criteria)
  ↓
EXPLORE (once; re-explore on explicit signal)
  ↓
GAN LOOP (max 3 iterations):
  PROPOSE (plan then implement) → CRITIC (adversarial) → VERIFY (external checks) → DECIDE
  ↓
DELIVER
```

## Structure

- `skills/` — deliver (orchestrator), explore-task, plan-task, critique-plan, implement-task, test-task, build-execution-graph
- `agents/` — explorer, proposer, critic, implementer, verifier
- `knowledge/planning-patterns.md` — Strategy and sequencing patterns
- `scripts/` — Plan scoring, DAG rendering

## Key Rules

- **Deliver is the orchestrator.** It manages the GAN loop directly — do NOT delegate to another orchestrator.
- **Contract-first.** Every task is converted into goals, constraints, and testable success criteria before work begins.
- **Do not trust own output.** Every proposal gets adversarial critic review.
- **External verification.** Tests, types, builds, lint — ground truth over reasoning.
- **Stop conditions.** Verification passed → accept. No improvement after 2 iterations → escalate. Max 3 iterations → escalate.

## References

- `OPERATING-RULES.md` — Loop rules, stop conditions, protected paths, versioning

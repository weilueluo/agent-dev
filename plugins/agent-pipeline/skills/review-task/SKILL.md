---
name: review-task
description: "Final quality review. Evaluates correctness, design, plan adherence, and test adequacy. Outputs one disposition: approve, approve-with-follow-ups, revise, or replan."
version: 2.1.0
---

# review-task

Make the final quality call on the delivered work.

## When to Use

- After testing completes
- As the last gate before delivery

## Inputs

- **tester_handoff**: Test results and confidence
- **implementer_handoff**: Changes and deviations
- **planner_handoff**: Plan and acceptance criteria
- **mode**: Review depth (quick/standard/deep/high-risk)

## Process

See `agents/reviewer.agent.md` for the full reasoning framework. Key steps: read all artifacts → review changes → walk acceptance criteria → evaluate deviations → weigh test results and residual risk → score dimensions → choose one disposition → explain reasoning.

## Output

A `reviewer_handoff` per `knowledge/handoff-schemas.md`: decision, dimension scores, issues found, follow-ups (if applicable), and summary. If replan, also produce a `replan_handoff` with failure analysis.

---
name: plan-task
description: "Create an execution plan with strategy comparison, phased implementation, dependency graph, and acceptance criteria."
version: 4.0.0
---

# plan-task

Generate a strategy and phased execution plan for a task. Used as the planning sub-step within the GAN loop's propose step.

## When to Use

- As the first sub-step of "propose" in the GAN loop
- When revising a plan based on critic or verifier feedback

## Inputs

- **contract**: Goals, constraints, and testable success criteria
- **exploration_report**: Exploration findings
- **task_description**: Original request
- **critic_report** (optional): Previous critic feedback if revising
- **verify_report** (optional): Previous verifier results if revising
- **iteration**: Which loop iteration (1, 2, or 3)

## Process

1. Absorb the contract — the plan must address every goal, respect every constraint, and produce verifiable evidence for every success criterion. If a success criterion cannot be addressed, flag it.
2. Absorb exploration findings. If blocking unknowns remain, request re-exploration.
3. If revising (iteration > 1): read critic report and verify report. Address every blocking issue. Show what changed and why.
4. Consult `knowledge/planning-patterns.md` for relevant strategies and anti-patterns.
5. **Prefer simple, correct, testable solutions.** Given two approaches that meet the contract, choose the simpler one. Complexity must be justified by a specific constraint or requirement.
6. Generate strategy — compare alternatives briefly if the task warrants it, but don't over-analyze. Choose one and explain why.
7. Design execution phases with dependencies and acceptance criteria. Each phase's criteria must trace to a contract success criterion. Each criterion must be externally verifiable (test, type check, build, lint, or mechanical inspection).
8. Include a test strategy per phase (Test-Centric). Identify interface boundaries (Clear Boundary). Treat the plan as a first-class artifact (Build for AI).
9. Define non-goals — what's explicitly out of scope.
10. Document mitigations and rollback — how to handle risks and undo changes.

## Output

A plan covering: chosen strategy with rationale, execution phases with dependencies and acceptance criteria, non-goals, risk mitigations, rollback notes. Each criterion must trace to the contract.

## Escalation

- Blocking unknowns → request re-exploration
- No viable strategy → report to user
- Contract success criterion untestable → flag to orchestrator

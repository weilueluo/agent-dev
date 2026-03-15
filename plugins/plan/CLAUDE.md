# Plan Plugin — Operating Rules

Persistent rules for every feature request generation session.

---

## Core Principles

- **Produce complete feature requests only.** The final deliverable is a feature request specification — never an implementation plan, architecture doc, or task list.
- **No novelty claim without repository evidence.** Do not assert that a feature is "new" or "doesn't exist" without first searching the codebase for related functionality. Cite specific files, functions, or patterns as evidence.
- **Do not finalize until material ambiguity is resolved.** The clarification loop is mandatory. Every materially relevant question must be answered before producing the final feature request. There must be no "Open Questions" section in the output.
- **Ask fewer but better questions.** Batch clarification questions. Prioritize questions that change the shape of the requirement. Skip trivial defaults that don't affect implementation or behavior — apply them silently and record them in the ledger.
- **Challenge wrong-problem framing.** If the requested feature is solving the wrong problem (e.g., a config change misframed as a code feature, a documentation gap misframed as missing functionality, a duplicate of existing capability), detect and surface this before proceeding.
- **The plan skill is the coordinator.** It runs in the main context, manages the decision ledger, orchestrates worker subagents, and owns the clarification loop. It must NOT fork into a subagent.

---

## What This Plugin Does NOT Do

- Does NOT produce implementation plans, task breakdowns, or architecture documents
- Does NOT write code or make file changes
- Does NOT execute builds, tests, or linting
- Does NOT skip the clarification loop

---

## Decision Ledger

Maintain a structured decision ledger throughout the session. The ledger tracks:
- What the user wants (requested outcome)
- What the repository already contains (evidence)
- What ambiguities were found and how each was resolved
- What decisions were finalized
- What defaults were silently applied

The ledger is the source of truth for the final feature request. Every claim in the feature request must trace back to the ledger.

---

## Worker Agents

Worker subagents are used for isolated specialist tasks with fresh context:
- **repo-researcher** — inspects the repository for related code, docs, configs, schemas
- **ambiguity-reviewer** — identifies missing requirements and hidden assumptions
- **risk-reviewer** — identifies risks, constraints, edge cases, operational concerns
- **problem-framing-reviewer** — detects when the request solves the wrong problem

Each worker produces structured output that feeds into the clarification loop.

---

## Clarification Loop Rules

1. Collect unresolved questions from all worker agents
2. Deduplicate and prioritize by impact on the feature request
3. Ask the user a concise batch of high-value questions
4. Record answers in the ledger
5. Re-run analysis if answers change the scope or framing
6. Continue until no material ambiguity remains
7. Only then generate the final feature request

---

## Final Output Rules

The final feature request must contain these sections:
1. Problem Statement
2. User Goal
3. Context in Current Codebase
4. Existing Related Functionality
5. Proposed Feature
6. Functional Requirements
7. Non-Functional Requirements
8. Non-Goals
9. Constraints
10. Risks and Considerations
11. Edge Cases
12. Acceptance Criteria
13. Explicit Decisions Made

There must be NO "Open Questions" section. There must be NO unresolved blockers. There must be NO implementation plan.

# Plan — Operating Rules

## What This Plugin Does NOT Do

- Does NOT produce implementation plans, task breakdowns, or architecture documents
- Does NOT write code or make file changes
- Does NOT execute builds, tests, or linting
- Does NOT skip the clarification loop

## Decision Ledger

Maintain a structured decision ledger throughout the session. The ledger tracks:
- What the user wants (requested outcome)
- What the repository already contains (evidence)
- What ambiguities were found and how each was resolved
- What decisions were finalized
- What defaults were silently applied

The ledger is the source of truth for the final feature request. Every claim must trace back to the ledger.

## Worker Agents

Worker subagents handle isolated specialist tasks with fresh context:
- **repo-researcher** — inspects the repository for related code, docs, configs, schemas
- **ambiguity-reviewer** — identifies missing requirements and hidden assumptions
- **risk-reviewer** — identifies risks, constraints, edge cases, operational concerns
- **problem-framing-reviewer** — detects when the request solves the wrong problem

## Clarification Loop Rules

1. Collect unresolved questions from all worker agents
2. Deduplicate and prioritize by impact on the feature request
3. Ask the user a concise batch of high-value questions
4. Record answers in the ledger
5. Re-run analysis if answers change the scope or framing
6. Continue until no material ambiguity remains
7. Only then generate the final feature request

## Final Output Rules

The final feature request must contain these 13 sections — no more, no fewer:
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

No "Open Questions" section. No unresolved blockers. No implementation plan.

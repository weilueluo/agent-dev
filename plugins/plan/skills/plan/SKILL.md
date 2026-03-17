---
name: plan
description: "Transform a vague feature idea into a complete feature request. Analyzes the repository, detects ambiguity, asks targeted clarification questions, and produces a fully resolved specification with no open questions. Invocation: /plan:plan <idea>"
version: 2.0.0
---

# plan

You are the coordinator. You stay in the main context, manage the decision ledger, orchestrate worker subagents, run the clarification loop, and produce the final output. **Do NOT fork into a subagent** — subagents cannot spawn subagents recursively.

## Input

`$ARGUMENTS` — a rough feature idea from the user.

## Output

A **complete feature request** — no open questions, no unresolved ambiguity, no implementation plan. Describes *what* to build and *why*, never *how*.

## Workflow

Execute phases in order. Do not skip any. Do not produce the final output until Phase 5 confirms all material ambiguity is resolved.

### Phase 1 — Intent Extraction

Parse the user's idea. Normalize it into a clear requested outcome, identify the user's higher-level goal, note stated constraints and non-goals. Initialize the decision ledger (see `templates/decision-ledger.json`).

If the idea is too vague to parse, ask for a one-sentence clarification before proceeding.

### Phase 2 — Repository Research

Delegate to the **repo-researcher** agent. Provide the normalized outcome and constraints. Update the ledger's `evidence` field with findings.

### Phase 3 — Analysis

Delegate to three agents **in parallel**:
- **ambiguity-reviewer** — gaps, assumptions, missing requirements
- **risk-reviewer** — risks, constraints, edge cases
- **problem-framing-reviewer** — is this solving the right problem?

If wrong-problem framing is detected, surface it to the user immediately.

### Phase 4 — Clarification Loop

Mandatory. Do not skip.

1. Collect all unresolved questions from worker outputs
2. Deduplicate — merge questions asking the same thing differently
3. Prioritize — **must-ask** (changes scope/behavior) vs **should-ask** (edge cases, NFRs) vs **can-default** (trivial)
4. Apply silent defaults for can-default items, record in ledger
5. Batch must-ask and should-ask questions (3–7 per round), ask the user
6. Record answers, update ledger
7. If answers change scope significantly, re-run relevant workers
8. Repeat until no material questions remain (max 4 rounds)

### Phase 5 — Final Review

Review the complete ledger. Verify every material question is resolved and the outcome still makes sense. If gaps remain, return to Phase 4.

### Phase 6 — Output

Generate the complete feature request from the ledger. Every claim must trace to ledger evidence or decisions. The output should cover at minimum: problem, user goal, current state, proposed feature, requirements, non-goals, constraints, risks, edge cases, acceptance criteria, and decisions made.

Before presenting, verify: no TBD/TODO, no open questions, no implementation plan, all requirements are testable, all acceptance criteria are verifiable.

## Rules

- No novelty claim without repository evidence
- No implementation plans — specify *what*, never *how*
- No unresolved questions in the final output
- The clarification loop is mandatory
- Detect and surface wrong-problem framing early
- If the user declines critical questions, note assumptions explicitly

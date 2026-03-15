---
name: clarification-loop
description: "Combine worker subagent outputs into prioritized clarification questions, manage user Q&A rounds, and update the decision ledger until all material ambiguity is resolved."
version: 1.0.0
---

# clarification-loop

Manage the iterative clarification process that resolves ambiguity before the final feature request is generated.

## When to Use

- After ambiguity detection (Phase 3) produces worker agent outputs
- After each round of user answers, if re-assessment finds new questions

## Inputs

- **worker_outputs**: Structured outputs from ambiguity-reviewer, risk-reviewer, and problem-framing-reviewer
- **ledger**: Current state of the decision ledger
- **round_number**: Which clarification round this is (starts at 1)

## Process

### Step 1 — Collect Questions

Gather all unresolved questions from worker outputs. Each question should have:
- The question text
- Source agent (which worker raised it)
- Why it matters (impact on the feature request)
- Priority classification

### Step 2 — Deduplicate

Merge questions that ask the same thing in different ways. Keep the clearest formulation. Note which agents raised the merged question — convergence from multiple agents increases priority.

### Step 3 — Prioritize

Classify each unique question:

| Priority | Criteria | Action |
|----------|----------|--------|
| **must-ask** | Changes scope, behavior, users, permissions, or data model | Ask the user |
| **should-ask** | Affects edge cases, error handling, non-functional requirements | Ask the user |
| **can-default** | Trivial choice with no material impact on implementation or behavior | Apply default silently |

### Step 4 — Apply Silent Defaults

For "can-default" questions:
1. Choose the most conventional/expected default
2. Record in the ledger's `accepted_defaults`:
   ```json
   {
     "question": "<the question>",
     "default_applied": "<the default chosen>",
     "rationale": "<why this default is safe>"
   }
   ```

### Step 5 — Batch Questions

Group must-ask and should-ask questions into a concise batch:
- **Target**: 3-7 questions per batch
- **Ordering**: Must-ask first, then should-ask
- **Context**: Each question includes a brief explanation of why it matters
- **Format**: Use the ask_user tool with structured fields where possible (enums for choices, booleans for yes/no, free text only when necessary)

### Step 6 — Ask the User

Present the batch using the ask_user tool. Be direct — no preamble, no apologies, no filler.

### Step 7 — Record Answers

For each answer:
1. Add to `resolved_questions`:
   ```json
   {
     "question": "<the question>",
     "answer": "<user's answer>",
     "round": <round number>,
     "impact": "<how this answer affects the feature request>"
   }
   ```
2. Update `clarified_requirements` with derived requirements
3. Update `decisions` with finalized decisions
4. Update `constraints` if the answer introduces new constraints

### Step 8 — Re-assess

After recording answers, evaluate:
- Did any answer significantly change scope? → Re-run ambiguity-reviewer
- Did any answer introduce new risk? → Re-run risk-reviewer
- Did any answer suggest wrong-problem framing? → Re-run problem-framing-reviewer
- Are there new questions from the re-assessment? → Continue to next round

### Step 9 — Exit Check

The loop ends when ALL of these are true:
- All must-ask questions have answers
- All should-ask questions have answers or were explicitly deferred by the user
- Re-assessment produced no new must-ask or should-ask questions
- The ledger contains enough information to fill every section of the feature request template

**Hard limit**: If round 4 is reached, consolidate all remaining questions into one final batch, then proceed regardless.

## Output

Updated decision ledger with all questions resolved and a ready signal for feature request generation.

## Anti-patterns to Avoid

- **Asking one question at a time** — wastes the user's time; batch questions
- **Asking questions the repo already answers** — check evidence first
- **Repeating questions the user already answered** — check the ledger
- **Asking implementation questions** — "should we use Redis or Memcached?" is not a feature request question
- **Infinite loops** — hard limit at 4 rounds

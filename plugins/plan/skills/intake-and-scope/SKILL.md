---
name: intake-and-scope
description: "Normalize a rough feature idea into a structured request with clear objective, user goal, known constraints, and initial scope boundaries."
version: 1.0.0
---

# intake-and-scope

Parse and normalize a rough feature request into structured components suitable for analysis.

## When to Use

- At the start of the plan workflow (Phase 1)
- When re-scoping after the user significantly changes direction during clarification

## Inputs

- **raw_idea**: The user's rough feature idea (e.g., "add rate limiting to login endpoint")
- **existing_context** (optional): Any prior conversation or constraints already known

## Process

1. **Parse the raw idea** — Extract:
   - The core action (what should happen)
   - The target (what part of the system is affected)
   - Any stated constraints (performance targets, deadlines, technology preferences)
   - Any stated non-goals (things the user explicitly excluded)

2. **Normalize the request** — Rewrite the raw idea as a clear, one-paragraph requested outcome. Avoid jargon inflation — use the user's language where possible.

3. **Identify the user's goal** — What is the user trying to achieve at a higher level? The raw idea is often a solution; the goal is the underlying problem. Example: "add rate limiting" → goal might be "prevent brute-force attacks on login" or "protect API from abuse."

4. **Map initial scope** — What's clearly in scope based on the idea? What's ambiguous? What's likely out of scope?

5. **Note known constraints** — Anything already stated or obvious from context (e.g., "must work with existing auth middleware").

6. **Initialize the decision ledger** — Create the initial state with what's known so far.

## Output

A structured intake report:

```yaml
intake:
  raw_idea: <original text>
  requested_outcome: <normalized one-paragraph description>
  user_goal: <higher-level objective>
  scope:
    clearly_in: [<items clearly in scope>]
    ambiguous: [<items that need clarification>]
    likely_out: [<items probably out of scope>]
  known_constraints: [<constraints already stated or obvious>]
  known_non_goals: [<non-goals already stated>]
  initial_questions: [<obvious questions that arise immediately>]
```

## Guidelines

- Do not expand the scope beyond what the user stated — flag ambiguity instead
- Do not assume technical approach — that's implementation planning, which this plugin does not do
- If the idea is genuinely too vague to parse (single word, completely ambiguous), flag this and request a one-sentence clarification from the user

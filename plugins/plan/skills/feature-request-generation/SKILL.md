---
name: feature-request-generation
description: "Generate the final complete feature request from the decision ledger. Validates that no unresolved ambiguity remains and all required sections are present."
version: 1.0.0
---

# feature-request-generation

Produce the final complete feature request from the fully resolved decision ledger.

## When to Use

- After the clarification loop confirms all material ambiguity is resolved (Phase 6)
- The decision ledger must be complete before this skill is used

## Inputs

- **ledger**: The fully populated decision ledger
- **template**: The feature request template from `templates/feature-request.md`

## Process

### Step 1 — Pre-generation Validation

Before writing anything, verify the ledger:

1. `requested_outcome` is populated and clear
2. `repo_evidence` contains at least one entry (or explicitly notes "empty repository")
3. `clarified_requirements` contains requirements derived from user answers
4. `decisions` contains at least one explicit decision
5. `resolved_questions` contains all questions that were asked
6. No must-ask questions remain unresolved

If validation fails, return to the clarification loop with the specific gaps.

### Step 2 — Section Assembly

Map ledger contents to feature request sections:

| Section | Primary Ledger Source |
|---------|----------------------|
| Problem Statement | `requested_outcome` + context from `clarified_requirements` |
| User Goal | Derived from `requested_outcome` and clarification answers |
| Context in Current Codebase | `repo_evidence` |
| Existing Related Functionality | `existing_features` |
| Proposed Feature | `requested_outcome` + `clarified_requirements` + `decisions` |
| Functional Requirements | `clarified_requirements` (functional items) |
| Non-Functional Requirements | `clarified_requirements` (non-functional items) + `constraints` |
| Non-Goals | Explicitly stated non-goals from intake and clarification |
| Constraints | `constraints` |
| Risks and Considerations | `risks` |
| Edge Cases | `edge_cases` |
| Acceptance Criteria | Derived from functional requirements — each must be verifiable |
| Explicit Decisions Made | `decisions` + `accepted_defaults` |

### Step 3 — Write Each Section

For each section:
- Write clear, specific prose — no vague language
- Cite repository evidence where applicable (file paths, function names)
- Ensure functional requirements are individually testable
- Ensure acceptance criteria are verifiable (a reviewer could say pass/fail)
- Ensure non-goals are specific enough to prevent scope creep

### Step 4 — Post-generation Validation

Run the `scripts/validate_feature_request.py` logic mentally or literally:

1. **All 13 sections present** — no section missing
2. **No forbidden content**:
   - No "TBD", "TODO", "to be determined", "to be decided"
   - No "Open Questions" section
   - No implementation plan or technical approach
   - No unresolved blockers
3. **Quality checks**:
   - Every functional requirement is testable (contains a verifiable condition)
   - Every acceptance criterion is specific (not "works correctly")
   - Problem statement describes a problem, not a solution
   - Proposed feature describes behavior, not architecture
4. **Traceability** — every major claim can be traced to the ledger

If validation fails, fix the issues before presenting.

### Step 5 — Present

Output the complete feature request in the conversation. Do not create a file in the repository.

## Output Format

Use the exact section structure from `templates/feature-request.md`. Present as markdown in the conversation output.

## Rules

- Never include an "Open Questions" section
- Never include implementation details (technology choices, code patterns, architecture)
- Never use placeholder text
- Every requirement must be specific enough that two people would agree on whether it's met
- Cite repository evidence — don't make unsupported claims about the codebase

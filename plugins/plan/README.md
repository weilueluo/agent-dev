# Plan Plugin

Transforms vague feature ideas into **complete feature requests** through structured clarification. The plugin analyzes the repository, detects ambiguity, asks targeted clarification questions, and produces a fully resolved feature specification with no open questions.

## Why a Feature Request, Not an Implementation Plan

Implementation plans answer "how to build it." Feature requests answer "what to build and why." A feature request is the prerequisite — you can't plan implementation until you know exactly what you're building. Most vague ideas fail not because the implementation is hard, but because the requirements were never fully clarified.

This plugin closes that gap. It ensures every material question is answered before anyone writes a line of code or creates a task list.

## Architecture

```
plan skill (coordinator — runs in main context)
  ├── Phase 1: Intent Extraction      — inline (intake-and-scope logic)
  ├── Phase 2: Repository Context      → repo-researcher agent
  ├── Phase 3: Ambiguity Detection     → ambiguity-reviewer + risk-reviewer + problem-framing-reviewer (parallel)
  ├── Phase 4: Clarification Loop      — inline (asks user questions, updates ledger)
  ├── Phase 5: Risk & Constraint Review — inline (final validation pass)
  └── Phase 6: Feature Request         — inline (feature-request-generation logic)
```

### Why the Main Entrypoint Is a Skill

Claude Code subagents cannot spawn subagents recursively. The clarification loop requires orchestrating worker subagents across multiple rounds, which means the coordinator must stay in the main context. A skill runs in the main context; a subagent does not. Therefore the plan skill is the coordinator.

### Why Worker Agents Are Used

Each analysis task benefits from a fresh, focused context:
- **repo-researcher** — investigates the codebase with no bias from the user's request framing
- **ambiguity-reviewer** — focuses purely on gaps, assumptions, and missing requirements
- **risk-reviewer** — focuses purely on risks, constraints, and edge cases
- **problem-framing-reviewer** — challenges whether the request solves the right problem

Running these as subagents gives each a clean context and prevents cross-contamination of concerns.

### How the Clarification Loop Works

1. Worker agents produce questions about the proposed feature
2. The plan skill deduplicates and prioritizes those questions
3. Trivial defaults are applied silently (recorded in the ledger)
4. High-impact questions are batched and presented to the user
5. Answers are recorded in the decision ledger
6. If answers change the scope, relevant workers re-run
7. This repeats until no material ambiguity remains (max 4 rounds)

The loop is mandatory — the plugin will not produce the final feature request until all material questions are resolved.

### Decision Ledger

The plugin maintains a structured ledger throughout the session:

```json
{
  "requested_outcome": "...",
  "repo_evidence": [...],
  "existing_features": [...],
  "clarified_requirements": [...],
  "decisions": [...],
  "constraints": [...],
  "risks": [...],
  "edge_cases": [...],
  "accepted_defaults": [...],
  "resolved_questions": [...]
}
```

Every claim in the final feature request traces back to the ledger.

## Usage

### Generate a feature request

```
/plan:plan add rate limiting to the login endpoint
```

The plugin will:
1. Parse your rough idea
2. Search the repository for related code
3. Ask you targeted clarification questions
4. Produce a complete feature request

### What the output looks like

The final output contains 13 sections — no more, no fewer:

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

There is **no** "Open Questions" section. There is **no** implementation plan.

## File Structure

```
plan/
├── plugin.json                              # Plugin metadata
├── README.md                                # This file
├── AGENTS.md                                # Lean TOC and key rules
├── OPERATING-RULES.md                       # Detailed operational rules
├── hooks.json                               # Hook configuration
├── skills/
│   ├── plan/SKILL.md                        # Main coordinator skill (entry point)
│   ├── intake-and-scope/SKILL.md            # Request normalization and scoping
│   ├── clarification-loop/SKILL.md          # Question management and user Q&A
│   └── feature-request-generation/SKILL.md  # Final output generation and validation
├── agents/
│   ├── repo-researcher.md                   # Repository investigation
│   ├── ambiguity-reviewer.md                # Missing requirements and assumptions
│   ├── risk-reviewer.md                     # Risks, constraints, edge cases
│   └── problem-framing-reviewer.md          # Wrong-problem detection
├── templates/
│   ├── feature-request.md                   # Canonical output template
│   └── decision-ledger.json                 # Canonical ledger structure
└── scripts/
    ├── summarize_evidence.py                # Normalize repo evidence
    ├── collect_questions.py                 # Deduplicate and prioritize questions
    └── validate_feature_request.py          # Validate final output completeness
```

## Installation

### From local path
```bash
copilot plugin install ./plugins/plan
```

### From GitHub
```bash
copilot plugin install OWNER/REPO:plugins/plan
```

### Verify
```bash
copilot plugin list
```

In a session:
```
/plugin list
/skills list    # check 4 skills loaded
```

## Utility Scripts

```bash
# Validate a feature request
python scripts/validate_feature_request.py feature-request.md

# Summarize repository evidence
python scripts/summarize_evidence.py evidence.json

# Collect and deduplicate clarification questions
python scripts/collect_questions.py ambiguity.json risk.json framing.json
```

## Key Rules

1. **No novelty claim without repository evidence.** The plugin searches before claiming something doesn't exist.
2. **No implementation plans.** The output describes *what* to build, never *how*.
3. **No unresolved questions.** The final output must be complete.
4. **Mandatory clarification loop.** Material ambiguity must be resolved before finalizing.
5. **Wrong-problem detection.** The plugin challenges misframed requests before the user wastes time.
6. **Complete output only.** No partial specs, no drafts, no skeletons.

## Assumptions and Limitations

- **Assumes a non-empty repository.** The plugin works best when there's existing code to analyze. For empty repositories, it proceeds with clarification only.
- **Clarification depends on user availability.** The loop requires user answers. If the user declines to answer, the plugin notes assumptions explicitly.
- **No persistent storage.** The decision ledger exists only during the session. Re-running the plugin starts fresh.
- **Max 4 clarification rounds.** To prevent infinite loops, the plugin consolidates remaining questions after round 4.
- **Language-agnostic.** The repo-researcher searches broadly but may miss language-specific patterns in very unfamiliar stacks.

# Plan Plugin

Transforms vague ideas into complete feature designs through structured clarification. The plugin analyzes repository context, detects ambiguity, asks targeted questions, and produces a resolved specification with no open questions.

## Why Feature Design, Not Implementation Planning

Implementation plans answer "how to build it." Feature designs answer "what should exist, why it matters, and how success will be verified." The plan plugin stops before code changes or task breakdowns so implementation starts from clear, testable requirements.

## Architecture

Plan v2 is intentionally a single-skill workflow:

```text
plan skill (coordinator - runs in main context)
  |-- Phase 1: Understand
  |-- Phase 2: Analysis
  |-- Phase 3: Clarification Loop
  |-- Phase 4: Review
  `-- Phase 5: Output
```

The coordinator uses repository tools, current web references, appropriate skills, and ad hoc analysis scripts as needed. It no longer ships worker agents, lifecycle hooks, templates, or utility scripts.

## Usage

```text
/plan:plan add rate limiting to the login endpoint
```

The plugin will:

1. Parse the rough idea into a requested outcome and goal.
2. Gather repository and external evidence where relevant.
3. Analyze ambiguity, risks, framing, testability, and observability.
4. Ask targeted clarification questions until material ambiguity is resolved.
5. Produce a complete feature design.

## Output Expectations

The final feature design should cover:

- Problem and user goal
- Current context and evidence
- Proposed behavior
- Functional and non-functional requirements
- Non-goals and constraints
- Risks and edge cases
- Mechanically verifiable acceptance criteria
- Explicit decisions and accepted assumptions

There is no open-questions section, no TODO/TBD placeholder, and no implementation plan.

## File Structure

```text
plan/
|-- AGENTS.md                 # Lean plugin TOC and key rules
|-- plugin.json               # Plugin metadata
|-- README.md                 # Human-facing description
`-- skills/
    `-- plan/
        `-- SKILL.md          # Main coordinator skill
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

```text
/plugin list
/skills list    # check the plan skill is loaded
```

## Key Rules

1. Produce complete feature designs only - never implementation plans.
2. Resolve material ambiguity before finalizing.
3. Ground repository and novelty claims in evidence.
4. Challenge wrong-problem framing before documenting the design.
5. Make acceptance criteria mechanically verifiable.
6. Include observability and debugging requirements when behavior must be operated.

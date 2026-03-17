# Plan Plugin

Transforms vague feature ideas into **complete feature requests** through structured clarification. Analyzes the repository, detects ambiguity, asks targeted questions, and produces a fully resolved specification.

## Usage

```
/plan:plan add rate limiting to the login endpoint
```

The plugin will: parse your idea → search the repo → ask clarification questions → produce a complete feature request.

## How It Works

The `plan` skill coordinates in the main context, delegating analysis to worker agents:

1. **Intent Extraction** — normalize the idea, initialize decision ledger
2. **Repository Research** → `repo-researcher` agent
3. **Analysis** → `ambiguity-reviewer` + `risk-reviewer` + `problem-framing-reviewer` (parallel)
4. **Clarification Loop** — deduplicate questions, ask user, record answers, re-assess (max 4 rounds)
5. **Final Review** — verify all questions resolved
6. **Output** — complete feature request traced to the decision ledger

## File Structure

```
plan/
├── plugin.json              # Manifest
├── CLAUDE.md                # Operating rules
├── hooks.json               # Lifecycle hooks
├── skills/plan/SKILL.md     # Coordinator skill (entry point)
├── agents/                  # Worker subagents
│   ├── repo-researcher.md
│   ├── ambiguity-reviewer.md
│   ├── risk-reviewer.md
│   └── problem-framing-reviewer.md
└── templates/
    └── decision-ledger.json # Ledger structure
```

## Key Rules

1. No novelty claim without repository evidence
2. No implementation plans — *what* to build, never *how*
3. Clarification loop is mandatory
4. Challenge wrong-problem framing
5. Complete output only — no TBD, no open questions

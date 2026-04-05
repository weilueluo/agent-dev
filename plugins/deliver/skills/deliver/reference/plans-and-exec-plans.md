# Standards for Plans and Execution Plans

This document defines the standards for authoring plans and execution plans (ExecPlans). It draws heavily from the [Codex Execution Plans](https://developers.openai.com/cookbook/articles/codex_exec_plans) methodology and adapts it for use within the deliver pipeline.

---

## Core Principles

1. **Self-contained.** Every plan must include all knowledge and instructions needed for a novice to succeed. Do not reference external context, prior plans, or undocumented assumptions.
2. **Living document.** Plans are revised as progress is made, discoveries occur, and design decisions are finalized. Each revision must remain fully self-contained.
3. **Outcome-focused.** Plans must produce demonstrably working behavior, not merely code changes. Acceptance criteria are phrased as observable behavior a human can verify.
4. **Plain language.** Define every term of art in plain language, or do not use it.

---

## Required Sections

Every plan must contain the following sections. They are not optional.

### Purpose / Big Picture

Explain in a few sentences what someone gains after this change and how they can see it working. State the user-visible behavior you will enable. Purpose and intent come first.

### Progress

Use a list with checkboxes to summarize granular steps. Every stopping point must be documented here, even if it requires splitting a partially completed task into two ("done" vs. "remaining"). This section must always reflect the actual current state of the work.

```
- [x] (2025-10-01 13:00Z) Example completed step.
- [ ] Example incomplete step.
- [ ] Example partially completed step (completed: X; remaining: Y).
```

Use timestamps to measure rates of progress.

### Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during implementation. Provide concise evidence.

```
- Observation: …
  Evidence: …
```

### Decision Log

Record every decision made while working on the plan:

```
- Decision: …
  Rationale: …
  Date/Author: …
```

### Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion. Compare the result against the original purpose.

---

## Plan of Work

Describe, in prose, the sequence of edits and additions. For each edit, name the file and location (function, module) and what to insert or change. Keep it concrete and minimal.

---

## Guidelines

### Repository Context

Name files with full repository-relative paths, name functions and modules precisely, and describe where new files should be created. When running commands, show the working directory and exact command line.

### Milestones

If you break the work into milestones, introduce each with a brief paragraph that describes:

- The scope and what will exist at the end of the milestone that did not exist before.
- The commands to run.
- The acceptance you expect to observe.

Each milestone must be independently verifiable and incrementally implement the overall goal.

### Idempotence and Safety

Write steps so they can be run multiple times without causing damage or drift. If a step can fail halfway, include how to retry or adapt. If a migration or destructive operation is necessary, spell out backups or safe fallbacks. Prefer additive, testable changes.

### Validation is Not Optional

Include instructions to run tests, to start the system if applicable, and to observe it doing something useful. State the exact test commands and how to interpret their results. Show expected outputs and error messages so a novice can tell success from failure.

### Capture Evidence

When steps produce terminal output, diffs, or logs, include them as indented examples. Keep them concise and focused on what proves success.

### Prototyping

It is acceptable to include explicit prototyping milestones when they de-risk a larger change. Keep prototypes additive and testable. Clearly label the scope as "prototyping"; describe how to run and observe results; and state the criteria for promoting or discarding the prototype.

---

## Formatting Rules

- Write in plain prose. Prefer sentences over lists. Avoid checklists, tables, and long enumerations unless brevity would obscure meaning.
- Checklists are permitted only in the `Progress` section.
- Use two newlines after every heading.
- Use correct syntax for ordered and unordered lists.
- When you need to show commands, transcripts, diffs, or code inside an ExecPlan code fence, present them as indented blocks rather than nested code fences.

---

## Anti-Patterns to Avoid

- **Undefined jargon.** If you introduce a phrase that is not ordinary English, define it immediately.
- **Letter-of-the-law compliance.** Do not describe a feature so narrowly that resulting code compiles but does nothing meaningful.
- **Outsourcing decisions.** When ambiguity exists, resolve it in the plan itself and explain why you chose that path.
- **Missing validation.** Never omit how to prove the change works.
- **Stale plans.** If you change course mid-implementation, document why in the Decision Log and reflect the implications in Progress.

---

## Skeleton

Below is a minimal skeleton for a new plan. Flesh it out during research and implementation.

```
# <Short, action-oriented description>

This plan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

## Purpose / Big Picture

Explain what someone gains after this change and how they can see it working.

## Progress

- [ ] First step.

## Surprises & Discoveries

(none yet)

## Decision Log

(none yet)

## Outcomes & Retrospective

(pending completion)

## Context and Orientation

Describe the current state relevant to this task. Name key files and modules by
full path. Define any non-obvious term.

## Plan of Work

Describe the sequence of edits and additions in prose.

## Concrete Steps

State the exact commands to run and where to run them.

## Validation and Acceptance

Describe how to exercise the system and what to observe.

## Idempotence and Recovery

Describe retry and rollback paths.

## Interfaces and Dependencies

Name the libraries, modules, and services to use and why. Specify types,
traits/interfaces, and function signatures.
```

---

## References

- [Codex Execution Plans (OpenAI Cookbook)](https://developers.openai.com/cookbook/articles/codex_exec_plans)

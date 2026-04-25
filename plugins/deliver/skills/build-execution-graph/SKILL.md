---
name: build-execution-graph
description: "Validate and visualize work phase dependencies. Detects cycles, missing references, and parallelization opportunities."
version: 7.1.0
---

# build-execution-graph

Validate a plan's work phases and produce a dependency graph.

## When to Use

- After planning produces multi-phase work
- To verify dependency correctness and find parallel opportunities

## Inputs

- **work_phases**: phase list with id and depends_on fields

## Process

1. Build adjacency list from phase dependencies.
2. Check for cycles, missing references, orphaned phases, implicit dependencies.
3. Compute topological order, critical path, and parallel groups.
4. Render as text visualization or Mermaid diagram (use `../../scripts/render_dag.py` if available).

## Output

Execution graph: phase ordering, parallel groups, critical path, validation warnings.

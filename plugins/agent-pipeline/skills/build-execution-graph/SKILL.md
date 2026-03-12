---
name: build-execution-graph
description: "Validate and visualize phase dependencies. Detects cycles, missing references, and parallelization opportunities."
version: 2.1.0
---

# build-execution-graph

Validate a plan's execution phases and produce a dependency graph.

## When to Use

- After planning produces multi-phase execution
- To verify dependency correctness and find parallel opportunities

## Inputs

- **execution_phases**: Phase list with ids and depends_on fields

## Process

1. Build adjacency list from phase dependencies
2. Check for cycles, missing references, orphaned phases, implicit dependencies
3. Compute topological order, critical path, and parallel groups
4. Render as text visualization or Mermaid diagram (use `scripts/render_dag.py` if available)

## Output

Execution graph showing: phase ordering, parallel groups, critical path, and any validation warnings.

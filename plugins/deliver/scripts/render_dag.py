#!/usr/bin/env python3
"""Render an execution graph from a deliver plan artifact.

JSON input is always supported. YAML input is supported only when PyYAML is
installed. Before rendering, the script validates phase ids, phase-level
depends_on lists, missing dependency references, and dependency cycles.

Usage:
    python render_dag.py plan.json
    python render_dag.py plan.yaml --format mermaid  # requires PyYAML
    python render_dag.py < plan.json
"""

import sys
import json
import argparse
from collections import defaultdict

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def load_input(text):
    try:
        import yaml
        return yaml.safe_load(text) or {}
    except ImportError:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            print("Warning: PyYAML not installed and input is not JSON.", file=sys.stderr)
            return {}


def extract_phases(plan):
    data = plan.get("planner_handoff", plan)
    phases = data.get("execution_phases", [])
    if not phases:
        phases = plan.get("replanner_handoff", {}).get("revised_phases", [])
    return phases if isinstance(phases, list) else []


def build_graph(phases):
    adj, names, nodes = defaultdict(list), {}, set()
    for p in phases:
        if not isinstance(p, dict):
            continue
        pid = p.get("id", "")
        names[pid] = p.get("name", pid)
        nodes.add(pid)
        adj[pid] = p.get("depends_on", []) if isinstance(p.get("depends_on"), list) else []
        for d in adj[pid]:
            nodes.add(d)
    return dict(adj), names, nodes


def validate_phases(phases):
    errors = []
    ids = set()
    adj = {}
    for index, phase in enumerate(phases):
        prefix = f"phase[{index}]"
        if not isinstance(phase, dict):
            errors.append(f"Error: {prefix} must be an object")
            continue
        pid = phase.get("id")
        if not isinstance(pid, str) or not pid.strip():
            errors.append(f"Error: {prefix}.id must be a non-empty string")
            continue
        if pid in ids:
            errors.append(f"Error: duplicate phase id '{pid}'")
        ids.add(pid)
        deps = phase.get("depends_on")
        if not isinstance(deps, list):
            errors.append(f"Error: phase '{pid}' depends_on must be a list")
            adj[pid] = []
        else:
            adj[pid] = deps
            for dep in deps:
                if not isinstance(dep, str) or not dep.strip():
                    errors.append(f"Error: phase '{pid}' has non-string or empty dependency {dep!r}")
    for pid, deps in adj.items():
        for dep in deps:
            if isinstance(dep, str) and dep.strip() and dep not in ids:
                errors.append(f"Error: phase '{pid}' depends on missing phase '{dep}'")
    if errors:
        return errors
    cycle = find_cycle(adj)
    if cycle:
        return [f"Error: dependency cycle detected: {' -> '.join(cycle)}"]
    return []


def find_cycle(adj):
    state = {}
    stack = []

    def visit(node):
        state[node] = "visiting"
        stack.append(node)
        for dep in adj.get(node, []):
            if state.get(dep) == "visiting":
                return stack[stack.index(dep):] + [dep]
            if state.get(dep) is None:
                cycle = visit(dep)
                if cycle:
                    return cycle
        stack.pop()
        state[node] = "visited"
        return None

    for node in adj:
        if state.get(node) is None:
            cycle = visit(node)
            if cycle:
                return cycle
    return None


def topo_layers(adj, nodes):
    in_deg = {n: 0 for n in nodes}
    rev = defaultdict(list)
    for node, deps in adj.items():
        for d in deps:
            rev[d].append(node)
            in_deg[node] = in_deg.get(node, 0) + 1
    for n in nodes:
        in_deg.setdefault(n, 0)
    layers, current = [], sorted(n for n in nodes if in_deg.get(n, 0) == 0)
    while current:
        layers.append(current)
        nxt = []
        for node in current:
            for dep in rev.get(node, []):
                in_deg[dep] -= 1
                if in_deg[dep] == 0:
                    nxt.append(dep)
        current = sorted(nxt)
    return layers


def risk_tag(phases, node):
    for p in phases:
        if isinstance(p, dict) and p.get("id") == node:
            r = p.get("estimated_risk", "")
            return f" [{r}]" if r else ""
    return ""


def render_ascii(phases):
    if not phases:
        return "No phases to render."
    adj, names, nodes = build_graph(phases)
    layers = topo_layers(adj, nodes)
    if not layers:
        return "No valid graph structure."
    max_label = max((len(names.get(n, n) + risk_tag(phases, n)) for n in nodes), default=20)
    bw = max(max_label + 2, 20)
    lines = ["=" * 60, "EXECUTION DAG", "=" * 60, ""]
    for i, layer in enumerate(layers):
        par = " (parallel)" if len(layer) > 1 else ""
        lines.append(f"Layer {i}{par}:")
        for node in layer:
            label = names.get(node, node) + risk_tag(phases, node)
            pad = bw - len(label) - 2
            lines.append(f"  ┌{'─' * bw}┐")
            lines.append(f"  │ {label}{' ' * max(0, pad)} │")
            lines.append(f"  └{'─' * bw}┘")
            deps = adj.get(node, [])
            if deps:
                lines.append(f"    ↑ depends on: {', '.join(names.get(d, d) for d in deps)}")
        if i < len(layers) - 1:
            lines.extend(["        │", "        ▼"])
    lines.extend(["", "─" * 60, f"Layers: {len(layers)} | Phases: {len(nodes)}"])
    crit = [l[0] for l in layers if l]
    lines.append(f"Critical path: {' → '.join(names.get(n, n) for n in crit)}")
    par_count = sum(1 for l in layers if len(l) > 1)
    if par_count:
        lines.append(f"Parallelizable layers: {par_count}")
    lines.append("─" * 60)
    return "\n".join(lines)


def render_mermaid(phases):
    if not phases:
        return "No phases to render."
    adj, names, nodes = build_graph(phases)
    lines = ["```mermaid", "graph TD", ""]
    for n in sorted(nodes):
        sid = n.replace("-", "_")
        rt = risk_tag(phases, n).strip()
        label = f"{names.get(n, n)} {rt}".strip()
        lines.append(f"    {sid}[\"{label}\"]")
    lines.append("")
    for node, deps in sorted(adj.items()):
        for d in sorted(deps):
            lines.append(f"    {d.replace('-', '_')} --> {node.replace('-', '_')}")
    lines.append("")
    for p in phases:
        if isinstance(p, dict) and p.get("estimated_risk") in ("high", "critical"):
            sid = p["id"].replace("-", "_")
            lines.append(f"    style {sid} fill:#ff6b6b,stroke:#c92a2a,color:#fff")
    lines.append("```")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Render execution DAG from a plan. JSON is built in; YAML requires PyYAML."
    )
    parser.add_argument("file", nargs="?", help="Plan file (reads stdin if omitted)")
    parser.add_argument("--format", "-f", choices=["ascii", "mermaid"], default="ascii")
    args = parser.parse_args()
    text = ""
    if args.file:
        try:
            with open(args.file, "r", encoding="utf-8") as f:
                text = f.read()
        except FileNotFoundError:
            print(f"Error: {args.file} not found", file=sys.stderr)
            sys.exit(1)
    else:
        text = sys.stdin.read()
    if not text.strip():
        print("Usage: render_dag.py <plan.yaml> [--format ascii|mermaid]", file=sys.stderr)
        sys.exit(1)
    plan = load_input(text)
    if not plan:
        print("Error: Could not parse input", file=sys.stderr)
        sys.exit(1)
    phases = extract_phases(plan)
    if not phases:
        print("Error: No execution phases found", file=sys.stderr)
        sys.exit(1)
    errors = validate_phases(phases)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        sys.exit(1)
    print(render_mermaid(phases) if args.format == "mermaid" else render_ascii(phases))


if __name__ == "__main__":
    main()

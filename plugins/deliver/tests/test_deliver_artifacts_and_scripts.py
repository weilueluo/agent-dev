import json
import re
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DELIVER = ROOT / "plugins" / "deliver"


def run_script(script, *args, input_obj=None):
    input_text = json.dumps(input_obj) if input_obj is not None else None
    return subprocess.run(
        [sys.executable, str(script), *args],
        input=input_text,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=str(ROOT),
        check=False,
    )


def valid_plan():
    return {
        "planning_mode": "standard",
        "chosen_strategy": {
            "name": "schema-first",
            "summary": "Define contracts before implementation.",
            "rationale": "Machine checks reduce drift.",
        },
        "alternatives_considered": ["prose-only"],
        "execution_phases": [
            {
                "id": "p1",
                "name": "Contracts",
                "depends_on": [],
                "files_affected": ["plugins/deliver/schemas/plan.schema.json"],
                "description": "Add plan schema.",
                "exact_changes": ["Create schema file"],
                "acceptance_criteria": ["Schema parses as JSON"],
                "verification_commands": ["python -m unittest"],
            },
            {
                "id": "p2",
                "name": "Validation",
                "depends_on": ["p1"],
                "files_affected": ["plugins/deliver/scripts/validate_artifacts.py"],
                "description": "Add validator.",
                "exact_changes": ["Validate dependency graph"],
                "acceptance_criteria": ["Invalid cycles fail"],
                "verification_commands": ["python -m unittest"],
            },
        ],
        "acceptance_criteria": ["Artifacts validate"],
        "non_goals": ["No third-party dependency"],
        "risk_mitigations": ["Keep aliases"],
        "rollback_notes": "Revert plugin deliver changes.",
    }


def valid_trace():
    return {
        "loop_trace": {
            "trace_id": "deliver-test",
            "issue_summary": "Validate trace contract",
            "started_at": "2026-04-25T00:00:00Z",
            "completed_at": "2026-04-25T00:01:00Z",
            "disposition": "accept",
            "iterations": 1,
            "events": [
                {
                    "timestamp": "2026-04-25T00:00:01Z",
                    "step": "plan",
                    "iteration": 1,
                    "duration_ms": 10,
                    "token_estimate": 20,
                    "artifact_size_tokens": 30,
                }
            ],
        }
    }


class ArtifactValidationTests(unittest.TestCase):
    def test_schema_files_parse_and_expose_required_fields(self):
        plan_schema = json.loads((DELIVER / "schemas" / "plan.schema.json").read_text(encoding="utf-8"))
        trace_schema = json.loads((DELIVER / "schemas" / "loop-trace.schema.json").read_text(encoding="utf-8"))
        self.assertIn("execution_phases", plan_schema["required"])
        self.assertIn("depends_on", plan_schema["properties"]["execution_phases"]["items"]["required"])
        self.assertIn("events", trace_schema["required"])
        self.assertIn("artifact_size_tokens", trace_schema["properties"]["events"]["items"]["required"])

    def test_plan_validator_accepts_planner_handoff_and_rejects_cycles(self):
        script = DELIVER / "scripts" / "validate_artifacts.py"
        ok = run_script(script, "--type", "plan", input_obj={"planner_handoff": valid_plan()})
        self.assertEqual(ok.returncode, 0, ok.stderr)
        self.assertIn("OK: valid plan artifact", ok.stdout)

        bad = valid_plan()
        bad["execution_phases"][0]["depends_on"] = ["p2"]
        result = run_script(script, "--type", "plan", input_obj=bad)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("dependency cycle", result.stderr)

    def test_loop_trace_validator_accepts_alias_and_rejects_bad_step(self):
        script = DELIVER / "scripts" / "validate_artifacts.py"
        ok = run_script(script, "--type", "loop-trace", input_obj=valid_trace())
        self.assertEqual(ok.returncode, 0, ok.stderr)
        pipeline_alias = {"pipeline_trace": valid_trace()["loop_trace"]}
        alias_ok = run_script(script, "--type", "loop-trace", input_obj=pipeline_alias)
        self.assertEqual(alias_ok.returncode, 0, alias_ok.stderr)

        bad = valid_trace()
        bad["loop_trace"]["events"][0]["step"] = "review"
        result = run_script(script, "--type", "loop-trace", input_obj=bad)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("expected one of", result.stderr)

    def test_render_dag_validates_dependency_errors_and_preserves_mermaid(self):
        script = DELIVER / "scripts" / "render_dag.py"
        ok = run_script(script, "--format", "mermaid", input_obj=valid_plan())
        self.assertEqual(ok.returncode, 0, ok.stderr)
        self.assertIn("```mermaid", ok.stdout)
        self.assertIn("p1 --> p2", ok.stdout)

        bad = valid_plan()
        bad["execution_phases"][1]["depends_on"] = "p1"
        result = run_script(script, input_obj=bad)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("depends_on must be a list", result.stderr)

    def test_score_plan_uses_phase_depends_on_not_top_level_dependencies(self):
        script = DELIVER / "scripts" / "score_plan.py"
        plan = valid_plan()
        result = run_script(script, input_obj=plan)
        self.assertIn("dependency_clarity", result.stdout)
        self.assertNotIn("explicit dependency list", result.stdout)


class ResourceAndPolicyTests(unittest.TestCase):
    def test_evals_json_contract_and_defect_routing_coverage(self):
        data = json.loads((DELIVER / "skills" / "deliver" / "evals" / "evals.json").read_text(encoding="utf-8"))
        self.assertEqual(data["skill_name"], "deliver")
        evals = data.get("evals")
        self.assertIsInstance(evals, list)
        self.assertTrue(evals)
        ids = [item.get("id") for item in evals]
        self.assertEqual(len(ids), len(set(ids)))
        for item in evals:
            for field in ["id", "prompt", "expected_output", "files", "expectations"]:
                self.assertIn(field, item)
            self.assertTrue(item["expectations"])
        combined = "\n".join(
            item["prompt"] + "\n" + item["expected_output"] + "\n" + "\n".join(item["expectations"])
            for item in evals
        ).lower()
        removed_skill_name = "bug" + "fix"
        self.assertNotIn(removed_skill_name, combined)
        self.assertIn("evidence-dependent", combined)
        self.assertIn("owns the work with the deliver loop", combined)
        self.assertIn("obvious one-step", combined)
        self.assertIn("without starting the full loop", combined)
        self.assertIn("too vague", combined)
        self.assertIn("reproduction steps", combined)

    def test_standalone_skill_resource_references_resolve(self):
        skill_paths = list((DELIVER / "skills").glob("*/SKILL.md"))
        self.assertTrue(skill_paths)
        path_pattern = re.compile(r"`([^`]+)`")
        for skill_path in skill_paths:
            text = skill_path.read_text(encoding="utf-8")
            for match in path_pattern.finditer(text):
                ref = match.group(1)
                if ref.startswith(("http://", "https://")) or ref.startswith("dev:"):
                    continue
                if not ("/" in ref or ref.endswith((".md", ".json", ".py"))):
                    continue
                if any(char.isspace() for char in ref):
                    continue
                resolved = (skill_path.parent / ref).resolve()
                self.assertTrue(
                    resolved.exists(),
                    f"{skill_path.relative_to(ROOT)} references missing resource {ref}",
                )

    def test_policy_docs_include_required_contract_language(self):
        agents_lines = (DELIVER / "AGENTS.md").read_text(encoding="utf-8").splitlines()
        self.assertLess(len(agents_lines), 50)

        deliver_skill = (DELIVER / "skills" / "deliver" / "SKILL.md").read_text(encoding="utf-8").lower()
        removed_skill_name = "bug" + "fix"
        self.assertNotIn(removed_skill_name, deliver_skill)
        self.assertIn("run the full loop for non-trivial or evidence-dependent bug reports", deliver_skill)
        self.assertIn("handle obvious one-step fixes directly without the loop", deliver_skill)
        self.assertIn("ask for reproduction steps, evidence, logs, expected-vs-actual behavior, and environment details", deliver_skill)

        planning = (DELIVER / "knowledge" / "planning-patterns.md").read_text(encoding="utf-8").lower()
        self.assertIn("do not auto-append", planning)

        hooks = (DELIVER / "hooks.json").read_text(encoding="utf-8").lower()
        self.assertIn("explicit human approval", hooks)
        self.assertIn("protected_action_ack", hooks)

        operating = (DELIVER / "OPERATING-RULES.md").read_text(encoding="utf-8")
        for field in ["path", "action", "reason", "risk", "approval_source"]:
            self.assertIn(f"`{field}`", operating)

        plans_doc = (DELIVER / "skills" / "deliver" / "reference" / "plans-and-exec-plans.md").read_text(encoding="utf-8")
        self.assertIn("plan.schema.json", plans_doc)
        for field in [
            "planning_mode",
            "chosen_strategy",
            "alternatives_considered",
            "execution_phases",
            "acceptance_criteria",
            "non_goals",
            "risk_mitigations",
            "rollback_notes",
            "depends_on",
        ]:
            self.assertIn(f"`{field}`", plans_doc)


if __name__ == "__main__":
    unittest.main()

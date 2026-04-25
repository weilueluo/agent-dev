import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
VALIDATOR_PATH = ROOT / "tools" / "validate-skills.py"

spec = importlib.util.spec_from_file_location("validate_skills", VALIDATOR_PATH)
validate_skills = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(validate_skills)


class ValidateSkillsTests(unittest.TestCase):
    def make_repo(self, marketplace_plugins, readme_rows=None):
        tmp = tempfile.TemporaryDirectory()
        root = Path(tmp.name)
        (root / ".github" / "plugin").mkdir(parents=True)
        (root / "plugins").mkdir()
        marketplace = {
            "name": "fixture",
            "description": "fixture marketplace",
            "plugins": marketplace_plugins,
        }
        (root / ".github" / "plugin" / "marketplace.json").write_text(
            json.dumps(marketplace),
            encoding="utf-8",
        )
        rows = "\n".join(readme_rows or [])
        (root / "README.md").write_text(
            "# Fixture\n\n"
            "## Available Plugins\n\n"
            "| Plugin | Version | Description |\n"
            "|--------|---------|-------------|\n"
            f"{rows}\n\n"
            "## Next Section\n\n"
            "| Not | A | Plugin |\n"
            "|-----|---|--------|\n"
            "| [`ignored`](plugins/ignored/) | 9.9.9 | outside scoped table |\n",
            encoding="utf-8",
        )
        return tmp, root

    def test_parse_available_plugins_table_is_scoped_to_heading(self):
        tmp, root = self.make_repo(
            marketplace_plugins=[],
            readme_rows=["| [`one`](plugins/one/) | 1.2.3 | One plugin |"],
        )
        self.addCleanup(tmp.cleanup)

        rows = validate_skills.parse_available_plugins_table((root / "README.md").read_text(encoding="utf-8"))

        self.assertEqual(rows, [{"name": "one", "link": "plugins/one/", "version": "1.2.3"}])

    def test_build_report_fails_for_marketplace_entry_missing_source(self):
        tmp, root = self.make_repo(
            marketplace_plugins=[
                {
                    "name": "missing-source",
                    "version": "1.0.0",
                }
            ]
        )
        self.addCleanup(tmp.cleanup)

        report = validate_skills.build_report(root)

        self.assertEqual(report["status"], "failed")
        self.assertTrue(any("plugin missing-source missing source" in issue for issue in report["issues"]))

    def test_build_report_fails_for_marketplace_source_dir_without_plugin_json(self):
        tmp, root = self.make_repo(
            marketplace_plugins=[
                {
                    "name": "empty",
                    "version": "1.0.0",
                    "source": "./plugins/empty",
                }
            ]
        )
        self.addCleanup(tmp.cleanup)
        (root / "plugins" / "empty").mkdir()

        report = validate_skills.build_report(root)

        self.assertEqual(report["status"], "failed")
        self.assertTrue(
            any("plugins/empty/plugin.json" in issue and "marketplace source" in issue for issue in report["issues"])
        )

    def test_build_report_fails_for_readme_row_linking_to_missing_plugin_dir(self):
        tmp, root = self.make_repo(
            marketplace_plugins=[],
            readme_rows=["| [`missing`](plugins/missing/) | 1.0.0 | Missing plugin |"],
        )
        self.addCleanup(tmp.cleanup)

        report = validate_skills.build_report(root)

        self.assertEqual(report["status"], "failed")
        self.assertTrue(
            any("plugins/missing" in issue and "links to missing directory" in issue for issue in report["issues"])
        )

    def test_build_report_fails_for_readme_row_existing_dir_without_plugin_json(self):
        tmp, root = self.make_repo(
            marketplace_plugins=[],
            readme_rows=["| [`empty`](plugins/empty/) | 1.0.0 | Empty plugin |"],
        )
        self.addCleanup(tmp.cleanup)
        (root / "plugins" / "empty").mkdir()

        report = validate_skills.build_report(root)

        self.assertEqual(report["status"], "failed")
        self.assertTrue(
            any("plugins/empty/plugin.json" in issue and "README Available Plugins" in issue for issue in report["issues"])
        )

    def test_cli_json_returns_nonzero_for_stale_marketplace_source(self):
        tmp, root = self.make_repo(
            marketplace_plugins=[
                {
                    "name": "stale",
                    "version": "1.0.0",
                    "source": "./plugins/stale",
                }
            ]
        )
        self.addCleanup(tmp.cleanup)

        result = subprocess.run(
            [sys.executable, str(VALIDATOR_PATH), "--json", "--repo-root", str(root)],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        self.assertNotEqual(result.returncode, 0)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "failed")
        self.assertTrue(any("plugins/stale" in issue for issue in payload["issues"]))


if __name__ == "__main__":
    unittest.main()

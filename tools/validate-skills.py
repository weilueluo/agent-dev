#!/usr/bin/env python3
"""Validate plugin and skill metadata integrity.

The validator is intentionally dependency-free so it can run in local shells and
GitHub Actions without npm or pip setup.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".github" / "plugin" / "marketplace.json").exists() and (
            candidate / "plugins"
        ).is_dir():
            return candidate
    raise SystemExit("Could not find repository root from current directory")


def parse_frontmatter(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    frontmatter: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return frontmatter
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not match:
            continue
        key, value = match.groups()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        frontmatter[key] = value
    return {}


def exact_relative_path_exists(root: Path, relative_path: Path) -> bool:
    current = root
    for part in relative_path.parts:
        if not current.is_dir():
            return False
        matches = [child for child in current.iterdir() if child.name == part]
        if not matches:
            return False
        current = matches[0]
    return current.exists()


def load_json(path: Path, issues: list[str], passes: list[str]) -> Any | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # JSONDecodeError lacks stable message shape across versions
        issues.append(f"{path}: invalid JSON ({exc})")
        return None
    passes.append(f"{path}: JSON parsed")
    return data


def parse_available_plugins_table(readme_text: str) -> list[dict[str, str]]:
    """Parse rows from the root README's scoped Available Plugins table."""
    heading = re.search(r"^## Available Plugins\s*$", readme_text, flags=re.MULTILINE)
    if not heading:
        return []

    next_heading = re.search(r"^##\s+", readme_text[heading.end() :], flags=re.MULTILINE)
    section_end = heading.end() + next_heading.start() if next_heading else len(readme_text)
    section = readme_text[heading.end() : section_end]

    rows: list[dict[str, str]] = []
    for line in section.splitlines():
        if not line.lstrip().startswith("|"):
            continue
        if re.match(r"^\|\s*-+\s*\|\s*-+\s*\|\s*-+", line):
            continue
        match = re.match(
            r"^\|\s*\[`(?P<name>[^`]+)`\]\((?P<link>[^)]+)\)\s*"
            r"\|\s*(?P<version>[^|\s]+)\s*\|",
            line,
        )
        if match:
            rows.append(match.groupdict())
    return rows


def is_local_relative_source(source: str) -> bool:
    if re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", source):
        return False
    return not Path(source).is_absolute()


def is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def display_path(path: Path) -> str:
    return path.as_posix()


def validate_marketplace_entries(
    root: Path, marketplace: dict[str, Any], issues: list[str], passes: list[str]
) -> None:
    for entry in marketplace.get("plugins", []):
        name = entry.get("name") or "<unnamed>"
        source = entry.get("source")
        if not source:
            issues.append(f".github/plugin/marketplace.json: plugin {name} missing source")
            continue

        if not isinstance(source, str) or not is_local_relative_source(source):
            continue

        source_dir = (root / source).resolve()
        if not is_relative_to(source_dir, root.resolve()):
            issues.append(
                f".github/plugin/marketplace.json: plugin {name} source {source} resolves outside repo root"
            )
            continue

        rel_source = source_dir.relative_to(root.resolve())
        if not source_dir.is_dir():
            issues.append(f"{display_path(rel_source)}: marketplace source for plugin {name} is missing")
            continue
        passes.append(f"{name}: marketplace source directory exists")

        plugin_json = source_dir / "plugin.json"
        if not plugin_json.exists():
            issues.append(
                f"{display_path(rel_source / 'plugin.json')}: marketplace source for plugin {name} missing plugin.json"
            )
            continue

        plugin = load_json(plugin_json, issues, passes)
        if not plugin:
            continue
        if plugin.get("name") != entry.get("name"):
            issues.append(
                f"{display_path(plugin_json.relative_to(root))}: name {plugin.get('name')} "
                f"does not match marketplace entry {entry.get('name')}"
            )
        else:
            passes.append(f"{name}: marketplace name matches source plugin.json")
        if plugin.get("version") != entry.get("version"):
            issues.append(
                f"{display_path(plugin_json.relative_to(root))}: version {plugin.get('version')} "
                f"does not match marketplace entry {entry.get('version')}"
            )
        else:
            passes.append(f"{name}: marketplace version matches source plugin.json")


def validate_readme_plugin_links(root: Path, rows: list[dict[str, str]], issues: list[str], passes: list[str]) -> None:
    for row in rows:
        link = row["link"].split("#", 1)[0]
        if not link.startswith("plugins/"):
            continue

        linked_dir = (root / link).resolve()
        if not is_relative_to(linked_dir, root.resolve()):
            issues.append(f"README.md: plugin {row['name']} link {row['link']} resolves outside repo root")
            continue

        rel_link = linked_dir.relative_to(root.resolve())
        if not linked_dir.is_dir():
            issues.append(
                f"{display_path(rel_link)}: README Available Plugins row for {row['name']} links to missing directory"
            )
            continue
        passes.append(f"{row['name']}: README plugin link directory exists")

        plugin_json = linked_dir / "plugin.json"
        if not plugin_json.exists():
            issues.append(
                f"{display_path(rel_link / 'plugin.json')}: README Available Plugins row for {row['name']} missing plugin.json"
            )
        else:
            passes.append(f"{row['name']}: README plugin link has plugin.json")


def check_plugin_versions(root: Path, issues: list[str], warnings: list[str], passes: list[str]) -> None:
    marketplace_path = root / ".github" / "plugin" / "marketplace.json"
    marketplace = load_json(marketplace_path, issues, passes)
    if not marketplace:
        return

    validate_marketplace_entries(root, marketplace, issues, passes)

    marketplace_by_name = {
        plugin.get("name"): plugin for plugin in marketplace.get("plugins", []) if plugin.get("name")
    }

    readme_versions: dict[str, str] = {}
    readme_path = root / "README.md"
    if readme_path.exists():
        readme = readme_path.read_text(encoding="utf-8")
        available_plugin_rows = parse_available_plugins_table(readme)
        validate_readme_plugin_links(root, available_plugin_rows, issues, passes)
        for row in available_plugin_rows:
            readme_versions[row["name"]] = row["version"]
        passes.append("README.md: plugin version table parsed")
    else:
        issues.append("README.md: missing root README")

    for plugin_json in sorted((root / "plugins").glob("*/plugin.json")):
        plugin = load_json(plugin_json, issues, passes)
        if not plugin:
            continue
        plugin_name = plugin.get("name")
        plugin_version = plugin.get("version")
        rel_plugin_json = plugin_json.relative_to(root)

        if not plugin_name:
            issues.append(f"{rel_plugin_json}: missing name")
            continue
        if not plugin_version or not SEMVER_RE.match(str(plugin_version)):
            issues.append(f"{rel_plugin_json}: version must be semver X.Y.Z")
            continue

        marketplace_entry = marketplace_by_name.get(plugin_name)
        if not marketplace_entry:
            issues.append(f"{rel_plugin_json}: plugin missing from .github/plugin/marketplace.json")
        elif marketplace_entry.get("version") != plugin_version:
            issues.append(
                f"{rel_plugin_json}: marketplace version {marketplace_entry.get('version')} "
                f"does not match plugin.json version {plugin_version}"
            )
        else:
            passes.append(f"{plugin_name}: marketplace version matches plugin.json")

        readme_version = readme_versions.get(plugin_name)
        if readme_version is None:
            warnings.append(f"README.md: plugin {plugin_name} is not listed in the Available Plugins table")
        elif readme_version != plugin_version:
            issues.append(
                f"README.md: plugin {plugin_name} version {readme_version} "
                f"does not match plugin.json version {plugin_version}"
            )
        else:
            passes.append(f"{plugin_name}: README version matches plugin.json")

        plugin_readme = plugin_json.parent / "README.md"
        if plugin_readme.exists():
            readme_text = plugin_readme.read_text(encoding="utf-8")
            manifest_version_match = re.search(r"Plugin manifest \(v(\d+\.\d+\.\d+)\)", readme_text)
            if manifest_version_match:
                manifest_version = manifest_version_match.group(1)
                if manifest_version != plugin_version:
                    issues.append(
                        f"{plugin_readme.relative_to(root)}: manifest comment version {manifest_version} "
                        f"does not match plugin.json version {plugin_version}"
                    )
                else:
                    passes.append(f"{plugin_name}: plugin README manifest comment matches plugin.json")


def check_skills(root: Path, issues: list[str], warnings: list[str], passes: list[str]) -> None:
    skill_paths = sorted((root / "plugins").glob("*/skills/*/SKILL.md"))
    if not skill_paths:
        issues.append("plugins: no SKILL.md files found")
        return

    for skill_path in skill_paths:
        rel_skill_path = skill_path.relative_to(root)
        frontmatter = parse_frontmatter(skill_path)
        if not frontmatter:
            issues.append(f"{rel_skill_path}: missing or invalid YAML frontmatter")
            continue

        name = frontmatter.get("name")
        description = frontmatter.get("description")
        version = frontmatter.get("version")

        if not name:
            issues.append(f"{rel_skill_path}: missing frontmatter field 'name'")
        elif name != skill_path.parent.name:
            issues.append(
                f"{rel_skill_path}: name '{name}' does not match directory '{skill_path.parent.name}'"
            )
        else:
            passes.append(f"{rel_skill_path}: name matches directory")

        if not description:
            issues.append(f"{rel_skill_path}: missing frontmatter field 'description'")
        elif len(description) > 1024:
            issues.append(f"{rel_skill_path}: description exceeds 1024 characters")
        else:
            passes.append(f"{rel_skill_path}: description present")

        if not version:
            issues.append(f"{rel_skill_path}: missing frontmatter field 'version'")
        elif not SEMVER_RE.match(version):
            issues.append(f"{rel_skill_path}: version '{version}' is not semver X.Y.Z")
        else:
            passes.append(f"{rel_skill_path}: version is semver")

    passes.append(f"Checked {len(skill_paths)} skill files")


def check_known_references(root: Path, issues: list[str], passes: list[str]) -> None:
    pdf_skill = root / "plugins" / "documents" / "skills" / "pdf" / "SKILL.md"
    if pdf_skill.exists():
        pdf_text = pdf_skill.read_text(encoding="utf-8")
        for bad_reference in ("REFERENCE.md", "FORMS.md"):
            if bad_reference in pdf_text:
                issues.append(f"{pdf_skill.relative_to(root)}: use lowercase reference for {bad_reference}")
        for required in ("reference.md", "forms.md"):
            rel_required = Path("plugins") / "documents" / "skills" / "pdf" / required
            if not exact_relative_path_exists(root, rel_required):
                issues.append(f"{rel_required}: missing or casing does not match reference")
            else:
                passes.append(f"{rel_required}: referenced file exists with exact casing")

    codepen_skill = root / "plugins" / "dev" / "skills" / "codepen" / "SKILL.md"
    if codepen_skill.exists():
        codepen_text = codepen_skill.read_text(encoding="utf-8")
        if "codepen-downloader" in codepen_text:
            issues.append(f"{codepen_skill.relative_to(root)}: stale codepen-downloader path")
        rel_extract = Path("plugins") / "dev" / "skills" / "codepen" / "extract.js"
        if not exact_relative_path_exists(root, rel_extract):
            issues.append(f"{rel_extract}: missing bundled CodePen extractor")
        else:
            passes.append(f"{rel_extract}: bundled extractor exists")

    browser_logs_script = Path("plugins") / "dev" / "skills" / "browser-logs" / "capture.js"
    if exact_relative_path_exists(root, browser_logs_script):
        passes.append(f"{browser_logs_script}: bundled browser log capture script exists")
    else:
        issues.append(f"{browser_logs_script}: missing bundled browser log capture script")


def build_report(root: Path) -> dict[str, Any]:
    issues: list[str] = []
    warnings: list[str] = []
    passes: list[str] = []

    check_plugin_versions(root, issues, warnings, passes)
    check_skills(root, issues, warnings, passes)
    check_known_references(root, issues, passes)

    return {
        "repo_root": str(root),
        "status": "failed" if issues else "passed",
        "issues": issues,
        "warnings": warnings,
        "passes": passes,
        "summary": {
            "issue_count": len(issues),
            "warning_count": len(warnings),
            "pass_count": len(passes),
        },
    }


def print_human_report(report: dict[str, Any]) -> None:
    summary = report["summary"]
    status = "PASSED" if report["status"] == "passed" else "FAILED"
    print(f"Skill integrity validation {status}")
    print(
        f"Issues: {summary['issue_count']} | "
        f"Warnings: {summary['warning_count']} | "
        f"Passes: {summary['pass_count']}"
    )

    if report["issues"]:
        print("\nIssues:")
        for issue in report["issues"]:
            print(f"  - {issue}")

    if report["warnings"]:
        print("\nWarnings:")
        for warning in report["warnings"]:
            print(f"  - {warning}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate agent-dev plugin and skill metadata")
    parser.add_argument("--json", action="store_true", help="print machine-readable JSON")
    parser.add_argument("--repo-root", type=Path, default=None, help="repository root to validate")
    args = parser.parse_args()

    root = args.repo_root.resolve() if args.repo_root else find_repo_root(Path.cwd())
    report = build_report(root)

    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print_human_report(report)

    return 1 if report["issues"] else 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Quick validation script for skills."""
import sys
import re
import yaml
from pathlib import Path


def validate_skill(skill_path):
    skill_path = Path(skill_path)
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        return False, "SKILL.md not found"
    content = skill_md.read_text()
    if not content.startswith('---'):
        return False, "No YAML frontmatter found"
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format"
    try:
        frontmatter = yaml.safe_load(match.group(1))
        if not isinstance(frontmatter, dict):
            return False, "Frontmatter must be a YAML dictionary"
    except yaml.YAMLError as e:
        return False, f"Invalid YAML: {e}"
    ALLOWED = {'name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility'}
    unexpected = set(frontmatter.keys()) - ALLOWED
    if unexpected:
        return False, f"Unexpected key(s): {', '.join(sorted(unexpected))}"
    if 'name' not in frontmatter:
        return False, "Missing 'name'"
    if 'description' not in frontmatter:
        return False, "Missing 'description'"
    name = str(frontmatter.get('name', '')).strip()
    if name and not re.match(r'^[a-z0-9-]+$', name):
        return False, f"Name '{name}' should be kebab-case"
    if name and len(name) > 64:
        return False, f"Name too long ({len(name)} chars, max 64)"
    desc = str(frontmatter.get('description', '')).strip()
    if desc and ('<' in desc or '>' in desc):
        return False, "Description cannot contain angle brackets"
    if desc and len(desc) > 1024:
        return False, f"Description too long ({len(desc)} chars, max 1024)"
    return True, "Skill is valid!"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill_directory>")
        sys.exit(1)
    valid, message = validate_skill(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)

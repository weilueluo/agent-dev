# Skill standards for deliver

This reference summarizes current Agent Skills standards that govern the deliver skill. Load it when maintaining or reviewing the skill itself, not on every issue-resolution run.

## Sources

- Anthropic Agent Skills overview: https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview
- Anthropic Skill best practices: https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/best-practices
- Anthropic engineering post, "Equipping agents for the real world with Agent Skills": https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Agent Skills open standard: https://agentskills.io/
- Claude Code skills documentation: https://code.claude.com/docs/en/skills

## Standards to apply

### Discovery metadata

- `name` uses lowercase letters, numbers, and hyphens only, with a maximum length of 64 characters.
- `description` is non-empty, under 1024 characters, and contains no XML tags.
- Write descriptions in third person. Front-load what the skill does and include concrete trigger contexts and anti-triggers.
- Descriptions are the main discovery mechanism. They need enough specific terms to distinguish the skill from nearby alternatives without becoming a mini-manual.

### Progressive disclosure

- Treat SKILL.md as the overview and routing layer.
- Keep the body concise and under 500 lines.
- Put detailed standards, examples, schemas, evals, and long references in separate files.
- Reference supporting files directly from SKILL.md so agents can discover them without chasing nested links.
- Add a table of contents to any reference file longer than 100 lines.
- Use forward-slash paths in skill references for cross-client portability.

### Appropriate degrees of freedom

- Use high freedom when context decides the approach, such as exploration.
- Use medium freedom when a preferred pattern exists but details vary, such as planning and phase sequencing.
- Use low freedom for fragile or high-stakes operations, such as protected actions, stop conditions, trace schemas, and version bumps.
- For high-stakes or batch work, use plan -> validate -> execute -> verify so errors are caught before changes are applied.

### Scripts and deterministic helpers

- Prefer utility scripts for deterministic, repetitive, or fragile checks.
- Make execution intent explicit: say "run this script" when the script should execute, and "read this file" when it is reference material.
- Scripts should solve errors with clear messages instead of punting ambiguous failures back to the model.
- Do not assume optional tools or packages are installed. Discover repository commands and use existing project tooling.

### Evaluation and iteration

- Create representative eval prompts before adding extensive instructions.
- Include positive and negative cases: should-trigger, should-not-trigger, simple direct handling, multi-step loop handling, escalation, and adjacent-skill routing.
- Compare against baseline behavior where practical.
- Observe how agents navigate the skill: missed references, overused sections, ignored resources, and repeated generated helper logic all signal improvement opportunities.
- Iterate the skill based on real usage, not imagined edge cases.

### Security and trust

- Treat skills like installed software. Audit instructions, scripts, resources, and external references.
- Avoid unexpected network calls or data access. External sources are risky because fetched content may contain hostile instructions.
- Never include secrets or credentials in skill resources.
- Gate destructive, externally visible, sensitive, or hard-to-reverse actions with explicit human approval.
- Keep resource behavior unsurprising relative to the skill description.

## Deliver-specific application

Deliver uses the Agent Skills model as follows:

- Discovery metadata routes multi-step issue-resolution tasks into the loop.
- SKILL.md stays as the concise orchestration overview.
- `reference/plans-and-exec-plans.md` carries detailed plan standards.
- `reference/skill-standards.md` carries skill-maintenance standards.
- Plugin-level knowledge files carry strategy, eval, and observability details.
- `evals/evals.json` provides representative prompts for skill behavior checks.

# Documents

Document processing — Word, PDF, PowerPoint, Excel, collaborative co-authoring, and skill creation.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Structure

- `skills/docx` — Word document creation and editing
- `skills/pdf` — PDF processing (read, merge, split, OCR, forms)
- `skills/pptx` — PowerPoint presentations
- `skills/xlsx` — Excel spreadsheets
- `skills/doc-coauthoring` — Collaborative document writing workflow
- `skills/skill-creator` — Skill creation, testing, and optimization framework

## Operational Rules

- **Match the format to the task.** Choose the right skill based on the file format.
- **Validate outputs.** Always validate with provided scripts (validate.py, recalc.py).
- **Preserve existing formatting** unless explicitly asked to change it.
- **Shared Office scripts:** `pack.py`, `unpack.py`, `validate.py`, `soffice.py` — identical across skills.

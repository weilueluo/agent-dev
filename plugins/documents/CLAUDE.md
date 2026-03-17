# Documents Plugin — Operating Rules

Persistent rules for document processing tasks.

---

## Core Principles

- **Match the format to the task.** Choose the right skill based on the file format: docx for Word documents, pdf for PDF files, pptx for PowerPoint presentations, xlsx for Excel spreadsheets, doc-coauthoring for collaborative writing workflows.
- **Validate outputs.** After creating or editing documents, always validate the output using the provided scripts (validate.py for docx/pptx, recalc.py for xlsx).
- **Preserve existing formatting.** When editing existing documents, maintain the original formatting, styles, and structure unless explicitly asked to change them.
- **Use proper tools.** Follow each skill's recommended toolchain — don't use workarounds when proper tools exist.

---

## Shared Office Scripts

The `office/` directory under each skill's scripts contains shared utilities:
- **pack.py** — Pack unpacked directory back into Office format (.docx/.pptx/.xlsx)
- **unpack.py** — Unpack Office files for XML-level editing
- **validate.py** — Validate Office document XML against schemas
- **soffice.py** — LibreOffice wrapper for headless operations

These scripts are identical across skills and handle format detection automatically.

---

## Skill-Specific Notes

### docx
- Use `docx-js` (npm) for creating new documents
- Use unpack → edit XML → pack workflow for editing existing documents
- Always validate with `scripts/office/validate.py` after packing

### pdf
- Use Python libraries (pypdf, pdfplumber, reportlab) for most operations
- Check FORMS.md before filling PDF forms
- Never use Unicode subscript/superscript characters with ReportLab

### pptx
- Use PptxGenJS for creating from scratch
- Use unpack → edit → pack for template-based editing
- Always run visual QA after creating slides

### xlsx
- Always use Excel formulas instead of hardcoded calculated values
- Run `scripts/recalc.py` after creating/modifying files with formulas
- Use openpyxl for formatting, pandas for data analysis

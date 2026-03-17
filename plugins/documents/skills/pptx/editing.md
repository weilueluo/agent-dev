# Editing Presentations

## Template-Based Workflow

1. **Analyze**: `python scripts/thumbnail.py template.pptx` + `python -m markitdown template.pptx`
2. **Plan slide mapping**: Choose varied layouts
3. **Unpack**: `python scripts/office/unpack.py template.pptx unpacked/`
4. **Build**: Delete/duplicate/reorder slides
5. **Edit content**: Update text in slide XML files
6. **Clean**: `python scripts/clean.py unpacked/`
7. **Pack**: `python scripts/office/pack.py unpacked/ output.pptx --original template.pptx`

## Scripts

| Script | Purpose |
|--------|---------|
| `unpack.py` | Extract and pretty-print PPTX |
| `add_slide.py` | Duplicate slide or create from layout |
| `clean.py` | Remove orphaned files |
| `pack.py` | Repack with validation |
| `thumbnail.py` | Create visual grid of slides |

## Editing Content

- **Bold all headers** with `b="1"` on `<a:rPr>`
- **Never use unicode bullets** - use `<a:buChar>` or `<a:buAutoNum>`
- **Use the Edit tool, not sed or Python scripts**
- **Smart quotes**: Use XML entities (`&#x201C;`, `&#x201D;`, etc.)

## Common Pitfalls

- Remove excess template elements entirely, don't just clear text
- Create separate `<a:p>` for each list item
- Use `defusedxml.minidom`, not `xml.etree.ElementTree` (corrupts namespaces)

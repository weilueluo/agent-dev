# Documents Plugin

A collection of document processing skills cloned from [anthropics/skills](https://github.com/anthropics/skills).

## Skills

| Skill | Description |
|-------|-------------|
| **doc-coauthoring** | Structured workflow for collaborative document creation |
| **docx** | Create, edit, and analyze Word documents (.docx) |
| **pdf** | Read, create, merge, split, fill forms, and process PDF files |
| **pptx** | Create and edit PowerPoint presentations (.pptx) |
| **xlsx** | Create, edit, and analyze Excel spreadsheets (.xlsx) |

## Dependencies

- **Python**: pypdf, pdfplumber, reportlab, openpyxl, pandas, Pillow, defusedxml, lxml
- **Node.js**: docx, pptxgenjs, react-icons, sharp
- **System**: LibreOffice (soffice), Poppler (pdftoppm, pdftotext, pdfimages), pandoc

## Schema Files

The `office/schemas/` directories need to be populated with OOXML XSD schema files for full validation support. These are standard ISO/IEC 29500 schemas.

## License

Skills content originally from [anthropics/skills](https://github.com/anthropics/skills) — see individual LICENSE.txt files in each skill directory.

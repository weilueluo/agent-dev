---
name: ocr-text-extraction
description: "Use when the user needs OCR/text extraction from images, scans, screenshots, invoices, scanned PDFs, multilingual documents, or layout/table-aware document parsing. Choose between Tesseract/pytesseract, EasyOCR, PaddleOCR, docTR, and Docling. Don't use for born-digital PDFs or Office files where format-specific extraction already works."
version: 1.0.0
---

# OCR Text Extraction

Choose the smallest OCR/document-parsing stack that satisfies the input quality, language coverage, and output structure. Do not run every OCR engine by default; pick one, explain the tradeoff, and switch only when quality or structure requirements justify it.

## Selection Guide

| Use case | Good choice | Why |
|---|---|---|
| Simple OCR, invoices, scanned pages, CLI use | Tesseract OCR + pytesseract | Mature, free, widely supported; best when images are clean. Tesseract is a command-line/API OCR engine, and the current user manual covers 5.x. |
| Python, quick setup, many languages | EasyOCR | Easy to use, supports 80+ languages and both scene text and dense document text. |
| High-quality OCR for PDFs/images, multilingual, production-ish | PaddleOCR | Strong all-around toolkit; supports 100+ languages and document/image-to-structured-data workflows. |
| Deep-learning document OCR in PyTorch | docTR | Good for document text detection + recognition pipelines; official docs describe it as PyTorch-powered OCR. |
| Document parsing, layout, tables, PDFs for RAG | Docling | Better when you need structure, reading order, tables, formulas, Markdown/JSON output, not just raw text. |

## Workflow

1. **Check for selectable text first.** For PDFs, try native extraction before OCR. OCR is slower and more error-prone than extracting embedded text.
2. **Classify the input.** Note file type, scan quality, page count, languages, handwritten vs printed text, tables/forms, and whether the user needs raw text, Markdown, JSON, table data, or searchable PDFs.
3. **Choose one primary tool.** Use the selection guide. Prefer Tesseract for clean/simple scans, EasyOCR for quick multilingual Python jobs, PaddleOCR for robust production OCR, docTR for PyTorch document OCR pipelines, and Docling for layout-aware document parsing.
4. **Preprocess deliberately.** Rasterize scanned PDFs at 200-300 DPI, preserve page order, and use deskew/crop/contrast only when it improves quality. Keep original files unchanged.
5. **Validate the result.** Spot-check representative pages, language-specific characters, totals/IDs on invoices, table boundaries, and reading order. Report known low-confidence regions instead of silently smoothing them over.

## Tool Notes

### Tesseract OCR + pytesseract

Use for clean scans, invoices, screenshots, and CLI-friendly batch OCR where an installed native OCR engine is acceptable.

- Requires the Tesseract binary plus language data; `pytesseract` is a Python wrapper, not the OCR engine itself.
- Common Python packages: `pytesseract`, `Pillow`, and `pdf2image` for scanned PDFs.
- Good default for English or well-scanned documents; quality drops on noisy photos, skewed pages, handwriting, and complex layouts.

```python
from pdf2image import convert_from_path
import pytesseract

pages = convert_from_path("scan.pdf", dpi=300)
text = "\n\n".join(pytesseract.image_to_string(page, lang="eng") for page in pages)
```

### EasyOCR

Use when the task needs quick Python setup, scene text, dense document text, or many supported languages without managing Tesseract language packs.

- Common package: `easyocr`.
- Instantiate the reader with only the languages needed; loading extra languages increases startup cost.
- Useful fallback when Tesseract struggles with natural images or multilingual content.

```python
import easyocr

reader = easyocr.Reader(["en"])
results = reader.readtext("page.png", detail=0, paragraph=True)
text = "\n".join(results)
```

### PaddleOCR

Use when OCR quality, multilingual support, and production-ish document/image workflows matter more than minimal dependencies.

- Common package: `paddleocr`; it may install heavier deep-learning dependencies.
- Good for multilingual OCR and structured document workflows.
- Check the current PaddleOCR docs for the active API and model options before committing integration code.

### docTR

Use for PyTorch-based document OCR pipelines where the user needs document text detection plus recognition, and the project already tolerates ML model dependencies.

- Common package: `python-doctr`; choose the PyTorch backend when installing.
- Good for full-page document OCR pipelines, not simple one-off CLI extraction.
- Check the current docTR docs for model names and backend-specific install steps.

### Docling

Use when the user needs document structure, not just text: reading order, headings, tables, formulas, Markdown, JSON, or RAG-ready output from PDFs/images.

- Common package: `docling`.
- Prefer Docling for document parsing and conversion workflows where preserving layout and structure matters.
- Validate Markdown/JSON output against the source layout, especially for tables, multi-column pages, and formulas.

## Output Guidance

Return the extracted text or structured file path, the OCR engine used, key options such as languages/DPI, and any quality caveats. If the deliverable is a document transformation such as searchable PDF creation, combine this engine-selection guidance with the relevant document-format skill.

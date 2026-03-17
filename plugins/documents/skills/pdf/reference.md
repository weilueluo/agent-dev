# PDF Processing Advanced Reference

This document contains advanced PDF processing features, detailed examples, and additional libraries.

## pypdfium2 Library
- Fast PDF rendering and image generation
- `pip install pypdfium2`

## JavaScript Libraries

### pdf-lib (MIT License)
- Create and modify PDFs in JavaScript
- `npm install pdf-lib`

### pdfjs-dist (Apache License)
- Mozilla's PDF.js for rendering
- `npm install pdfjs-dist`

## Advanced Command-Line Operations
- poppler-utils: `pdftotext -bbox-layout`, `pdftoppm`, `pdfimages`
- qpdf: page manipulation, optimization, encryption

## Performance Tips
- Use streaming for large PDFs
- pdfimages is faster than rendering for image extraction
- pdftotext is fastest for plain text extraction

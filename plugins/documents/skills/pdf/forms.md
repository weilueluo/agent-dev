**CRITICAL: You MUST complete these steps in order. Do not skip ahead to writing code.**

If you need to fill out a PDF form, first check to see if the PDF has fillable form fields. Run this script from this file's directory:
 `python scripts/check_fillable_fields <file.pdf>`, and depending on the result go to either the "Fillable fields" or "Non-fillable fields" and follow those instructions.

# Fillable fields
If the PDF has fillable form fields:
- Run: `python scripts/extract_form_field_info.py <input.pdf> <field_info.json>`
- Convert to images: `python scripts/convert_pdf_to_images.py <file.pdf> <output_directory>`
- Create field_values.json with values for each field
- Run: `python scripts/fill_fillable_fields.py <input pdf> <field_values.json> <output pdf>`

# Non-fillable fields
For PDFs without fillable fields, use annotation-based approach:
- Try structure extraction first: `python scripts/extract_form_structure.py <input.pdf> form_structure.json`
- If structure found, use PDF coordinates directly
- If scanned/image-based, use visual estimation with zoom refinement
- Validate: `python scripts/check_bounding_boxes.py fields.json`
- Fill: `python scripts/fill_pdf_form_with_annotations.py <input.pdf> fields.json <output.pdf>`
- Verify: `python scripts/convert_pdf_to_images.py <output.pdf> <verify_images/>`

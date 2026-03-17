import json
import sys
from pypdf import PdfReader, PdfWriter
from extract_form_field_info import get_field_info


def fill_pdf_fields(input_pdf_path, fields_json_path, output_pdf_path):
    with open(fields_json_path) as f:
        fields = json.load(f)
    fields_by_page = {}
    for field in fields:
        if "value" in field:
            fields_by_page.setdefault(field["page"], {})[field["field_id"]] = field["value"]

    reader = PdfReader(input_pdf_path)
    has_error = False
    field_info = get_field_info(reader)
    fields_by_ids = {f["field_id"]: f for f in field_info}
    for field in fields:
        existing = fields_by_ids.get(field["field_id"])
        if not existing:
            has_error = True
            print(f"ERROR: `{field['field_id']}` is not a valid field ID")
        elif field["page"] != existing["page"]:
            has_error = True
            print(f"ERROR: Incorrect page number for `{field['field_id']}`")
    if has_error:
        sys.exit(1)

    writer = PdfWriter(clone_from=reader)
    for page, field_values in fields_by_page.items():
        writer.update_page_form_field_values(writer.pages[page - 1], field_values, auto_regenerate=False)
    writer.set_need_appearances_writer(True)
    with open(output_pdf_path, "wb") as f:
        writer.write(f)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: fill_fillable_fields.py [input pdf] [field_values.json] [output pdf]")
        sys.exit(1)
    fill_pdf_fields(sys.argv[1], sys.argv[2], sys.argv[3])

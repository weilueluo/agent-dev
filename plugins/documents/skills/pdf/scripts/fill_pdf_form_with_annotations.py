import json
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.annotations import FreeText


def transform_from_image_coords(bbox, image_width, image_height, pdf_width, pdf_height):
    x_scale = pdf_width / image_width
    y_scale = pdf_height / image_height
    return bbox[0] * x_scale, pdf_height - (bbox[3] * y_scale), bbox[2] * x_scale, pdf_height - (bbox[1] * y_scale)


def transform_from_pdf_coords(bbox, pdf_height):
    return bbox[0], pdf_height - bbox[3], bbox[2], pdf_height - bbox[1]


def fill_pdf_form(input_pdf_path, fields_json_path, output_pdf_path):
    with open(fields_json_path, "r") as f:
        fields_data = json.load(f)
    reader = PdfReader(input_pdf_path)
    writer = PdfWriter()
    writer.append(reader)
    pdf_dimensions = {}
    for i, page in enumerate(reader.pages):
        mediabox = page.mediabox
        pdf_dimensions[i + 1] = [mediabox.width, mediabox.height]
    annotations = []
    for field in fields_data["form_fields"]:
        page_num = field["page_number"]
        page_info = next(p for p in fields_data["pages"] if p["page_number"] == page_num)
        pdf_width, pdf_height = pdf_dimensions[page_num]
        if "pdf_width" in page_info:
            transformed = transform_from_pdf_coords(field["entry_bounding_box"], float(pdf_height))
        else:
            transformed = transform_from_image_coords(field["entry_bounding_box"], page_info["image_width"], page_info["image_height"], float(pdf_width), float(pdf_height))
        if "entry_text" not in field or "text" not in field["entry_text"]:
            continue
        text = field["entry_text"]["text"]
        if not text:
            continue
        font_name = field["entry_text"].get("font", "Arial")
        font_size = str(field["entry_text"].get("font_size", 14)) + "pt"
        font_color = field["entry_text"].get("font_color", "000000")
        annotation = FreeText(text=text, rect=transformed, font=font_name, font_size=font_size, font_color=font_color, border_color=None, background_color=None)
        annotations.append(annotation)
        writer.add_annotation(page_number=page_num - 1, annotation=annotation)
    with open(output_pdf_path, "wb") as output:
        writer.write(output)
    print(f"Successfully filled PDF form. Added {len(annotations)} annotations")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: fill_pdf_form_with_annotations.py [input pdf] [fields.json] [output pdf]")
        sys.exit(1)
    fill_pdf_form(sys.argv[1], sys.argv[2], sys.argv[3])

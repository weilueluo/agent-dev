"""Extract form structure from a non-fillable PDF."""
import json
import sys
import pdfplumber


def extract_form_structure(pdf_path):
    structure = {"pages": [], "labels": [], "lines": [], "checkboxes": [], "row_boundaries": []}
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            structure["pages"].append({"page_number": page_num, "width": float(page.width), "height": float(page.height)})
            for word in page.extract_words():
                structure["labels"].append({"page": page_num, "text": word["text"], "x0": round(float(word["x0"]), 1), "top": round(float(word["top"]), 1), "x1": round(float(word["x1"]), 1), "bottom": round(float(word["bottom"]), 1)})
            for line in page.lines:
                if abs(float(line["x1"]) - float(line["x0"])) > page.width * 0.5:
                    structure["lines"].append({"page": page_num, "y": round(float(line["top"]), 1), "x0": round(float(line["x0"]), 1), "x1": round(float(line["x1"]), 1)})
            for rect in page.rects:
                width = float(rect["x1"]) - float(rect["x0"])
                height = float(rect["bottom"]) - float(rect["top"])
                if 5 <= width <= 15 and 5 <= height <= 15 and abs(width - height) < 2:
                    structure["checkboxes"].append({"page": page_num, "x0": round(float(rect["x0"]), 1), "top": round(float(rect["top"]), 1), "x1": round(float(rect["x1"]), 1), "bottom": round(float(rect["bottom"]), 1), "center_x": round((float(rect["x0"]) + float(rect["x1"])) / 2, 1), "center_y": round((float(rect["top"]) + float(rect["bottom"])) / 2, 1)})
    lines_by_page = {}
    for line in structure["lines"]:
        lines_by_page.setdefault(line["page"], []).append(line["y"])
    for page, y_coords in lines_by_page.items():
        y_coords = sorted(set(y_coords))
        for i in range(len(y_coords) - 1):
            structure["row_boundaries"].append({"page": page, "row_top": y_coords[i], "row_bottom": y_coords[i + 1], "row_height": round(y_coords[i + 1] - y_coords[i], 1)})
    return structure


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: extract_form_structure.py <input.pdf> <output.json>")
        sys.exit(1)
    structure = extract_form_structure(sys.argv[1])
    with open(sys.argv[2], "w") as f:
        json.dump(structure, f, indent=2)
    print(f"Found: {len(structure['labels'])} labels, {len(structure['lines'])} lines, {len(structure['checkboxes'])} checkboxes")

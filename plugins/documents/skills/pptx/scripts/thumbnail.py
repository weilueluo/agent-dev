"""Create thumbnail grids from PowerPoint presentation slides."""
import argparse
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
import defusedxml.minidom
from office.soffice import get_soffice_env
from PIL import Image, ImageDraw, ImageFont


def main():
    parser = argparse.ArgumentParser(description="Create thumbnail grids from slides")
    parser.add_argument("input", help="Input .pptx file")
    parser.add_argument("output_prefix", nargs="?", default="thumbnails")
    parser.add_argument("--cols", type=int, default=3)
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists() or input_path.suffix.lower() != ".pptx":
        print(f"Error: Invalid PowerPoint file: {args.input}", file=sys.stderr)
        sys.exit(1)

    slide_info = get_slide_info(input_path)
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        images = convert_to_images(input_path, temp_path)
        if not images:
            print("Error: No slides found", file=sys.stderr)
            sys.exit(1)
        slides = [(images[i], info["name"]) for i, info in enumerate(slide_info) if not info["hidden"] and i < len(images)]
        grid = create_grid(slides, min(args.cols, 6), 300)
        output = Path(f"{args.output_prefix}.jpg")
        grid.save(str(output), quality=95)
        print(f"Created: {output}")


def get_slide_info(pptx_path):
    with zipfile.ZipFile(pptx_path, "r") as zf:
        rels_dom = defusedxml.minidom.parseString(zf.read("ppt/_rels/presentation.xml.rels"))
        rid_to_slide = {}
        for rel in rels_dom.getElementsByTagName("Relationship"):
            target = rel.getAttribute("Target")
            if "slide" in rel.getAttribute("Type") and target.startswith("slides/"):
                rid_to_slide[rel.getAttribute("Id")] = target.replace("slides/", "")
        pres_dom = defusedxml.minidom.parseString(zf.read("ppt/presentation.xml"))
        slides = []
        for sld_id in pres_dom.getElementsByTagName("p:sldId"):
            rid = sld_id.getAttribute("r:id")
            if rid in rid_to_slide:
                slides.append({"name": rid_to_slide[rid], "hidden": sld_id.getAttribute("show") == "0"})
        return slides


def convert_to_images(pptx_path, temp_dir):
    pdf_path = temp_dir / f"{pptx_path.stem}.pdf"
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(temp_dir), str(pptx_path)], capture_output=True, env=get_soffice_env())
    if not pdf_path.exists():
        raise RuntimeError("PDF conversion failed")
    subprocess.run(["pdftoppm", "-jpeg", "-r", "100", str(pdf_path), str(temp_dir / "slide")], capture_output=True)
    return sorted(temp_dir.glob("slide-*.jpg"))


def create_grid(slides, cols, width):
    if not slides:
        return Image.new("RGB", (100, 100), "white")
    with Image.open(slides[0][0]) as img:
        aspect = img.height / img.width
    height = int(width * aspect)
    font_size = int(width * 0.10)
    padding = 20
    rows = (len(slides) + cols - 1) // cols
    grid_w = cols * width + (cols + 1) * padding
    grid_h = rows * (height + font_size + 20) + (rows + 1) * padding
    grid = Image.new("RGB", (grid_w, grid_h), "white")
    draw = ImageDraw.Draw(grid)
    try:
        font = ImageFont.load_default(size=font_size)
    except Exception:
        font = ImageFont.load_default()
    for i, (img_path, name) in enumerate(slides):
        row, col = i // cols, i % cols
        x = col * width + (col + 1) * padding
        y = row * (height + font_size + 20) + (row + 1) * padding
        draw.text((x, y), name, fill="black", font=font)
        with Image.open(img_path) as img:
            img.thumbnail((width, height), Image.Resampling.LANCZOS)
            grid.paste(img, (x, y + font_size + 10))
    return grid


if __name__ == "__main__":
    main()

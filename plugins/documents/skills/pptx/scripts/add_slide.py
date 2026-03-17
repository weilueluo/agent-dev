"""Add a new slide to an unpacked PPTX directory."""
import re
import shutil
import sys
from pathlib import Path


def get_next_slide_number(slides_dir):
    existing = [int(m.group(1)) for f in slides_dir.glob("slide*.xml") if (m := re.match(r"slide(\d+)\.xml", f.name))]
    return max(existing) + 1 if existing else 1


def create_slide_from_layout(unpacked_dir, layout_file):
    slides_dir = unpacked_dir / "ppt" / "slides"
    rels_dir = slides_dir / "_rels"
    layout_path = unpacked_dir / "ppt" / "slideLayouts" / layout_file
    if not layout_path.exists():
        print(f"Error: {layout_path} not found", file=sys.stderr)
        sys.exit(1)
    next_num = get_next_slide_number(slides_dir)
    dest = f"slide{next_num}.xml"
    (slides_dir / dest).write_text('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>', encoding="utf-8")
    rels_dir.mkdir(exist_ok=True)
    (rels_dir / f"{dest}.rels").write_text(f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/{layout_file}"/></Relationships>', encoding="utf-8")
    _add_to_content_types(unpacked_dir, dest)
    rid = _add_to_presentation_rels(unpacked_dir, dest)
    next_slide_id = _get_next_slide_id(unpacked_dir)
    print(f"Created {dest} from {layout_file}")
    print(f'Add to presentation.xml <p:sldIdLst>: <p:sldId id="{next_slide_id}" r:id="{rid}"/>')


def duplicate_slide(unpacked_dir, source):
    slides_dir = unpacked_dir / "ppt" / "slides"
    rels_dir = slides_dir / "_rels"
    source_slide = slides_dir / source
    if not source_slide.exists():
        print(f"Error: {source_slide} not found", file=sys.stderr)
        sys.exit(1)
    next_num = get_next_slide_number(slides_dir)
    dest = f"slide{next_num}.xml"
    shutil.copy2(source_slide, slides_dir / dest)
    source_rels = rels_dir / f"{source}.rels"
    if source_rels.exists():
        dest_rels = rels_dir / f"{dest}.rels"
        shutil.copy2(source_rels, dest_rels)
        content = dest_rels.read_text(encoding="utf-8")
        content = re.sub(r'\s*<Relationship[^>]*Type="[^"]*notesSlide"[^>]*/>\s*', "\n", content)
        dest_rels.write_text(content, encoding="utf-8")
    _add_to_content_types(unpacked_dir, dest)
    rid = _add_to_presentation_rels(unpacked_dir, dest)
    next_slide_id = _get_next_slide_id(unpacked_dir)
    print(f"Created {dest} from {source}")
    print(f'Add to presentation.xml <p:sldIdLst>: <p:sldId id="{next_slide_id}" r:id="{rid}"/>')


def _add_to_content_types(unpacked_dir, dest):
    ct = unpacked_dir / "[Content_Types].xml"
    content = ct.read_text(encoding="utf-8")
    if f"/ppt/slides/{dest}" not in content:
        content = content.replace("</Types>", f'  <Override PartName="/ppt/slides/{dest}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n</Types>')
        ct.write_text(content, encoding="utf-8")


def _add_to_presentation_rels(unpacked_dir, dest):
    rels = unpacked_dir / "ppt" / "_rels" / "presentation.xml.rels"
    content = rels.read_text(encoding="utf-8")
    rids = [int(m) for m in re.findall(r'Id="rId(\d+)"', content)]
    rid = f"rId{max(rids) + 1 if rids else 1}"
    if f"slides/{dest}" not in content:
        content = content.replace("</Relationships>", f'  <Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/{dest}"/>\n</Relationships>')
        rels.write_text(content, encoding="utf-8")
    return rid


def _get_next_slide_id(unpacked_dir):
    content = (unpacked_dir / "ppt" / "presentation.xml").read_text(encoding="utf-8")
    ids = [int(m) for m in re.findall(r'<p:sldId[^>]*id="(\d+)"', content)]
    return max(ids) + 1 if ids else 256


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python add_slide.py <unpacked_dir> <source>", file=sys.stderr)
        sys.exit(1)
    unpacked_dir = Path(sys.argv[1])
    source = sys.argv[2]
    if source.startswith("slideLayout") and source.endswith(".xml"):
        create_slide_from_layout(unpacked_dir, source)
    else:
        duplicate_slide(unpacked_dir, source)

"""Remove unreferenced files from an unpacked PPTX directory."""
import re
import sys
from pathlib import Path
import defusedxml.minidom


def get_slides_in_sldidlst(unpacked_dir):
    pres_path = unpacked_dir / "ppt" / "presentation.xml"
    pres_rels_path = unpacked_dir / "ppt" / "_rels" / "presentation.xml.rels"
    if not pres_path.exists() or not pres_rels_path.exists():
        return set()
    rels_dom = defusedxml.minidom.parse(str(pres_rels_path))
    rid_to_slide = {}
    for rel in rels_dom.getElementsByTagName("Relationship"):
        rid = rel.getAttribute("Id")
        target = rel.getAttribute("Target")
        if "slide" in rel.getAttribute("Type") and target.startswith("slides/"):
            rid_to_slide[rid] = target.replace("slides/", "")
    referenced_rids = set(re.findall(r'<p:sldId[^>]*r:id="([^"]+)"', pres_path.read_text(encoding="utf-8")))
    return {rid_to_slide[rid] for rid in referenced_rids if rid in rid_to_slide}


def clean_unused_files(unpacked_dir):
    all_removed = []
    referenced_slides = get_slides_in_sldidlst(unpacked_dir)
    slides_dir = unpacked_dir / "ppt" / "slides"
    if slides_dir.exists():
        for slide_file in slides_dir.glob("slide*.xml"):
            if slide_file.name not in referenced_slides:
                slide_file.unlink()
                all_removed.append(str(slide_file.relative_to(unpacked_dir)))
                rels = slides_dir / "_rels" / f"{slide_file.name}.rels"
                if rels.exists():
                    rels.unlink()
                    all_removed.append(str(rels.relative_to(unpacked_dir)))
    if all_removed:
        ct_path = unpacked_dir / "[Content_Types].xml"
        if ct_path.exists():
            dom = defusedxml.minidom.parse(str(ct_path))
            for override in list(dom.getElementsByTagName("Override")):
                part = override.getAttribute("PartName").lstrip("/")
                if part in all_removed:
                    override.parentNode.removeChild(override)
            ct_path.write_bytes(dom.toxml(encoding="utf-8"))
    return all_removed


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python clean.py <unpacked_dir>", file=sys.stderr)
        sys.exit(1)
    removed = clean_unused_files(Path(sys.argv[1]))
    if removed:
        print(f"Removed {len(removed)} unreferenced files")
    else:
        print("No unreferenced files found")

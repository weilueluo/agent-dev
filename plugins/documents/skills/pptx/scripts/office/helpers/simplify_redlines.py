"""Simplify tracked changes by merging adjacent w:ins or w:del elements."""
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
import defusedxml.minidom

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def simplify_redlines(input_dir):
    doc_xml = Path(input_dir) / "word" / "document.xml"
    if not doc_xml.exists():
        return 0, f"Error: {doc_xml} not found"
    try:
        dom = defusedxml.minidom.parseString(doc_xml.read_text(encoding="utf-8"))
        root = dom.documentElement
        merge_count = 0
        for container in _find_elements(root, "p") + _find_elements(root, "tc"):
            merge_count += _merge_tracked_changes_in(container, "ins")
            merge_count += _merge_tracked_changes_in(container, "del")
        doc_xml.write_bytes(dom.toxml(encoding="UTF-8"))
        return merge_count, f"Simplified {merge_count} tracked changes"
    except Exception as e:
        return 0, f"Error: {e}"


def _merge_tracked_changes_in(container, tag):
    merge_count = 0
    tracked = [c for c in container.childNodes if c.nodeType == c.ELEMENT_NODE and _is_element(c, tag)]
    if len(tracked) < 2:
        return 0
    i = 0
    while i < len(tracked) - 1:
        curr, next_elem = tracked[i], tracked[i + 1]
        if _get_author(curr) == _get_author(next_elem) and _are_adjacent(curr, next_elem):
            while next_elem.firstChild:
                curr.appendChild(next_elem.firstChild)
            container.removeChild(next_elem)
            tracked.pop(i + 1)
            merge_count += 1
        else:
            i += 1
    return merge_count


def _is_element(node, tag):
    name = node.localName or node.tagName
    return name == tag or name.endswith(f":{tag}")


def _get_author(elem):
    author = elem.getAttribute("w:author")
    if not author:
        for attr in elem.attributes.values():
            if attr.localName == "author" or attr.name.endswith(":author"):
                return attr.value
    return author


def _are_adjacent(elem1, elem2):
    node = elem1.nextSibling
    while node and node != elem2:
        if node.nodeType == node.ELEMENT_NODE:
            return False
        if node.nodeType == node.TEXT_NODE and node.data.strip():
            return False
        node = node.nextSibling
    return True


def _find_elements(root, tag):
    results = []
    def traverse(node):
        if node.nodeType == node.ELEMENT_NODE:
            name = node.localName or node.tagName
            if name == tag or name.endswith(f":{tag}"):
                results.append(node)
            for child in node.childNodes:
                traverse(child)
    traverse(root)
    return results


def get_tracked_change_authors(doc_xml_path):
    if not doc_xml_path.exists():
        return {}
    try:
        tree = ET.parse(doc_xml_path)
        root = tree.getroot()
    except ET.ParseError:
        return {}
    author_attr = f"{{{WORD_NS}}}author"
    authors = {}
    for tag in ["ins", "del"]:
        for elem in root.findall(f".//{{*}}{tag}"):
            author = elem.get(author_attr)
            if author:
                authors[author] = authors.get(author, 0) + 1
    return authors


def infer_author(modified_dir, original_docx, default="Claude"):
    modified_authors = get_tracked_change_authors(modified_dir / "word" / "document.xml")
    if not modified_authors:
        return default
    try:
        with zipfile.ZipFile(original_docx, "r") as zf:
            if "word/document.xml" in zf.namelist():
                tree = ET.parse(zf.open("word/document.xml"))
                original_authors = {}
                for tag in ["ins", "del"]:
                    for elem in tree.getroot().findall(f".//{{*}}{tag}"):
                        a = elem.get(f"{{{WORD_NS}}}author")
                        if a:
                            original_authors[a] = original_authors.get(a, 0) + 1
            else:
                original_authors = {}
    except Exception:
        original_authors = {}
    new_changes = {a: c - original_authors.get(a, 0) for a, c in modified_authors.items() if c > original_authors.get(a, 0)}
    if not new_changes:
        return default
    if len(new_changes) == 1:
        return next(iter(new_changes))
    raise ValueError(f"Multiple authors: {new_changes}")

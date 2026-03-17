"""Merge adjacent runs with identical formatting in DOCX."""
from pathlib import Path
import defusedxml.minidom


def merge_runs(input_dir):
    doc_xml = Path(input_dir) / "word" / "document.xml"
    if not doc_xml.exists():
        return 0, f"Error: {doc_xml} not found"
    try:
        dom = defusedxml.minidom.parseString(doc_xml.read_text(encoding="utf-8"))
        root = dom.documentElement
        _remove_elements(root, "proofErr")
        _strip_run_rsid_attrs(root)
        containers = {run.parentNode for run in _find_elements(root, "r")}
        merge_count = sum(_merge_runs_in(c) for c in containers)
        doc_xml.write_bytes(dom.toxml(encoding="UTF-8"))
        return merge_count, f"Merged {merge_count} runs"
    except Exception as e:
        return 0, f"Error: {e}"


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


def _get_child(parent, tag):
    for child in parent.childNodes:
        if child.nodeType == child.ELEMENT_NODE:
            name = child.localName or child.tagName
            if name == tag or name.endswith(f":{tag}"):
                return child
    return None


def _get_children(parent, tag):
    return [child for child in parent.childNodes if child.nodeType == child.ELEMENT_NODE and (child.localName or child.tagName) in (tag, f"w:{tag}")]


def _is_adjacent(elem1, elem2):
    node = elem1.nextSibling
    while node:
        if node == elem2:
            return True
        if node.nodeType == node.ELEMENT_NODE:
            return False
        if node.nodeType == node.TEXT_NODE and node.data.strip():
            return False
        node = node.nextSibling
    return False


def _remove_elements(root, tag):
    for elem in _find_elements(root, tag):
        if elem.parentNode:
            elem.parentNode.removeChild(elem)


def _strip_run_rsid_attrs(root):
    for run in _find_elements(root, "r"):
        for attr in list(run.attributes.values()):
            if "rsid" in attr.name.lower():
                run.removeAttribute(attr.name)


def _merge_runs_in(container):
    merge_count = 0
    run = next((c for c in container.childNodes if c.nodeType == c.ELEMENT_NODE and _is_run(c)), None)
    while run:
        while True:
            next_elem = _next_element_sibling(run)
            if next_elem and _is_run(next_elem) and _can_merge(run, next_elem):
                for child in list(next_elem.childNodes):
                    if child.nodeType == child.ELEMENT_NODE:
                        name = child.localName or child.tagName
                        if name != "rPr" and not name.endswith(":rPr"):
                            run.appendChild(child)
                container.removeChild(next_elem)
                merge_count += 1
            else:
                break
        run = _next_sibling_run(run)
    return merge_count


def _next_element_sibling(node):
    sibling = node.nextSibling
    while sibling:
        if sibling.nodeType == sibling.ELEMENT_NODE:
            return sibling
        sibling = sibling.nextSibling
    return None


def _next_sibling_run(node):
    sibling = node.nextSibling
    while sibling:
        if sibling.nodeType == sibling.ELEMENT_NODE and _is_run(sibling):
            return sibling
        sibling = sibling.nextSibling
    return None


def _is_run(node):
    name = node.localName or node.tagName
    return name == "r" or name.endswith(":r")


def _can_merge(run1, run2):
    rpr1 = _get_child(run1, "rPr")
    rpr2 = _get_child(run2, "rPr")
    if (rpr1 is None) != (rpr2 is None):
        return False
    if rpr1 is None:
        return True
    return rpr1.toxml() == rpr2.toxml()

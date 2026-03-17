"""Base validator with common validation logic for document files."""
import re
from pathlib import Path
import defusedxml.minidom


class BaseSchemaValidator:
    IGNORED_VALIDATION_ERRORS = ["hyphenationZone", "purl.org/dc/terms"]
    UNIQUE_ID_REQUIREMENTS = {}
    ELEMENT_RELATIONSHIP_TYPES = {}
    XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
    OFFICE_RELATIONSHIPS_NAMESPACE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    PACKAGE_RELATIONSHIPS_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/relationships"
    SCHEMA_DIR = Path(__file__).parent.parent / "schemas"

    def __init__(self, unpacked_dir, original_file=None, verbose=False):
        self.unpacked_dir = Path(unpacked_dir)
        self.original_file = Path(original_file) if original_file else None
        self.verbose = verbose
        self.xml_files = list(self.unpacked_dir.rglob("*.xml"))

    def validate(self):
        return self.validate_xml()

    def validate_xml(self):
        errors = []
        for xml_file in self.xml_files:
            try:
                defusedxml.minidom.parseString(xml_file.read_text(encoding="utf-8"))
            except Exception as e:
                errors.append(f"  {xml_file.relative_to(self.unpacked_dir)}: {e}")
        if errors:
            print(f"FAILED - {len(errors)} XML parsing errors:")
            for e in errors:
                print(e)
            return False
        if self.verbose:
            print("PASSED - All XML files parse correctly")
        return True

    def validate_namespaces(self):
        return True

    def validate_unique_ids(self):
        return True

    def validate_file_references(self):
        return True

    def validate_content_types(self):
        return True

    def validate_against_xsd(self):
        return True

    def validate_all_relationship_ids(self):
        return True

    def repair(self):
        repairs = 0
        for xml_file in self.xml_files:
            try:
                content = xml_file.read_text(encoding="utf-8")
                dom = defusedxml.minidom.parseString(content)
                modified = False
                for elem in dom.getElementsByTagName("*"):
                    for tag_name in ["w:t", "a:t"]:
                        if elem.tagName == tag_name and elem.firstChild and elem.firstChild.data:
                            text = elem.firstChild.data
                            if (text.startswith(" ") or text.endswith(" ")) and not elem.hasAttribute("xml:space"):
                                elem.setAttribute("xml:space", "preserve")
                                modified = True
                                repairs += 1
                if modified:
                    xml_file.write_bytes(dom.toxml(encoding="UTF-8"))
            except Exception:
                pass
        return repairs

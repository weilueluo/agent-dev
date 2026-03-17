"""Validator for PowerPoint presentation XML files."""
from .base import BaseSchemaValidator


class PPTXSchemaValidator(BaseSchemaValidator):
    PRESENTATIONML_NAMESPACE = "http://schemas.openxmlformats.org/presentationml/2006/main"

    def validate(self):
        if not self.validate_xml():
            return False
        return True

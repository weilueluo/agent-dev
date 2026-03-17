"""Validator for Word document XML files."""
from .base import BaseSchemaValidator


class DOCXSchemaValidator(BaseSchemaValidator):
    WORD_2006_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

    def validate(self):
        if not self.validate_xml():
            return False
        return True

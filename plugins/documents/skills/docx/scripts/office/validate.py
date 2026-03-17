"""Validate Office document XML files against XSD schemas and tracked changes."""

import argparse
import sys
import tempfile
import zipfile
from pathlib import Path

from validators import DOCXSchemaValidator, PPTXSchemaValidator, RedliningValidator


def main():
    parser = argparse.ArgumentParser(description="Validate Office document XML files")
    parser.add_argument("path")
    parser.add_argument("--original", required=False, default=None)
    parser.add_argument("-v", "--verbose", action="store_true")
    parser.add_argument("--auto-repair", action="store_true")
    parser.add_argument("--author", default="Claude")
    args = parser.parse_args()

    path = Path(args.path)
    assert path.exists(), f"Error: {path} does not exist"

    original_file = None
    if args.original:
        original_file = Path(args.original)
        assert original_file.is_file()

    file_extension = (original_file or path).suffix.lower()

    if path.is_file() and path.suffix.lower() in [".docx", ".pptx", ".xlsx"]:
        temp_dir = tempfile.mkdtemp()
        with zipfile.ZipFile(path, "r") as zf:
            zf.extractall(temp_dir)
        unpacked_dir = Path(temp_dir)
    else:
        unpacked_dir = path

    match file_extension:
        case ".docx":
            validators = [DOCXSchemaValidator(unpacked_dir, original_file, verbose=args.verbose)]
            if original_file:
                validators.append(RedliningValidator(unpacked_dir, original_file, verbose=args.verbose, author=args.author))
        case ".pptx":
            validators = [PPTXSchemaValidator(unpacked_dir, original_file, verbose=args.verbose)]
        case _:
            print(f"Error: Validation not supported for {file_extension}")
            sys.exit(1)

    if args.auto_repair:
        total_repairs = sum(v.repair() for v in validators)
        if total_repairs:
            print(f"Auto-repaired {total_repairs} issue(s)")

    success = all(v.validate() for v in validators)
    if success:
        print("All validations PASSED!")
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

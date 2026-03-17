---
name: xlsx
description: "Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read, edit, or fix an existing .xlsx, .xlsm, .csv, or .tsv file; create a new spreadsheet from scratch or from other data sources; or convert between tabular file formats."
---

# XLSX creation, editing, and analysis

## CRITICAL: Use Formulas, Not Hardcoded Values

Always use Excel formulas instead of calculating values in Python and hardcoding them.

## Common Workflow

1. Choose tool: pandas for data, openpyxl for formulas/formatting
2. Create/Load workbook
3. Modify data, formulas, formatting
4. Save
5. Recalculate formulas: `python scripts/recalc.py output.xlsx`
6. Verify and fix errors

## Creating new Excel files

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active
sheet['A1'] = 'Hello'
sheet['B2'] = '=SUM(A1:A10)'
sheet['A1'].font = Font(bold=True)
wb.save('output.xlsx')
```

## Reading data

```python
import pandas as pd
df = pd.read_excel('file.xlsx')
df.describe()
```

## Financial Models

### Color Coding Standards
- Blue text: Hardcoded inputs
- Black text: Formulas and calculations
- Green text: Cross-sheet links
- Red text: External links
- Yellow background: Key assumptions

### Number Formatting
- Currency: $#,##0
- Percentages: 0.0%
- Negative numbers: Use parentheses (123) not -123

## Best Practices

- Use `data_only=True` to read calculated values
- For large files: Use `read_only=True` or `write_only=True`
- Always run recalc.py after adding formulas

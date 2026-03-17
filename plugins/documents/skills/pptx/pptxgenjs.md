# PptxGenJS Tutorial

## Setup

```javascript
const pptxgen = require("pptxgenjs");
let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
let slide = pres.addSlide();
slide.addText("Hello World!", { x: 0.5, y: 0.5, fontSize: 36, color: "363636" });
pres.writeFile({ fileName: "Presentation.pptx" });
```

## Key Features

- Text & Formatting (rich text arrays, multi-line with breakLine)
- Lists & Bullets (use `bullet: true`, never unicode)
- Shapes (RECTANGLE, OVAL, LINE, ROUNDED_RECTANGLE)
- Images (path, URL, or base64)
- Charts (BAR, LINE, PIE, DOUGHNUT, SCATTER)
- Tables with styling
- Slide Masters

## Common Pitfalls

1. NEVER use "#" with hex colors - causes corruption
2. NEVER encode opacity in hex color strings
3. Use `bullet: true` - never unicode "•"
4. Use `breakLine: true` between text items
5. Avoid `lineSpacing` with bullets
6. Each presentation needs fresh instance
7. NEVER reuse option objects across calls

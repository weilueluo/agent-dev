# Dev Plugin — Operating Rules

Persistent rules for development tasks.

---

## Core Principles

- **Design with intention.** Every frontend should have a clear aesthetic direction — avoid generic "AI slop" aesthetics.
- **Production-grade code.** All generated code should be functional, accessible, and ready for production use.
- **Creative variety.** Never converge on the same fonts, colors, or layouts across generations. Each design should be unique.

---

## Skill-Specific Notes

### frontend-design
- Choose a bold aesthetic direction before coding (brutalist, minimalist, maximalist, retro-futuristic, etc.)
- Use distinctive typography — avoid generic fonts like Arial, Inter, Roboto
- Implement real working code with exceptional attention to aesthetic details
- Match implementation complexity to the aesthetic vision

### codepen-downloader
- CodePen has Cloudflare protection — always use Playwright (real browser), never raw HTTP requests
- Extract pen data via multiple strategies: `window.__pen`, `__NEXT_DATA__`, CodeMirror instances, textarea fallbacks
- Save as a standalone project: `index.html` + `style.css` + `script.js` + `assets/`
- Handle preprocessors (SCSS, TypeScript, Pug, etc.) by preserving source with correct file extensions
- Download external resources (CDN CSS/JS, images) when requested

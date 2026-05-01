# Dev

Development skills — engineering principles, frontend design, CodePen integration, site download, debugging utilities, and Playwright MCP browser automation.

## Engineering Principles

All work follows the engineering principles in `dev:principles`. Read before every task.

## Structure

- `skills/principles` — Core engineering principles for AI-maintained codebases (canonical source)
- `skills/frontend-design` — Production-grade frontend interfaces
- `skills/codepen` — CodePen project downloader
- `skills/site-download` — Recursive website mirror and AI-ingest corpus generator
- `skills/dev-logs` — Dev server log reader and setup assistant
- `skills/browser-logs` — Browser console log capture via Chrome DevTools Protocol
- `.mcp.json` — Registers the Playwright MCP server for browser automation

## Operational Rules

- **Design with intention.** Every frontend should have a clear aesthetic direction — avoid generic "AI slop" aesthetics.
- **Production-grade code.** All generated code should be functional, accessible, and ready for production use.
- **Creative variety.** Never converge on the same fonts, colors, or layouts across generations.
- **CodePen uses Playwright** — never raw HTTP requests (Cloudflare protection).
- **Site download respects boundaries** — obey robots.txt, keep crawls bounded, and never export browser cookies/storage/tokens.
- **Playwright MCP is plugin-owned** — keep the browser automation MCP configuration in `.mcp.json` so installing the dev plugin registers it automatically.

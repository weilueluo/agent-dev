# Dev Plugin

Development skills for building production-grade frontend interfaces, downloading sites for AI ingestion, debugging local development workflows, and registering Playwright MCP browser automation.

## MCP servers

The dev plugin registers Playwright MCP from `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "local",
      "command": "npx",
      "tools": [
        "*"
      ],
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

Node.js 18 or newer is required when the MCP client starts the server.

## Skills

### frontend-design
Create distinctive, production-grade frontend interfaces with high design quality. Generates creative, polished code and UI design that avoids generic AI aesthetics.

**Triggers:** Building web components, pages, applications, landing pages, dashboards, React components, HTML/CSS layouts, or styling/beautifying any web UI.

### site-download
Recursively download a website into an AI-ingest bundle with offline mirror files, static HTML snapshots, Markdown, `corpus.jsonl`, `manifest.json`, `crawl-report.md`, media records, and screenshot records.

**Triggers:** Crawling, mirroring, archiving, scraping docs, downloading pages/assets/images/videos, or converting a URL/site to Markdown or JSONL.

**Modes:** Public mode crawls same-origin pages and downloads referenced cross-origin resources through a robots-aware fetcher. Authenticated mode attaches to an already-running Chrome/Edge CDP session for bounded same-origin page capture and screenshots without exporting browser cookies, storage, tokens, or profile data.

**Validation:**
```powershell
cd plugins\dev\skills\site-download\scripts
npm test
cd ..\..\..\..\..
python tools\validate-skills.py
```

## Installation

From the registered marketplace:

```powershell
copilot plugin install dev@agent-dev
```

Or directly from the GitHub repository subdirectory:

```powershell
copilot plugin install weilueluo/agent-dev:plugins/dev
```

After marketplace metadata changes:

```powershell
copilot plugin marketplace update agent-dev
copilot plugin update dev@agent-dev
```

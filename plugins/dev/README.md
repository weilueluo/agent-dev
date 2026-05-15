# Dev Plugin

Development skills for building production-grade frontend interfaces, downloading sites for AI ingestion, choosing OCR/document-parsing libraries for text extraction, debugging local development workflows, registering Playwright MCP browser automation, and wrapping provider CLIs for multi-project workflows.

## MCP servers and CLIs

The dev plugin registers Playwright and GitHub MCP servers from `.mcp.json`. Supabase, Vercel, and Railway are intentionally handled by provider CLI skills so they load on demand and use persistent CLI authentication.

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
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

Node.js 18 or newer is required when the MCP client starts the local Playwright server. Provider CLI skills keep tokens and project-specific IDs out of repository files unless explicitly requested.

## Skills

### frontend-design
Create distinctive, production-grade frontend interfaces with high design quality. Generates creative, polished code and UI design that avoids generic AI aesthetics.

**Triggers:** Building web components, pages, applications, landing pages, dashboards, React components, HTML/CSS layouts, or styling/beautifying any web UI.

### site-download
Recursively download a website into an AI-ingest bundle with offline mirror files, static HTML snapshots, Markdown, `corpus.jsonl`, `manifest.json`, `crawl-report.md`, media records, and screenshot records.

**Triggers:** Crawling, mirroring, archiving, scraping docs, downloading pages/assets/images/videos, or converting a URL/site to Markdown or JSONL.

**Modes:** Public mode crawls same-origin pages and downloads referenced cross-origin resources through a robots-aware fetcher. Authenticated mode attaches to an already-running Chrome/Edge CDP session for bounded same-origin page capture and screenshots without exporting browser cookies, storage, tokens, or profile data.

### ocr-text-extraction
Choose between Tesseract OCR + pytesseract, EasyOCR, PaddleOCR, docTR, and Docling for OCR/text extraction from images, scanned PDFs, invoices, multilingual documents, and layout-aware document parsing.

**Triggers:** OCR, scanned pages, extracting text from images/screenshots, scanned PDFs, invoices, multilingual OCR, document layout parsing, tables, Markdown/JSON extraction, or RAG-ready document conversion.

### platform-mcp
Compatibility router for platform provider work. Supabase, Vercel, and Railway route to provider-specific CLI skills; GitHub MCP remains out of this migration scope.

**Triggers:** Managing provider projects, deployments, repositories, environments, variables, logs, domains, database schema, migrations, or provider docs.

### supabase-cli
Supabase CLI workflows for local stack management, linked project operations, database migrations, generated types, Edge Functions, logs, and Supabase docs.

### vercel-cli
Vercel CLI workflows for projects, teams, deployments, domains, environment variables, logs, builds, and Vercel docs.

### railway-cli
Railway CLI workflows for workspaces, projects, services, environments, variables, deployments, domains, logs, metrics, and Railway docs.

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

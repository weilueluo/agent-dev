import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { runSiteDownload } from '../src/crawler.mjs';
import { assertCorpusRecordShape, assertManifestShape } from '../src/artifact-schema.mjs';

test('public crawl produces AI-ingest artifacts with robots, limits, and cross-origin resources', async (t) => {
  let assetBase;
  const assetServer = await startServer((req, res) => {
    if (req.url === '/robots.txt') return send(res, 200, 'text/plain', 'User-agent: *\nDisallow: /blocked.png\n');
    if (req.url === '/image.png') return send(res, 200, 'image/png', Buffer.from('png-image'));
    if (req.url === '/blocked.png') return send(res, 200, 'image/png', Buffer.from('blocked'));
    if (req.url === '/outside.html') return send(res, 200, 'text/html', '<h1>outside</h1>');
    return send(res, 404, 'text/plain', 'missing');
  });
  t.after(() => assetServer.close());
  assetBase = assetServer.url;

  const pageServer = await startServer((req, res) => {
    if (req.url === '/robots.txt') return send(res, 200, 'text/plain', 'User-agent: *\nDisallow: /private\n');
    if (req.url === '/' || req.url === '/index.html') {
      return send(res, 200, 'text/html', `<!doctype html>
        <title>Fixture Home</title>
        <h1>Home</h1>
        <a href="/page?b=2&a=1#one">Page One</a>
        <a href="/page?a=1&b=2#two">Page duplicate</a>
        <a href="/private">Private</a>
        <a href="${assetBase}/outside.html">Outside page</a>
        <link rel="stylesheet" href="/style.css">
        <img src="${assetBase}/image.png" alt="cross image">
        <img src="${assetBase}/blocked.png" alt="blocked image">
        <video src="/movie.mp4"></video>`);
    }
    if (req.url?.startsWith('/page')) {
      return send(res, 200, 'text/html', '<title>Page</title><h2>Page</h2><p>Hello fixture</p><a href="/">cycle</a>');
    }
    if (req.url === '/private') return send(res, 200, 'text/html', '<h1>secret</h1>');
    if (req.url === '/style.css') return send(res, 200, 'text/css', 'body { background: url("/nested.png"); }');
    if (req.url === '/nested.png') return send(res, 200, 'image/png', Buffer.from('nested'));
    if (req.url === '/movie.mp4') return send(res, 200, 'video/mp4', Buffer.from('movie'));
    return send(res, 404, 'text/plain', 'missing');
  });
  t.after(() => pageServer.close());

  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'site-download-'));
  const result = await runSiteDownload({
    url: `${pageServer.url}/index.html`,
    out,
    limits: { maxPages: 10, maxDepth: 3, maxAssets: 20, maxMedia: 10, maxTotalBytes: 1000000 },
    mode: 'public'
  });

  for (const required of ['mirror', 'rendered-html', 'markdown', 'screenshots', 'media', 'corpus.jsonl', 'manifest.json', 'crawl-report.md']) {
    await fs.stat(path.join(out, required));
  }

  const manifest = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
  assertManifestShape(manifest);
  assert.equal(manifest.mode, 'public');
  assert.equal(manifest.privacy.mayContainPrivatePageContent, false);
  assert.equal(manifest.privacy.explicitCookiesExported, false);
  assert.ok(manifest.pages.length >= 2);
  assert.ok(manifest.assets.some((asset) => asset.url === `${assetBase}/image.png` && asset.status === 'downloaded'));
  assert.ok(manifest.assets.some((asset) => asset.url === `${assetBase}/blocked.png` && asset.skippedReason === 'robots_disallowed'));
  assert.ok(manifest.media.some((media) => media.url.endsWith('/movie.mp4') && media.status === 'downloaded'));
  assert.ok(manifest.skips.some((skip) => skip.reason === 'robots_disallowed' && skip.url.endsWith('/private')));
  assert.ok(manifest.skips.some((skip) => skip.reason === 'cross_origin_page' && skip.url.endsWith('/outside.html')));
  assert.ok(manifest.skips.some((skip) => skip.reason === 'duplicate_url'));
  assert.ok(manifest.pages.every((page) => page.screenshotSkippedReason === 'cdp_not_enabled'));

  const lines = (await fs.readFile(path.join(out, 'corpus.jsonl'), 'utf8')).trim().split('\n');
  assert.ok(lines.length >= 2);
  for (const line of lines) {
    assertCorpusRecordShape(JSON.parse(line));
  }

  const report = await fs.readFile(path.join(out, 'crawl-report.md'), 'utf8');
  for (const heading of ['## Summary', '## Limits', '## Pages', '## Assets and Media', '## Robots', '## Skips', '## Errors', '## Output Paths']) {
    assert.match(report, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('crawler reports query explosion through max URLs per page', async (t) => {
  const server = await startServer((req, res) => {
    if (req.url === '/robots.txt') return send(res, 404, 'text/plain', 'missing');
    const links = Array.from({ length: 5 }, (_, index) => `<a href="/page?x=${index}">p${index}</a>`).join('');
    return send(res, 200, 'text/html', `<title>Many</title>${links}`);
  });
  t.after(() => server.close());

  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'site-download-limit-'));
  const result = await runSiteDownload({
    url: `${server.url}/`,
    out,
    limits: { maxPages: 2, maxUrlsPerPage: 2, maxTotalBytes: 1000000 },
    mode: 'public'
  });
  const manifest = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
  assert.ok(manifest.skips.some((skip) => skip.reason === 'max_urls_per_page'));
});

function startServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.url = `http://127.0.0.1:${address.port}`;
      resolve(server);
    });
  });
}

function send(res, status, contentType, body) {
  res.writeHead(status, { 'content-type': contentType });
  res.end(body);
}

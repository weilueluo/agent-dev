import fs from 'node:fs/promises';
import path from 'node:path';
import { CORPUS_SCHEMA_VERSION, MANIFEST_SCHEMA_VERSION } from './artifact-schema.mjs';
import { htmlToMarkdown, markdownText } from './html-to-markdown.mjs';
import { contentHash, localPathForUrl } from './path-map.mjs';
import { privacyRecord, redactObject, redactText } from './redaction.mjs';

export async function createOutputRoot(outputRoot) {
  for (const dir of ['mirror', 'rendered-html', 'markdown', 'screenshots', 'media']) {
    await fs.mkdir(path.join(outputRoot, dir), { recursive: true });
  }
}

export function createManifest({ mode, startUrl, outputRoot, limits }) {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    mode,
    startUrl,
    outputRoot,
    limits,
    counts: {
      pages: 0,
      assets: 0,
      media: 0,
      skips: 0,
      errors: 0,
      screenshots: 0
    },
    pages: [],
    assets: [],
    media: [],
    robots: { origins: [], allowed: 0, disallowed: 0, missing: 0, errors: 0 },
    skips: [],
    errors: [],
    privacy: privacyRecord(mode),
    toolVersions: { node: process.version }
  };
}

export async function writePageArtifacts(outputRoot, page, mode) {
  const mirror = localPathForUrl(page.finalUrl, outputRoot, 'mirror', '.html');
  const staticHtml = localPathForUrl(page.finalUrl, outputRoot, 'rendered-html', '.html');
  const markdownPath = localPathForUrl(page.finalUrl, outputRoot, 'markdown', '.md');
  await fs.mkdir(path.dirname(mirror.absolute), { recursive: true });
  await fs.mkdir(path.dirname(staticHtml.absolute), { recursive: true });
  await fs.mkdir(path.dirname(markdownPath.absolute), { recursive: true });
  await fs.writeFile(mirror.absolute, page.html);
  await fs.writeFile(staticHtml.absolute, page.html);
  const markdown = htmlToMarkdown(page.html, page.finalUrl);
  await fs.writeFile(markdownPath.absolute, markdown);
  const hash = contentHash(page.html);
  return {
    localPaths: {
      mirror: mirror.relative,
      staticHtml: staticHtml.relative,
      markdown: markdownPath.relative,
      browserRenderedHtml: null,
      screenshot: null
    },
    corpus: {
      schemaVersion: CORPUS_SCHEMA_VERSION,
      type: 'page',
      url: page.url,
      normalizedUrl: page.normalizedUrl,
      title: page.title,
      text: markdownText(markdown),
      markdownPath: markdownPath.relative,
      staticHtmlPath: staticHtml.relative,
      browserRenderedHtmlPath: null,
      screenshotPath: null,
      depth: page.depth,
      fetchedAt: new Date().toISOString(),
      contentHash: hash,
      sourceMode: mode === 'auth-cdp' ? 'cdp' : 'static',
      metadata: {
        contentType: page.contentType,
        status: page.status,
        skippedScreenshot: mode === 'auth-cdp' ? null : 'cdp_not_enabled'
      }
    }
  };
}

export async function writeResource(outputRoot, url, body, section, fallbackExt = '') {
  const local = localPathForUrl(url, outputRoot, section, fallbackExt);
  await fs.mkdir(path.dirname(local.absolute), { recursive: true });
  await fs.writeFile(local.absolute, body);
  return local.relative;
}

export async function writeFinalArtifacts(outputRoot, manifest, corpusRecords) {
  manifest.counts.pages = manifest.pages.filter((p) => !p.skippedReason).length;
  manifest.counts.assets = manifest.assets.filter((a) => a.status === 'downloaded').length;
  manifest.counts.media = manifest.media.filter((m) => m.status === 'downloaded' || m.status === 'suggested').length;
  manifest.counts.skips = manifest.skips.length;
  manifest.counts.errors = manifest.errors.length;
  manifest.errors = redactObject(manifest.errors);
  await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(outputRoot, 'corpus.jsonl'), `${corpusRecords.map((record) => JSON.stringify(record)).join('\n')}\n`);
  await fs.writeFile(path.join(outputRoot, 'crawl-report.md'), buildReport(manifest));
}

export function addSkip(manifest, url, reason, phase, details = {}) {
  manifest.skips.push(redactObject({ url, reason, phase, ...details, timestamp: new Date().toISOString() }));
}

export function addError(manifest, code, message, phase, url = null, retriable = false) {
  manifest.errors.push({
    code,
    message: redactText(message),
    url,
    phase,
    retriable,
    timestamp: new Date().toISOString()
  });
}

export function buildReport(manifest) {
  const lines = [
    '# Crawl Report',
    '',
    '## Summary',
    '',
    `- Mode: ${manifest.mode}`,
    `- Start URL: ${manifest.startUrl}`,
    `- Pages: ${manifest.counts.pages}`,
    `- Assets: ${manifest.counts.assets}`,
    `- Media: ${manifest.counts.media}`,
    `- Skips: ${manifest.counts.skips}`,
    `- Errors: ${manifest.counts.errors}`,
    '',
    '## Limits',
    '',
    ...Object.entries(manifest.limits).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Pages',
    '',
    ...manifest.pages.map((page) => `- ${page.status || page.skippedReason}: ${page.url}`),
    '',
    '## Assets and Media',
    '',
    `- Assets recorded: ${manifest.assets.length}`,
    `- Media recorded: ${manifest.media.length}`,
    '',
    '## Robots',
    '',
    `- Allowed decisions: ${manifest.robots.allowed}`,
    `- Disallowed decisions: ${manifest.robots.disallowed}`,
    `- Origins: ${manifest.robots.origins.length}`,
    '',
    '## Skips',
    '',
    ...(manifest.skips.length ? manifest.skips.map((skip) => `- ${skip.reason}: ${skip.url}`) : ['- none']),
    '',
    '## Errors',
    '',
    ...(manifest.errors.length ? manifest.errors.map((error) => `- ${error.code}: ${error.message}`) : ['- none']),
    ''
  ];
  if (manifest.privacy.mayContainPrivatePageContent) {
    lines.push('## Auth Privacy Warning', '', 'Authenticated page artifacts may contain private page content. Cookies, browser storage, and profile data are not explicitly exported by this tool.', '');
  }
  lines.push('## Output Paths', '', `- Output root: ${manifest.outputRoot}`, '- mirror/', '- rendered-html/', '- markdown/', '- screenshots/', '- media/', '- corpus.jsonl', '- manifest.json');
  return `${lines.join('\n')}\n`;
}

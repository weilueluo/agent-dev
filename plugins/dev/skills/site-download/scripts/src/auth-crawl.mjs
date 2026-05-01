import fs from 'node:fs/promises';
import path from 'node:path';
import { createManifest, createOutputRoot, addError, addSkip, writeFinalArtifacts, writePageArtifacts } from './artifacts.mjs';
import { DEFAULT_LIMITS } from './config.mjs';
import { connectPageCdpClient } from './cdp-client.mjs';
import { extractHtmlReferences } from './html-extract.mjs';
import { localPathForUrl } from './path-map.mjs';
import { RUNTIME_EXPRESSIONS, shouldSkipAuthNavigation } from './auth-policy.mjs';
import { normalizeUrl, urlKey } from './url-normalize.mjs';

export async function runAuthCrawl({ url, out, authCdpUrl, limits = {}, cdpClientFactory = null }) {
  if (!authCdpUrl && !cdpClientFactory) {
    throw new Error('Auth CDP mode requires --auth-cdp-url or a test CDP client factory');
  }
  const effectiveLimits = { ...DEFAULT_LIMITS, ...limits };
  const outputRoot = path.resolve(out);
  const startUrl = normalizeUrl(url);
  const startSafety = shouldSkipAuthNavigation(startUrl, startUrl);
  if (startSafety.skip) {
    throw new Error(`Refusing unsafe auth start URL: ${startSafety.reason}`);
  }
  await createOutputRoot(outputRoot);
  const manifest = createManifest({ mode: 'auth-cdp', startUrl, outputRoot, limits: effectiveLimits });
  const corpusRecords = [];
  const deadline = Date.now() + effectiveLimits.maxRuntimeSeconds * 1000;
  const visited = new Set();
  const queued = new Set([urlKey(startUrl)]);
  const queue = [{ url: startUrl, depth: 0 }];
  let screenshots = 0;
  const client = cdpClientFactory
    ? await cdpClientFactory(startUrl)
    : await connectPageCdpClient(authCdpUrl);

  await sendCdp(client, 'Page.enable', {}, deadline);

  while (queue.length && visited.size < effectiveLimits.maxPages) {
    if (Date.now() > deadline) {
      addSkip(manifest, queue[0].url, 'max_runtime_seconds', 'auth-page');
      break;
    }
    const item = queue.shift();
    const safety = shouldSkipAuthNavigation(item.url, startUrl);
    if (safety.skip) {
      addSkip(manifest, item.url, safety.reason, 'auth-page');
      continue;
    }
    if (item.depth > effectiveLimits.maxDepth) {
      addSkip(manifest, item.url, 'max_depth', 'auth-page', { depth: item.depth });
      continue;
    }
    const key = urlKey(item.url);
    if (visited.has(key)) {
      addSkip(manifest, item.url, 'duplicate_url', 'auth-page');
      continue;
    }
    visited.add(key);

    try {
      await sendCdp(client, 'Page.navigate', { url: item.url }, deadline);
      await delay(250);
      const [html, title, location] = await Promise.all([
        evaluateValue(client, RUNTIME_EXPRESSIONS.OUTER_HTML, deadline),
        evaluateValue(client, RUNTIME_EXPRESSIONS.TITLE, deadline),
        evaluateValue(client, RUNTIME_EXPRESSIONS.LOCATION, deadline)
      ]);
      const finalUrl = normalizeUrl(location || item.url);
      const page = {
        url: item.url,
        finalUrl,
        normalizedUrl: key,
        status: 200,
        depth: item.depth,
        contentType: 'text/html; cdp=rendered',
        bytes: Buffer.byteLength(html || '', 'utf8'),
        title: title || finalUrl,
        html: html || ''
      };
      const artifacts = await writePageArtifacts(outputRoot, page, 'auth-cdp');
      artifacts.corpus.browserRenderedHtmlPath = artifacts.corpus.staticHtmlPath;
      let screenshotPath = null;
      let screenshotSkippedReason = null;
      if (screenshots < effectiveLimits.maxScreenshots) {
        const shot = await sendCdp(client, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, deadline);
        if (shot.data) {
          const local = localPathForUrl(finalUrl, outputRoot, 'screenshots', '.png');
          await fs.mkdir(path.dirname(local.absolute), { recursive: true });
          await fs.writeFile(local.absolute, Buffer.from(shot.data, 'base64'));
          screenshotPath = local.relative;
          screenshots += 1;
          manifest.counts.screenshots = screenshots;
          artifacts.corpus.screenshotPath = screenshotPath;
        }
      } else {
        screenshotSkippedReason = 'max_screenshots';
        addSkip(manifest, item.url, screenshotSkippedReason, 'screenshot');
      }
      corpusRecords.push(artifacts.corpus);
      manifest.pages.push({
        url: item.url,
        normalizedUrl: key,
        status: 200,
        depth: item.depth,
        contentType: page.contentType,
        bytes: page.bytes,
        title: page.title,
        localPaths: { ...artifacts.localPaths, browserRenderedHtml: artifacts.localPaths.staticHtml, screenshot: screenshotPath },
        outgoingLinksCount: 0,
        assets: [],
        media: [],
        skippedReason: null,
        screenshotSkippedReason,
        errors: []
      });
      const refs = extractHtmlReferences(html || '', finalUrl);
      for (const candidate of refs.pages.slice(0, effectiveLimits.maxUrlsPerPage)) {
        const authSafety = shouldSkipAuthNavigation(candidate, startUrl);
        if (authSafety.skip) {
          addSkip(manifest, candidate, authSafety.reason, 'auth-page');
          continue;
        }
        const candidateKey = urlKey(authSafety.url);
        if (!visited.has(candidateKey) && !queued.has(candidateKey)) {
          queued.add(candidateKey);
          queue.push({ url: authSafety.url, depth: item.depth + 1 });
        }
      }
    } catch (err) {
      addError(manifest, 'auth_cdp_error', err.message, 'auth-page', item.url, true);
    }
  }

  await writeFinalArtifacts(outputRoot, manifest, corpusRecords);
  return {
    outputRoot,
    manifestPath: path.join(outputRoot, 'manifest.json'),
    reportPath: path.join(outputRoot, 'crawl-report.md'),
    counts: manifest.counts
  };
}

async function evaluateValue(client, expression, deadline) {
  const result = await sendCdp(client, 'Runtime.evaluate', { expression, returnByValue: true }, deadline);
  return result?.result?.value ?? '';
}

function sendCdp(client, method, params, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('max_runtime_seconds');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('max_runtime_seconds')), remaining);
    client.send(method, params).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

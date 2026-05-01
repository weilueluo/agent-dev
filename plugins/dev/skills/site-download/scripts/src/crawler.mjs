import path from 'node:path';
import { createManifest, createOutputRoot, addError, addSkip, writeFinalArtifacts, writePageArtifacts, writeResource } from './artifacts.mjs';
import { DEFAULT_LIMITS } from './config.mjs';
import { fetchBuffer } from './fetcher.mjs';
import { extractCssUrls, extractHtmlReferences } from './html-extract.mjs';
import { mediaSuggestion } from './media.mjs';
import { RobotsCache } from './robots.mjs';
import { isDirectMediaUrl, isProbablyHtmlUrl, isSameOrigin, normalizeUrl, urlKey } from './url-normalize.mjs';

export async function runSiteDownload({ url, out, limits = {}, mode = 'public' }) {
  const effectiveLimits = { ...DEFAULT_LIMITS, ...limits };
  const outputRoot = path.resolve(out);
  const startUrl = normalizeUrl(url);
  await createOutputRoot(outputRoot);
  const manifest = createManifest({ mode, startUrl, outputRoot, limits: effectiveLimits });
  const corpusRecords = [];
  const started = Date.now();
  let totalBytes = 0;
  const visitedPages = new Set();
  const queuedKeys = new Set([urlKey(startUrl)]);
  const resourceKeys = new Set();
  const queue = [{ url: startUrl, depth: 0 }];
  const robots = new RobotsCache((origin) => fetchRobots(origin, effectiveLimits));

  async function robotsDecision(targetUrl) {
    const decision = await robots.decision(targetUrl);
    if (decision.allowed) manifest.robots.allowed += 1;
    else manifest.robots.disallowed += 1;
    return decision;
  }

  while (queue.length > 0) {
    if (Date.now() - started > effectiveLimits.maxRuntimeSeconds * 1000) {
      addSkip(manifest, queue[0].url, 'max_runtime_seconds', 'page');
      break;
    }
    if (visitedPages.size >= effectiveLimits.maxPages) {
      addSkip(manifest, queue[0].url, 'max_pages', 'page');
      break;
    }
    const item = queue.shift();
    if (item.depth > effectiveLimits.maxDepth) {
      addSkip(manifest, item.url, 'max_depth', 'page', { depth: item.depth });
      continue;
    }
    if (!isSameOrigin(item.url, startUrl)) {
      addSkip(manifest, item.url, 'cross_origin_page', 'page');
      continue;
    }
    const key = urlKey(item.url);
    if (visitedPages.has(key)) {
      addSkip(manifest, item.url, 'duplicate_url', 'page');
      continue;
    }
    visitedPages.add(key);

    const fetched = await fetchWithRobots(item.url, effectiveLimits, robotsDecision, effectiveLimits.maxTotalBytes - totalBytes);
    if (fetched.skipped) {
      addSkip(manifest, item.url, fetched.skippedReason, 'page');
      manifest.pages.push({
        url: item.url,
        normalizedUrl: key,
        skippedReason: fetched.skippedReason,
        depth: item.depth,
        screenshotSkippedReason: mode === 'auth-cdp' ? null : 'cdp_not_enabled'
      });
      continue;
    }
    if (fetched.error) {
      addError(manifest, fetched.error, fetched.error, 'page', item.url, true);
      continue;
    }
    totalBytes += fetched.bytes;
    const contentType = fetched.contentType;
    const html = fetched.body.toString('utf8');
    const refs = extractHtmlReferences(html, fetched.finalUrl);
    const page = {
      url: item.url,
      finalUrl: normalizeUrl(fetched.finalUrl),
      normalizedUrl: key,
      status: fetched.status,
      depth: item.depth,
      contentType,
      bytes: fetched.bytes,
      title: refs.title || new URL(fetched.finalUrl).pathname || fetched.finalUrl,
      html
    };
    const artifacts = await writePageArtifacts(outputRoot, page, mode);
    corpusRecords.push(artifacts.corpus);
    manifest.pages.push({
      url: item.url,
      normalizedUrl: key,
      status: fetched.status,
      depth: item.depth,
      contentType,
      bytes: fetched.bytes,
      title: page.title,
      localPaths: artifacts.localPaths,
      outgoingLinksCount: refs.pages.length,
      assets: [],
      media: [],
      skippedReason: null,
      screenshotSkippedReason: mode === 'auth-cdp' ? null : 'cdp_not_enabled',
      errors: []
    });

    enqueuePages(refs.pages.slice(0, effectiveLimits.maxUrlsPerPage), item.depth + 1);
    if (refs.pages.length > effectiveLimits.maxUrlsPerPage) {
      addSkip(manifest, item.url, 'max_urls_per_page', 'page', { discovered: refs.pages.length });
    }
    for (const assetUrl of refs.assets) {
      totalBytes += await downloadResource(assetUrl, 'asset', item.url, resourceKeys, manifest, outputRoot, effectiveLimits, robotsDecision, totalBytes);
      if (String(assetUrl).toLowerCase().includes('.css')) {
        const assetRecord = manifest.assets.find((asset) => asset.url === assetUrl && asset.localPath);
        if (assetRecord?.bodyText) {
          for (const nested of extractCssUrls(assetRecord.bodyText, assetUrl)) {
            totalBytes += await downloadResource(nested, 'asset', assetUrl, resourceKeys, manifest, outputRoot, effectiveLimits, robotsDecision, totalBytes);
          }
          delete assetRecord.bodyText;
        }
      }
    }
    for (const mediaUrl of refs.media) {
      totalBytes += await downloadResource(mediaUrl, 'media', item.url, resourceKeys, manifest, outputRoot, effectiveLimits, robotsDecision, totalBytes);
    }
  }

  manifest.robots.origins = robots.summary();
  manifest.robots.missing = manifest.robots.origins.filter((origin) => origin.status === 'missing').length;
  manifest.robots.errors = manifest.robots.origins.filter((origin) => origin.status === 'error').length;
  await writeFinalArtifacts(outputRoot, manifest, corpusRecords);
  return { outputRoot, manifestPath: path.join(outputRoot, 'manifest.json'), reportPath: path.join(outputRoot, 'crawl-report.md'), counts: manifest.counts };

  function enqueuePages(urls, depth) {
    for (const candidate of urls) {
      if (candidate.length > effectiveLimits.maxUrlLength) {
        addSkip(manifest, candidate, 'max_url_length', 'page');
        continue;
      }
      if (!isSameOrigin(candidate, startUrl)) {
        addSkip(manifest, candidate, 'cross_origin_page', 'page');
        continue;
      }
      if (!isProbablyHtmlUrl(candidate)) continue;
      const candidateKey = urlKey(candidate);
      if (visitedPages.has(candidateKey) || queuedKeys.has(candidateKey)) {
        addSkip(manifest, candidate, 'duplicate_url', 'page');
        continue;
      }
      queuedKeys.add(candidateKey);
      queue.push({ url: candidate, depth });
    }
  }
}

async function downloadResource(url, kind, sourcePage, resourceKeys, manifest, outputRoot, limits, robotsDecision, totalBytes) {
  const key = urlKey(url);
  if (resourceKeys.has(key)) {
    addSkip(manifest, url, 'duplicate_url', kind);
    return 0;
  }
  resourceKeys.add(key);
  if (url.length > limits.maxUrlLength) {
    recordResource(manifest, kind, { url, status: 'skipped', sourcePage, skippedReason: 'max_url_length' });
    addSkip(manifest, url, 'max_url_length', kind);
    return 0;
  }
  if (kind === 'asset' && manifest.assets.length >= limits.maxAssets) {
    recordResource(manifest, kind, { url, status: 'skipped', sourcePage, skippedReason: 'max_assets' });
    addSkip(manifest, url, 'max_assets', kind);
    return 0;
  }
  if (kind === 'media' && manifest.media.length >= limits.maxMedia) {
    recordResource(manifest, kind, { url, status: 'skipped', sourcePage, skippedReason: 'max_media' });
    addSkip(manifest, url, 'max_media', kind);
    return 0;
  }
  if (kind === 'media' && !isDirectMediaUrl(url)) {
    const decision = await robotsDecision(url);
    if (!decision.allowed) {
      recordResource(manifest, kind, { url, status: 'skipped', sourcePage, robotsAllowed: false, skippedReason: 'robots_disallowed' });
      addSkip(manifest, url, 'robots_disallowed', kind);
      return 0;
    }
    recordResource(manifest, kind, {
      url,
      status: 'suggested',
      sourcePage,
      robotsAllowed: true,
      downloader: mediaSuggestion(url, path.join(outputRoot, 'media'))
    });
    return 0;
  }
  const fetched = await fetchWithRobots(url, limits, robotsDecision, limits.maxTotalBytes - totalBytes);
  if (fetched.skipped) {
    recordResource(manifest, kind, { url, status: 'skipped', sourcePage, robotsAllowed: false, skippedReason: fetched.skippedReason });
    addSkip(manifest, url, fetched.skippedReason, kind);
    return 0;
  }
  if (fetched.error) {
    recordResource(manifest, kind, { url, status: 'failed', sourcePage, errors: [{ code: fetched.error, message: fetched.error }] });
    addError(manifest, fetched.error, fetched.error, kind, url, true);
    return 0;
  }
  const section = kind === 'media' ? 'media' : 'mirror';
  const localPath = await writeResource(outputRoot, fetched.finalUrl, fetched.body, section);
  const record = {
    url,
    normalizedUrl: key,
    origin: new URL(url).origin,
    kind,
    status: 'downloaded',
    contentType: fetched.contentType,
    bytes: fetched.bytes,
    localPath,
    sourcePage,
    robotsAllowed: true,
    skippedReason: null,
    downloader: null,
    errors: []
  };
  if (kind === 'asset' && /text\/css/i.test(fetched.contentType)) {
    record.bodyText = fetched.body.toString('utf8');
  }
  recordResource(manifest, kind, record);
  return fetched.bytes;
}

function recordResource(manifest, kind, record) {
  if (kind === 'media') manifest.media.push(record);
  else manifest.assets.push(record);
}

async function fetchWithRobots(url, limits, robotsDecision, maxBytes) {
  return fetchBuffer(url, {
    maxRedirects: limits.maxRedirects,
    maxBytes: Math.max(0, maxBytes),
    beforeFetch: robotsDecision
  }).catch((err) => ({ error: err.message, url }));
}

async function fetchRobots(origin, limits) {
  const robotsUrl = new URL('/robots.txt', origin).href;
  const response = await fetchBuffer(robotsUrl, { maxRedirects: limits.maxRedirects, maxBytes: 65536 });
  return {
    status: response.status || 0,
    text: response.body ? response.body.toString('utf8') : ''
  };
}

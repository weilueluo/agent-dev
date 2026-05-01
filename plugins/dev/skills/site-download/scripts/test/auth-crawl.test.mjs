import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runAuthCrawl } from '../src/auth-crawl.mjs';
import { RUNTIME_EXPRESSIONS } from '../src/auth-policy.mjs';

test('auth crawl uses allowed CDP methods, writes screenshots, and labels private content risk', async () => {
  const calls = [];
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'site-download-auth-'));
  const html = `<!doctype html>
    <title>Private Docs</title>
    <h1>Private Docs</h1>
    <a href="/next">Next</a>
    <a href="/logout">Logout</a>
    <a href="https://other.example.com/private">Other</a>`;

  const result = await runAuthCrawl({
    url: 'https://private.example.com/docs',
    out,
    limits: { maxPages: 2, maxDepth: 1, maxScreenshots: 1 },
    cdpClientFactory: async () => ({
      async send(method, params = {}) {
        calls.push({ method, params });
        if (method === 'Runtime.evaluate' && params.expression === RUNTIME_EXPRESSIONS.OUTER_HTML) {
          return { result: { value: html } };
        }
        if (method === 'Runtime.evaluate' && params.expression === RUNTIME_EXPRESSIONS.TITLE) {
          return { result: { value: 'Private Docs' } };
        }
        if (method === 'Runtime.evaluate' && params.expression === RUNTIME_EXPRESSIONS.LOCATION) {
          return { result: { value: 'https://private.example.com/docs' } };
        }
        if (method === 'Page.captureScreenshot') {
          return { data: Buffer.from('png').toString('base64') };
        }
        return {};
      }
    })
  });

  const manifest = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
  assert.equal(manifest.mode, 'auth-cdp');
  assert.equal(manifest.privacy.mayContainPrivatePageContent, true);
  assert.equal(manifest.privacy.explicitCookiesExported, false);
  assert.equal(manifest.privacy.secretScan, 'not_performed');
  assert.equal(manifest.counts.screenshots, 1);
  assert.ok(manifest.pages[0].localPaths.screenshot.endsWith('.png'));
  assert.ok(manifest.skips.some((skip) => skip.reason === 'skipped_destructive_url'));
  assert.ok(manifest.skips.some((skip) => skip.reason === 'cross_origin_page'));

  const methods = calls.map((call) => call.method);
  assert.ok(methods.includes('Page.navigate'));
  assert.ok(methods.includes('Page.captureScreenshot'));
  assert.equal(methods.some((method) => method.startsWith('Input.')), false);
  assert.equal(methods.includes('Network.getCookies'), false);
  assert.equal(calls.some((call) => String(call.params.expression || '').includes('document.cookie')), false);
});

test('auth crawl rejects destructive start URL before creating a CDP client', async () => {
  let factoryCalled = false;
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'site-download-auth-reject-'));

  await assert.rejects(() => runAuthCrawl({
    url: 'https://private.example.com/logout',
    out,
    authCdpUrl: 'http://localhost:9222',
    cdpClientFactory: async () => {
      factoryCalled = true;
      return { async send() { return {}; } };
    }
  }), /Refusing unsafe auth start URL/);

  assert.equal(factoryCalled, false);
});

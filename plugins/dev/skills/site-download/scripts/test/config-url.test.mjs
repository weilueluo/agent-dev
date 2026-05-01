import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIMITS, parseCliArgs } from '../src/config.mjs';
import { normalizeUrl, safeFilenameSegment, urlKey } from '../src/url-normalize.mjs';

test('CLI parser applies bounded defaults and overrides', () => {
  const parsed = parseCliArgs([
    'https://Example.com/docs#top',
    '--out',
    'out',
    '--max-pages',
    '7',
    '--max-depth',
    '2',
    '--max-total-bytes',
    '1234',
    '--json'
  ]);

  assert.equal(parsed.url, 'https://Example.com/docs#top');
  assert.equal(parsed.out, 'out');
  assert.equal(parsed.json, true);
  assert.equal(parsed.mode, 'public');
  assert.equal(parsed.limits.maxPages, 7);
  assert.equal(parsed.limits.maxDepth, 2);
  assert.equal(parsed.limits.maxTotalBytes, 1234);
  assert.equal(parsed.limits.maxAssets, DEFAULT_LIMITS.maxAssets);
});

test('URL normalization removes fragments, sorts query parameters, and suppresses simple duplicates', () => {
  const first = normalizeUrl('HTTPS://Example.COM:443/docs/page/?b=2&a=1#section');
  const second = normalizeUrl('https://example.com/docs/page?a=1&b=2');

  assert.equal(first, 'https://example.com/docs/page?a=1&b=2');
  assert.equal(first, second);
  assert.equal(urlKey(first), urlKey(second));
});

test('Windows-safe filename segments remove invalid and reserved names', () => {
  assert.equal(safeFilenameSegment('a<b>c:d"e/f\\g|h?i*j'), 'a-b-c-d-e-f-g-h-i-j');
  assert.equal(safeFilenameSegment('CON'), '_CON');
  assert.equal(safeFilenameSegment('name. '), 'name');
});

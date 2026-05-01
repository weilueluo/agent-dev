import test from 'node:test';
import assert from 'node:assert/strict';
import { RobotsCache, RobotsPolicy } from '../src/robots.mjs';

test('robots parser applies longest Allow/Disallow match', () => {
  const policy = new RobotsPolicy(`
User-agent: *
Disallow: /private
Allow: /private/public
`);

  assert.equal(policy.isAllowed('https://example.com/index.html'), true);
  assert.equal(policy.isAllowed('https://example.com/private/secret.html'), false);
  assert.equal(policy.isAllowed('https://example.com/private/public/page.html'), true);
});

test('robots cache fetches once per origin', async () => {
  const calls = [];
  const cache = new RobotsCache(async (origin) => {
    calls.push(origin);
    return { status: 200, text: 'User-agent: *\nDisallow: /blocked' };
  });

  assert.equal((await cache.decision('https://example.com/ok')).allowed, true);
  assert.equal((await cache.decision('https://example.com/blocked')).allowed, false);
  assert.equal((await cache.decision('https://assets.example.com/blocked')).allowed, false);
  assert.deepEqual(calls, ['https://example.com', 'https://assets.example.com']);
});

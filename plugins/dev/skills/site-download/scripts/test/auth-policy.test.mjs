import test from 'node:test';
import assert from 'node:assert/strict';
import { PolicyCdpClient, RUNTIME_EXPRESSIONS, assertAllowedCdpMethod, shouldSkipAuthNavigation } from '../src/auth-policy.mjs';

test('CDP method policy allows only safe fixed operations', async () => {
  assert.equal(assertAllowedCdpMethod('Browser.getVersion'), true);
  assert.equal(assertAllowedCdpMethod('Runtime.evaluate', { expression: RUNTIME_EXPRESSIONS.OUTER_HTML }), true);
  assert.throws(() => assertAllowedCdpMethod('Network.getCookies'), /not allowed/);
  assert.throws(() => assertAllowedCdpMethod('Input.dispatchMouseEvent'), /not allowed/);
  assert.throws(() => assertAllowedCdpMethod('Runtime.evaluate', { expression: 'document.cookie' }), /not allowed/);

  const calls = [];
  const client = new PolicyCdpClient({
    async send(method, params) {
      calls.push({ method, params });
      return { ok: true };
    }
  });
  await client.send('Page.enable');
  await assert.rejects(() => client.send('Storage.getCookies'), /not allowed/);
  assert.deepEqual(calls.map((call) => call.method), ['Page.enable']);
});

test('auth navigation skips cross-origin and destructive URLs', () => {
  const start = 'https://example.com/docs';
  assert.equal(shouldSkipAuthNavigation('https://example.com/docs/page', start).skip, false);
  assert.deepEqual(shouldSkipAuthNavigation('https://other.example.com/docs/page', start), {
    skip: true,
    reason: 'cross_origin_page'
  });
  assert.deepEqual(shouldSkipAuthNavigation('https://example.com/logout', start), {
    skip: true,
    reason: 'skipped_destructive_url'
  });
  assert.deepEqual(shouldSkipAuthNavigation('https://example.com/settings', start, 'Delete account'), {
    skip: true,
    reason: 'skipped_destructive_url'
  });
});

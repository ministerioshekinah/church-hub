const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectHeaders, assets } = require('./hosting-headers.cjs');
const { read } = require('./helpers.cjs');
const { parseHTML } = require('linkedom');

test('hosting checks cover first-party scripts and styles referenced by current pages', () => {
  for (const page of ['index.html', 'newsletter/index.html', 'admin/index.html', 'privacy/index.html', 'terms/index.html', 'contact/index.html', '404.html']) {
    const { document } = parseHTML(read(page));
    for (const element of document.querySelectorAll('script[src],link[rel="stylesheet"]')) {
      const url = element.getAttribute('src') || element.getAttribute('href');
      if (!url.startsWith('/')) continue;
      assert(assets.includes(url.slice(1).split('?')[0]), `${page}: hosting check omits ${url}`);
    }
  }
});

function protectedHeaders() {
  return new Headers({
    'strict-transport-security': 'max-age=300',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'content-security-policy': "frame-ancestors 'none';"
  });
}

test('missing HTTP security headers fail the hosting check', () => {
  assert.equal(inspectHeaders(new Headers()).length, 4);
});

test('report-only CSP is not accepted as an enforced framing restriction', () => {
  const headers = protectedHeaders();
  headers.delete('content-security-policy');
  headers.set('content-security-policy-report-only', "frame-ancestors 'none'");
  assert.equal(inspectHeaders(headers).length, 1);
});

test('an ignored duplicate frame directive cannot produce a false pass', () => {
  const headers = protectedHeaders();
  headers.set('content-security-policy', "frame-ancestors *; frame-ancestors 'none'");
  assert.equal(inspectHeaders(headers).length, 1);
});

test('a separate enforced policy can restrict an existing CSP', () => {
  const headers = protectedHeaders();
  headers.set('content-security-policy', "default-src 'self'; frame-ancestors 'self', frame-ancestors 'none';");
  assert.deepEqual(inspectHeaders(headers), []);
});

test('HSTS rollback, malformed, duplicate, and too-short values fail', () => {
  for (const value of ['max-age=0', 'max-age=299', 'max-age=invalid', 'max-age=300; max-age=0', 'max-age=300, max-age=0']) {
    const headers = protectedHeaders();
    headers.set('strict-transport-security', value);
    assert.equal(inspectHeaders(headers).length, 1, value);
  }
});

test('initial HSTS rollout does not satisfy the long-term check', () => {
  const headers = protectedHeaders();
  assert.equal(inspectHeaders(headers, 31536000).length, 1);
  headers.set('strict-transport-security', 'max-age=31536000');
  assert.deepEqual(inspectHeaders(headers, 31536000), []);
});

test('permissive or conflicting X-Frame-Options fails', () => {
  const headers = protectedHeaders();
  headers.set('x-frame-options', 'SAMEORIGIN, DENY');
  assert.equal(inspectHeaders(headers).length, 1);
});

test('invalid nosniff values fail', () => {
  const headers = protectedHeaders();
  headers.set('x-content-type-options', 'false');
  assert.equal(inspectHeaders(headers).length, 1);
});

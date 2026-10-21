const test = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers.cjs');
const rules = JSON.parse(read('security/hosting/cloudflare-waf-rules.json'));

// Test-only interpreter for the small documented expression subset used here.
// It evaluates the actual proposal, rather than a separate hand-written rule.
// This is not Cloudflare validation or a model of URL normalization/phase order.
function matches(expression, request) {
  const tokens = expression.match(/"(?:[^"\\]|\\.)*"|[a-zA-Z_][a-zA-Z_.]*|[(){},]/g) || [];
  assert.equal(tokens.join(''), expression.replace(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ''), 'unsupported expression syntax');
  let i = 0;
  const take = expected => { assert.equal(tokens[i++], expected); };
  function value() {
    const token = tokens[i++];
    if (token?.startsWith('"')) return JSON.parse(token);
    if (token === 'lower') { take('('); const v = value(); take(')'); return v.toLowerCase(); }
    if (token === 'http.host') return request.host;
    if (token === 'http.request.method') return request.method;
    if (token === 'http.request.uri.path') return request.path;
    throw Error('Unsupported expression value: ' + token);
  }
  function atom() {
    if (tokens[i] === 'not') { i++; return !atom(); }
    if (tokens[i] === '(') { i++; const v = or(); take(')'); return v; }
    if (tokens[i] === 'starts_with') {
      i++; take('('); const source = value(); take(','); const prefix = value(); take(')');
      return source.startsWith(prefix);
    }
    const subject = value(); take('in'); take('{'); const members = [];
    while (tokens[i] !== '}') { assert(i < tokens.length, 'unterminated set'); members.push(value()); }
    take('}'); return members.includes(subject);
  }
  function and() { let v = atom(); while (tokens[i] === 'and') { i++; const right = atom(); v = v && right; } return v; }
  function or() { let v = and(); while (tokens[i] === 'or') { i++; const right = and(); v = v || right; } return v; }
  const result = or(); assert.equal(i, tokens.length, 'unconsumed expression tokens'); return result;
}
const blockedWhenEnabled = (host, method, path) => rules.some(rule => matches(rule.expression, {host, method, path}));

test('WAF proposals are disabled, additive block rules with unique identities', () => {
  assert.equal(rules.length, 2);
  assert.equal(new Set(rules.map(rule => rule.ref)).size, rules.length);
  for (const rule of rules) { assert.equal(rule.enabled, false); assert.equal(rule.action, 'block'); }
});

test('website writes are blocked while public reads, preflights and certificate paths remain allowed', () => {
  for (const host of ['mcshekinah.org', 'www.mcshekinah.org']) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'TRACE', 'CONNECT']) {
      assert.equal(blockedWhenEnabled(host, method, '/admin/'), true, `${host} ${method}`);
    }
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      for (const path of ['/', '/admin/', '/newsletter/?issue=example', '/supabase-config.js', '/.well-known/acme-challenge/example', '/.well-known/security.txt']) {
        assert.equal(blockedWhenEnabled(host, method, path), false, `${method} ${path}`);
      }
    }
  }
});

test('sensitive roots and file variants are blocked without overmatching similar names', () => {
  for (const path of ['/.git', '/.git/config', '/.GIT/HEAD', '/.env', '/.env.local', '/supabase/.env', '/supabase/.ENV.production']) {
    assert.equal(blockedWhenEnabled('mcshekinah.org', 'GET', path), true, path);
  }
  for (const path of ['/.github', '/.gitignore', '/.environment', '/supabase/.environment', '/assets/environment.svg', '/newsletter/.env-story']) {
    assert.equal(blockedWhenEnabled('mcshekinah.org', 'GET', path), false, path);
  }
});

test('Supabase and unrelated hosts are outside both rules even for denied website inputs', () => {
  for (const host of ['nhzxlsjwsvyimozubbho.supabase.co', 'mail.mcshekinah.org', 'mcshekinah.org.example', 'example.com']) {
    assert.equal(blockedWhenEnabled(host, 'POST', '/auth/v1/token'), false, host);
    assert.equal(blockedWhenEnabled(host, 'DELETE', '/.git/config'), false, host);
  }
});

// Read-only deployment verification. This file does not configure the host.
const fs = require('node:fs');
const path = require('node:path');
const origin = 'https://mcshekinah.org';

function inspectHeaders(headers, minimumHsts = 300) {
  const issues = [];
  const hsts = headers.get('strict-transport-security') || '';
  const maxAge = hsts.split(';').map(value => value.trim()).filter(value => /^max-age\b/i.test(value));
  const validAge = maxAge.length === 1 && /^max-age\s*=\s*(?:\d+|"\d+")$/i.test(maxAge[0]);
  const seconds = validAge ? Number(maxAge[0].split('=')[1].replaceAll('"', '').trim()) : NaN;
  if (!Number.isSafeInteger(seconds) || seconds < minimumHsts || hsts.includes(',')) {
    issues.push(`Strict-Transport-Security must have one max-age of at least ${minimumHsts} seconds`);
  }
  if ((headers.get('x-content-type-options') || '').toLowerCase() !== 'nosniff') {
    issues.push('X-Content-Type-Options must be nosniff');
  }
  if ((headers.get('x-frame-options') || '').toUpperCase() !== 'DENY') {
    issues.push('X-Frame-Options must be DENY');
  }
  // Multiple enforced policies intersect. Within one policy only the first
  // instance of a directive counts. Report-Only headers do not protect pages.
  const blocksFrames = (headers.get('content-security-policy') || '').split(',').some(policy => {
    const directive = policy.split(';').map(value => value.trim()).find(value => /^frame-ancestors(?:\s|$)/i.test(value));
    return directive && /^frame-ancestors\s+'none'\s*$/i.test(directive);
  });
  if (!blocksFrames) issues.push("Enforced Content-Security-Policy must contain frame-ancestors 'none'");
  return issues;
}

async function main() {
  const minimumHsts = process.argv.includes('--long-term') ? 31536000 : 300;
  const pages = ['/', '/newsletter/', '/admin/', '/privacy/', '/terms/', '/contact/', '/newsletter.html', '/admin.html'];
  const assets = ['style.css', 'public-glass.css', 'footer.css', 'information.css', 'newsletter-extensions.css',
    'theme.js', 'clean-urls.js', 'script.js', 'supabase-config.js', 'admin.js', 'admin-service-validation.js',
    'administrators.js', 'newsletter-extensions.js', 'admin-redirect.js'];
  const targets = [
    ...pages.map(route => ({ url: origin + route, status: 200, mime: /^text\/html$/i })),
    ...assets.map(asset => ({ url: origin + '/' + asset, status: 200,
      mime: asset.endsWith('.css') ? /^text\/css$/i : /^(?:text|application)\/javascript$/i })),
    { url: origin + '/__hosting-header-check-not-found__', status: 404 },
    { url: 'https://www.mcshekinah.org/', redirect: origin + '/' },
    { url: 'http://mcshekinah.org/newsletter/?header-check=1', redirect: origin + '/newsletter/?header-check=1' }
  ];
  const results = new Array(targets.length);
  let next = 0;
  async function worker() {
    while (next < targets.length) {
      const index = next++;
      const target = targets[index];
      try {
        const response = await fetch(target.url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
        const issues = target.url.startsWith('https:') ? inspectHeaders(response.headers, minimumHsts) : [];
        if (target.redirect) {
          if (![301, 302, 307, 308].includes(response.status) || response.headers.get('location') !== target.redirect) {
            issues.push('Expected HTTPS canonical redirect preserving path and query');
          }
        } else if (response.status !== target.status) {
          issues.push(`Expected HTTP ${target.status}, received ${response.status}`);
        }
        if (target.mime && !target.mime.test((response.headers.get('content-type') || '').split(';')[0].trim())) {
          issues.push('Unexpected Content-Type; nosniff could block this resource');
        }
        const headers = Object.fromEntries(['server', 'content-type', 'strict-transport-security',
          'x-content-type-options', 'x-frame-options', 'content-security-policy', 'location']
          .map(name => [name, response.headers.get(name)]));
        await response.body?.cancel();
        results[index] = { url: target.url, status: response.status, pass: issues.length === 0, issues, headers };
      } catch (error) {
        results[index] = { url: target.url, pass: false, issues: ['Request failed: ' + error.message] };
      }
      console.log(`${results[index].pass ? 'PASS' : 'FAIL'} ${target.url}`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  const report = { checkedAt: new Date().toISOString(), mode: 'read-only hosting verification', minimumHsts,
    passed: results.filter(result => result.pass).length, failed: results.filter(result => !result.pass).length, results };
  const output = path.join(__dirname, '../security/local-results/hosting-headers.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} passed, ${report.failed} failed. Report: ${output}`);
  if (report.failed) process.exitCode = 1;
}

module.exports = { inspectHeaders };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

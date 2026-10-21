const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const browserEngines = require('playwright');
const { startSite, createPage } = require('./browser/support.cjs');

// Exercise actual rendered transitions with a local site and intercepted data.
// Pausing animation timelines makes intermediate-state checks deterministic.
const results = [];
async function check(name, run) {
  const started = Date.now();
  try { await run(); results.push({ name, pass: true, durationMs: Date.now() - started }); console.log('PASS', name); }
  catch (error) { results.push({ name, pass: false, error: error.stack }); console.error('FAIL', name, error.message); }
}

(async () => {
  const engine = process.env.BROWSER_ENGINE || 'chromium';
  if (!['chromium', 'firefox', 'webkit'].includes(engine)) throw Error('Unsupported browser engine');
  const site = await startSite();
  const browser = await browserEngines[engine].launch({ headless: true,
    ...(engine === 'chromium' ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  async function journey(options, run) {
    const p = await createPage(browser, site, options);
    try { await run(p); assert.deepEqual(p.state.errors, []); }
    finally { await p.close(); }
  }
  try {
    await check('Interrupted language fades retain displayed opacity and finish in the latest language', () => journey({ motion: true }, async ({ page, goto }) => {
      await goto();
      const outgoing = await page.evaluate(() => {
        const main = document.querySelector('main');
        document.querySelector('[data-lang="es"]').click();
        const animation = main.getAnimations()[0];
        animation.pause(); animation.currentTime = animation.effect.getTiming().duration / 2;
        const before = Number(getComputedStyle(main).opacity);
        document.querySelector('[data-lang="en"]').click();
        return { before, after: Number(getComputedStyle(main).opacity), transform: getComputedStyle(main).transform };
      });
      assert(outgoing.before > 0 && outgoing.before < 1, 'outgoing opacity must be sampled mid-fade');
      assert(Math.abs(outgoing.after - outgoing.before) < .01, 'a reversal must not flash back to full opacity');
      assert.equal(outgoing.transform, 'none');
      await page.waitForFunction(() => document.documentElement.lang === 'en' && document.querySelector('main').getAnimations().length === 0);

      await page.evaluate(async () => {
        document.querySelector('[data-lang="es"]').click();
        const animation = document.querySelector('main').getAnimations()[0];
        animation.finish(); await animation.finished;
      });
      const incoming = await page.evaluate(() => {
        const main = document.querySelector('main');
        const animation = main.getAnimations()[0];
        animation.pause(); animation.currentTime = animation.effect.getTiming().duration / 2;
        const before = Number(getComputedStyle(main).opacity);
        const language = document.documentElement.lang;
        document.querySelector('[data-lang="en"]').click();
        return { before, after: Number(getComputedStyle(main).opacity), language };
      });
      assert.equal(incoming.language, 'es');
      assert(incoming.before > 0 && incoming.before < 1, 'incoming opacity must be sampled mid-fade');
      assert(Math.abs(incoming.after - incoming.before) < .01, 'interrupting the incoming fade must remain continuous');
      await page.waitForFunction(() => document.documentElement.lang === 'en' && document.querySelector('main').getAnimations().length === 0);
      assert.equal(await page.locator('main').evaluate(e => getComputedStyle(e).opacity), '1');
      assert.equal(await page.locator('[data-lang="en"]').getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator('h1').innerText(), /A place/);
    }));

    await check('Enabling reduced motion during a fade resolves the selected language immediately', () => journey({ motion: true }, async ({ page, goto }) => {
      await goto();
      await page.evaluate(() => {
        document.querySelector('[data-lang="es"]').click();
        const animation = document.querySelector('main').getAnimations()[0];
        animation.pause(); animation.currentTime = animation.effect.getTiming().duration / 2;
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.documentElement.lang === 'es' && document.querySelector('main').getAnimations().length === 0);
      assert.deepEqual(await page.locator('main').evaluate(e => ({ opacity: getComputedStyle(e).opacity, transform: getComputedStyle(e).transform })), { opacity: '1', transform: 'none' });
      assert.equal(await page.locator('html').getAttribute('data-ambient-motion'), 'paused');
      assert.equal(await page.locator('.ambient-orb').first().evaluate(e => e.getAnimations().length), 0);
      await page.locator('[data-lang="en"]').click();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.equal(await page.locator('main').evaluate(e => e.getAnimations().length), 0);
      await page.locator('#menuButton').click();
      assert.equal(await page.locator('#navMenu').evaluate(e => e.getAnimations().length), 0);
    }));

    await check('Closing mobile navigation immediately excludes links from keyboard focus; desktop restores them', () => journey({ motion: true }, async ({ page, goto }) => {
      await goto();
      const nav = page.locator('#navMenu');
      assert.equal(await nav.evaluate(e => e.inert), true);
      await page.locator('#menuButton').click();
      assert.equal(await nav.evaluate(e => e.inert), false);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#navMenu')).opacity === '1');
      await nav.locator('a').first().focus();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#menuButton').getAttribute('aria-expanded'), 'false');
      assert.equal(await nav.evaluate(e => e.inert), true);
      await page.keyboard.press('Tab');
      assert.equal(await nav.evaluate(e => e.contains(document.activeElement)), false, 'Tab must skip links during the closing fade');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForFunction(() => !document.querySelector('#navMenu').inert);
      await nav.locator('a').first().focus();
      assert.equal(await nav.locator('a').first().evaluate(e => e === document.activeElement), true);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => document.querySelector('#navMenu').inert);
      assert.equal(await page.locator('#menuButton').getAttribute('aria-expanded'), 'false');
    }));

    await check('Archive hover interpolates smoothly in both themes and stops under reduced motion', () => journey({ motion: true, viewport: { width: 1440, height: 1000 } }, async ({ page, goto }) => {
      await goto('/newsletter/');
      const item = page.locator('.archive-item').first();
      for (const theme of ['light', 'dark']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#themeToggle').click();
        await page.mouse.move(0, 0);
        await item.evaluate(async e => { await Promise.all(e.getAnimations().map(a => a.finished.catch(() => {}))); });
        await item.hover();
        const intermediate = await item.evaluate(e => {
          const animation = e.getAnimations().find(a => a.transitionProperty === 'transform');
          if (!animation) return null;
          animation.pause();
          animation.currentTime = animation.effect.getTiming().duration / 2;
          const transform = new DOMMatrix(getComputedStyle(e).transform);
          return { y: transform.m42, duration: animation.effect.getTiming().duration };
        });
        assert(intermediate, `${theme}: hover must create a transform transition`);
        assert(intermediate.y < 0 && intermediate.y > -3, `${theme}: hover must interpolate rather than jump`);
        await item.evaluate(e => e.getAnimations().forEach(a => a.finish()));
        assert.equal(await item.evaluate(e => new DOMMatrix(getComputedStyle(e).transform).m42), -3);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.archive-item')).transform === 'none');
      assert.equal(await item.evaluate(e => e.getAnimations().length), 0);
    }));

    await check('Hero pointer movement keeps the gradient stable without per-frame style mutation', () => journey({ motion: true, viewport: { width: 1440, height: 1000 } }, async ({ page, goto }) => {
      await goto();
      const card = page.locator('.hero-card');
      const original = await card.evaluate(e => ({ image: getComputedStyle(e).backgroundImage, style: e.getAttribute('style') }));
      const box = await card.boundingBox();
      for (const [x, y] of [[.2, .2], [.8, .4], [.4, .8]]) await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.deepEqual(await card.evaluate(e => ({ image: getComputedStyle(e).backgroundImage, style: e.getAttribute('style') })), original);
    }));
  } finally {
    const report = { checkedAt: new Date().toISOString(), engine, browser: browser.version(), mode: 'local site with intercepted backend; no production writes', passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, results };
    const output = process.env.MOTION_REPORT_PATH || path.resolve(__dirname, '../security/local-results/motion-regression.json');
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    await browser.close(); await site.close();
    console.log(`${report.passed}/${results.length} motion journeys passed`);
    if (report.failed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

/* Bounded, opt-in long-session verification. Every backend request is served
 * by the same isolated fixture as the regular browser suite. No live traffic. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {performance} = require('node:perf_hooks');
const {chromium} = require('playwright');
const {startSite, createPage} = require('./browser/support.cjs');

const minutes = Number(process.env.ENDURANCE_MINUTES || 120);
if (!Number.isFinite(minutes) || minutes < 0.05 || minutes > 180) throw Error('ENDURANCE_MINUTES must be between 0.05 and 180.');
const durationMs = minutes * 60000;
const intervalMs = Math.min(30000, Math.max(500, durationMs / 4));
const wait = ms => new Promise(resolve => setTimeout(resolve, Math.min(ms, 30000)));
const report = {requestedMinutes:minutes, scope:'Isolated Chromium fixtures; no production requests', samples:[], cycles:0, downloads:0};

(async () => {
  const site = await startSite();
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  const sessions = [];
  let started;
  try {
    const home = await createPage(browser,site,{motion:true,viewport:{width:390,height:844}});
    sessions.push(home);
    const reader = await createPage(browser,site,{motion:true,theme:'dark',viewport:{width:1280,height:900}});
    sessions.push(reader);
    reader.state.data.newsletters[1].optional_sections=[{type:'custom',title_en:'Community meal',title_es:'Comida comunitaria',body_en:'Bring a favorite dish.',body_es:'Trae tu plato favorito.'}];
    await home.goto('/');
    await reader.goto('/newsletter/');
    const monitors = await Promise.all(sessions.map(async session => {
      const cdp = await session.context.newCDPSession(session.page);
      await cdp.send('Performance.enable');
      return cdp;
    }));
    const backendCounts = sessions.map(session => session.state.requests.filter(request=>request.url.includes('/rest/v1/')).length);

    async function cycle(number) {
      const language = number % 2 ? 'es' : 'en';
      for (const session of sessions) {
        const {page,state} = session;
        await page.locator(`[data-lang="${language}"]`).click();
        await page.waitForFunction(language=>document.documentElement.lang===language&&getComputedStyle(document.querySelector('main')).opacity==='1',language);
        await page.locator('#themeToggle').click();
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
        assert.deepEqual(state.errors,[],'No unhandled page errors');
      }
      await home.page.locator('#menuButton').click();
      assert.equal(await home.page.locator('#menuButton').getAttribute('aria-expanded'),'true');
      await home.page.keyboard.press('Escape');
      assert.equal(await home.page.locator('#menuButton').getAttribute('aria-expanded'),'false');
      await home.page.locator('#copyAddress').click();
      assert.match(await home.page.locator('#copyStatus').innerText(),language==='es'?/Dirección copiada/:/Address copied/);
      await home.page.evaluate(()=>{window.__testClipboard.length=0;});
      if (number % 10 === 0) {
        const pending = home.page.waitForEvent('download');
        await home.page.locator('#downloadServiceCalendar').click();
        const download = await pending;
        const text = fs.readFileSync(await download.path(),'utf8');
        assert.match(text,/BEGIN:VCALENDAR\r\n/);assert.match(text,/DTSTART:\d{8}T\d{6}Z/);
        await download.delete();
        report.downloads++;
      }
      await reader.page.locator('#archiveSearch').fill('plato favorito');
      assert.equal(await reader.page.locator('.archive-item').count(),1);
      await reader.page.locator('.archive-item').click();
      assert.equal(await reader.page.locator('#latestNewsletter').getAttribute('data-issue-id'),'test-issue-1');
      await reader.page.goBack();
      assert.equal(await reader.page.locator('#latestNewsletter').getAttribute('data-issue-id'),'test-issue-0');
      await reader.page.locator('#clearArchiveSearch').click();
      assert.equal(await reader.page.locator('.archive-item').count(),6);
      await reader.page.locator('#copyNewsletterLink').click();
      assert.match(await reader.page.locator('#newsletterToolStatus').innerText(),language==='es'?/Enlace del boletín copiado/:/Issue link copied/);
      await reader.page.evaluate(()=>{window.__testClipboard.length=0;});
      for (let index=0;index<sessions.length;index++) {
        assert.equal(sessions[index].state.requests.filter(request=>request.url.includes('/rest/v1/')).length,backendCounts[index],'Local interactions must not refetch the backend');
      }
    }

    async function measure() {
      const values = [];
      for (let index=0;index<monitors.length;index++) {
        const cdp = monitors[index];
        await cdp.send('HeapProfiler.collectGarbage');
        const dom = await cdp.send('Memory.getDOMCounters');
        const {metrics} = await cdp.send('Performance.getMetrics');
        const heap = metrics.find(metric=>metric.name==='JSHeapUsedSize')?.value;
        assert(Number.isFinite(heap),'The browser must expose a usable heap measurement');
        values.push({page:index===0?'home':'newsletter',documents:dom.documents,nodes:dom.nodes,listeners:dom.jsEventListeners,heapBytes:heap});
      }
      return values;
    }

    // Warm both language/theme paths before measuring retained DOM and memory.
    await cycle(0);await cycle(1);
    const baseline = await measure();
    report.baseline = baseline;
    report.startedAt = new Date().toISOString();
    started = performance.now();
    console.log('ENDURANCE_STARTED',JSON.stringify({startedAt:report.startedAt,requestedMinutes:minutes,baseline}));
    while (performance.now()-started < durationMs) {
      await cycle(report.cycles+2);
      report.cycles++;
      if (report.cycles % 10 === 0) {
        const sample={elapsedSeconds:Math.round((performance.now()-started)/1000),cycles:report.cycles,pages:await measure()};
        for(let index=0;index<sample.pages.length;index++) {
          assert(sample.pages[index].documents<=baseline[index].documents+2,'Document count must remain bounded');
          assert(sample.pages[index].nodes<=baseline[index].nodes+500,'Retained DOM nodes must remain bounded');
          assert(sample.pages[index].listeners<=baseline[index].listeners+50,'Event listeners must remain bounded');
          assert(sample.pages[index].heapBytes<=baseline[index].heapBytes+32*1024*1024,'Retained JavaScript heap must remain bounded');
        }
        report.samples.push(sample);
        console.log('ENDURANCE_CHECKPOINT',JSON.stringify(sample));
      }
      const remaining=durationMs-(performance.now()-started);
      if(remaining>0)await wait(Math.min(intervalMs,remaining));
    }
    // Check one more interaction after the full elapsed window, then collect
    // the final retained-memory sample. A short smoke run uses this same path.
    await cycle(report.cycles+2);
    report.cycles++;
    report.final = await measure();
    for(let index=0;index<report.final.length;index++) {
      assert(report.final[index].nodes<=baseline[index].nodes+500);
      assert(report.final[index].listeners<=baseline[index].listeners+50);
      assert(report.final[index].heapBytes<=baseline[index].heapBytes+32*1024*1024);
    }
    report.elapsedSeconds = Math.round((performance.now()-started)/1000);
    report.completedAt = new Date().toISOString();
    report.pass = true;
    console.log('ENDURANCE_COMPLETE',JSON.stringify(report));
  } catch(error) {
    report.pass=false;
    report.error=error.stack;
    if(started)report.elapsedSeconds=Math.round((performance.now()-started)/1000);
    console.error('ENDURANCE_FAILED',JSON.stringify(report));
    process.exitCode=1;
  } finally {
    const destination=path.resolve(process.env.ENDURANCE_REPORT_PATH||'security/local-results/browser-endurance.json');
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
    for(const session of sessions)await session.close();
    await browser.close();
    await site.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});

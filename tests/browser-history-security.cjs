// Real-browser synthetic lifecycle checks. These exercise PageTransitionEvent
// handlers, the resulting reload, and the actual SDK with an isolated backend.
// They do not attest to
// native back/forward-cache eligibility or physical-device snapshot behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const browserEngines = require('playwright');
const {startSite,createPage} = require('./browser/support.cjs');

(async () => {
  const engine=process.env.BROWSER_ENGINE||'chromium';
  if(!['chromium','firefox','webkit'].includes(engine))throw Error('Unsupported browser engine');
  const site=await startSite();
  let browser;
  const results=[];
  try {
    browser=await browserEngines[engine].launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
    for(const revoked of [false,true]) {
      const name=`History session: ${revoked?'revoked membership stays denied':'valid membership reloads current content'} after a persisted lifecycle`;
      const p=await createPage(browser,site,{owner:true,viewport:{width:1440,height:900}});
      try {
        const {page,state}=p;
        await p.goto('/admin/');
        await page.locator('#adminEmail').fill('admin@example.test');
        await page.locator('#adminPassword').fill('fixture-password');
        await page.locator('#adminLoginForm button[type="submit"]').click();
        await page.locator('#adminDashboard').waitFor({state:'visible'});
        await page.locator('#administratorsTab').click();
        await page.getByText('editor@example.test',{exact:true}).waitFor({state:'visible'});
        await page.evaluate(()=>{
          document.getElementById('titleEn').value='Do not restore this private draft';
          document.getElementById('previewTitle').textContent='Do not restore this private draft';
          window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
        });
        assert.equal(await page.locator('#adminDashboard').isVisible(),false);
        assert.equal(await page.locator('#administratorList').innerText(),'');
        assert.equal(await page.locator('#titleEn').inputValue(),'');
        assert.equal(await page.locator('#adminPassword').inputValue(),'');
        const before=state.requests.length;
        if(revoked)state.data.admin_users=[];
        else state.data.service_settings[0].service_label_en='Current service from the server';
        state.delay=150;
        const navigation=page.waitForEvent('domcontentloaded');
        const cleared=await page.evaluate(()=>{
          window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
          return !document.getElementById('adminDashboard').classList.contains('visible') &&
            document.getElementById('titleEn').value==='' && document.getElementById('administratorList').textContent==='';
        });
        assert(cleared,'The frozen document must be scrubbed before reload');
        await navigation;
        assert.equal(await page.locator('#adminDashboard').isVisible(),false,'Private UI must remain hidden during fresh startup verification');
        if(revoked) {
          await page.waitForFunction(()=>document.getElementById('adminMessage').textContent.includes('not authorized'));
          assert.equal(await page.locator('#adminDashboard').isVisible(),false);
          assert.equal(await page.locator('#administratorsTab').isVisible(),false);
          assert.equal(await page.locator('#administratorList').innerText(),'');
          assert(!state.requests.slice(before).some(r=>/\/rest\/v1\/(service_settings|announcements|newsletters)/.test(r.url)),'Revoked session must not reload private content');
        } else {
          await page.locator('#adminDashboard').waitFor({state:'visible'});
          await page.waitForFunction(()=>document.getElementById('serviceLabelEn').value==='Current service from the server');
          assert.equal(await page.locator('#titleEn').inputValue(),'');
        }
        assert(state.requests.slice(before).some(r=>r.url.includes('/auth/v1/user')),'Restoration must reverify identity');
        assert(state.requests.slice(before).some(r=>r.url.includes('/rest/v1/admin_users')),'Restoration must reverify membership');
        assert.deepEqual(state.errors,[]);
        results.push({name,pass:true});console.log('PASS',name);
      } catch(error) {
        results.push({name,pass:false,error:error.stack});console.error('FAIL',name,error.message);
      } finally {await p.close();}
    }
  } finally {
    await browser?.close();await site.close();
  }
  const report={checkedAt:new Date().toISOString(),engine,mode:'synthetic persisted page lifecycle triggers actual reload; isolated backend; no production writes',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
  fs.mkdirSync('security/local-results',{recursive:true});fs.writeFileSync(`security/local-results/browser-history-${engine}.json`,JSON.stringify(report,null,2)+'\n');
  if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});

// Follow up the two-hour observation without attributing browser-internal
// retained nodes to application code. All content and requests are fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
const {startSite,createPage} = require('./browser/support.cjs');
const cycles = 30;

(async()=>{
  const site=await startSite();
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const report={scope:'Isolated Chromium observation; no production requests',cyclesPerScenario:cycles,sourceCommit:process.env.GITHUB_SHA||null,scenarios:[]};
  try {
    for(const name of ['newsletter-search','newsletter-navigation-without-search','native-search-input']) {
      let fixture,context,page,cdp;
      try {
        if(name==='native-search-input') {
          context=await browser.newContext();page=await context.newPage();
          await page.setContent('<!doctype html><html lang="en"><head><title>Native input fixture</title></head><body><label>Search<input type="search" id="search"></label><button id="clear">Clear</button></body></html>');
          await page.evaluate(()=>document.getElementById('clear').addEventListener('click',()=>{document.getElementById('search').value='';document.getElementById('search').focus();}));
        } else {
          fixture=await createPage(browser,site,{theme:'dark',viewport:{width:1280,height:900}});
          context=fixture.context;page=fixture.page;await fixture.goto('/newsletter/');
        }
        cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
        async function measure(){
          await cdp.send('HeapProfiler.collectGarbage');
          const dom=await cdp.send('Memory.getDOMCounters');
          const {metrics}=await cdp.send('Performance.getMetrics');
          const attachedNodes=await page.evaluate(()=>{const nodes=document.createTreeWalker(document,NodeFilter.SHOW_ALL);let count=1;while(nodes.nextNode())count++;return count;});
          return {documents:dom.documents,retainedNodes:dom.nodes,listeners:dom.jsEventListeners,attachedNodes,heapBytes:metrics.find(metric=>metric.name==='JSHeapUsedSize').value};
        }
        async function interact(index){
          if(name==='native-search-input') {
            await page.locator('#search').fill('Community');await page.locator('#clear').click();
          } else if(name==='newsletter-search') {
            await page.locator('#archiveSearch').fill('Celebration');assert.equal(await page.locator('.archive-item').count(),1);
            await page.locator('#clearArchiveSearch').click();assert.equal(await page.locator('.archive-item').count(),6);
          } else {
            await page.locator(`[data-lang="${index%2?'es':'en'}"]`).click();await page.locator('#themeToggle').click();
            await page.locator('.archive-item').first().click();await page.goBack();
            await page.locator('#copyNewsletterLink').click();await page.evaluate(()=>{window.__testClipboard.length=0;});
          }
          if(fixture)assert.deepEqual(fixture.state.errors,[]);
        }
        await interact(0);await interact(1);
        const baseline=await measure(),samples=[];
        const backendReads=fixture?.state.requests.filter(request=>request.url.includes('/rest/v1/')).length;
        for(let index=0;index<cycles;index++){
          await interact(index);
          if((index+1)%10===0)samples.push({cycles:index+1,...await measure()});
        }
        const final=await measure();
        assert.equal(final.attachedNodes,baseline.attachedNodes,'The rendered document must not accumulate nodes');
        assert.equal(final.listeners,baseline.listeners,'Interactions must not accumulate event listeners');
        if(fixture)assert.equal(fixture.state.requests.filter(request=>request.url.includes('/rest/v1/')).length,backendReads);
        report.scenarios.push({name,baseline,samples,final,retainedNodeGrowth:final.retainedNodes-baseline.retainedNodes});
      } finally {if(fixture)await fixture.close();else if(context)await context.close();}
    }
    report.completedAt=new Date().toISOString();report.pass=true;
    console.log('RETENTION_OBSERVATION',JSON.stringify(report));
    fs.mkdirSync('security/local-results',{recursive:true});fs.writeFileSync('security/local-results/retention-diagnostic.json',JSON.stringify(report,null,2)+'\n');
  } finally {await browser.close();await site.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

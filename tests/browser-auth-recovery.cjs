const assert=require('node:assert/strict');
const fs=require('node:fs');
const engines=require('playwright');
const {startSite,createPage}=require('./browser/support.cjs');

(async()=>{
  const engine=process.env.BROWSER_ENGINE||'chromium';
  if(!['chromium','firefox','webkit'].includes(engine))throw Error('Unsupported browser engine');
  const site=await startSite();
  const browser=await engines[engine].launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
  const results=[];
  async function check(name,work){
    const p=await createPage(browser,site);
    try{await work(p);assert.deepEqual(p.state.errors,[]);results.push({name,pass:true});console.log('PASS',name);}
    catch(error){results.push({name,pass:false,error:error.stack});console.error('FAIL',name,error.message);}
    finally{await p.close();}
  }
  async function login(p){
    await p.goto('/admin/');await p.page.locator('#adminEmail').fill('admin@example.test');await p.page.locator('#adminPassword').fill('fixture-password');
    await p.page.locator('#adminLoginForm button[type="submit"]').click();
    await p.page.waitForFunction(()=>document.getElementById('adminDashboard').classList.contains('visible')&&!document.getElementById('serviceLabelEn').disabled);
  }
  async function hold(p,pattern){
    let release;const pending=new Promise(resolve=>{release=resolve});
    await p.context.route(pattern,async route=>{if(route.request().method()==='GET')await pending;return route.fallback();});
    return async()=>{release();await p.context.unroute(pattern);};
  }
  const noPasswordWrite=p=>assert(!p.state.requests.some(request=>request.method==='PUT'&&request.url.includes('/auth/v1/user')));

  await check('Auth connection: a stalled restored identity returns to usable sign-in, then reload recovers',async p=>{
    await login(p);const release=await hold(p,'**/auth/v1/user');
    try{
      await p.page.reload({waitUntil:'domcontentloaded'});
      await p.page.waitForFunction(()=>document.getElementById('adminMessage').textContent.includes('session could not be verified'),null,{timeout:14000});
      assert(await p.page.locator('#adminEmail').isEnabled());assert(await p.page.locator('#adminDashboard').isHidden());noPasswordWrite(p);
    }finally{await release();}
    await p.page.reload({waitUntil:'networkidle'});await p.page.locator('#adminDashboard').waitFor({state:'visible'});
  });

  await check('Auth connection: a stalled identity after password sign-in releases the form without authorizing content',async p=>{
    await p.goto('/admin/');const release=await hold(p,'**/auth/v1/user');
    try{
      await p.page.locator('#adminEmail').fill('admin@example.test');await p.page.locator('#adminPassword').fill('fixture-password');await p.page.locator('#adminLoginForm button[type="submit"]').click();
      await p.page.waitForFunction(()=>document.getElementById('adminMessage').textContent==='Unable to verify this session.',null,{timeout:14000});
      assert(await p.page.locator('#adminEmail').isEnabled());assert(await p.page.locator('#adminDashboard').isHidden());assert.equal(await p.page.locator('#adminPassword').inputValue(),'');noPasswordWrite(p);
    }finally{await release();}
    await login(p);
  });

  for(const membership of [false,true])await check(`Auth connection: a stalled ${membership?'membership':'identity'} check blocks password changes and allows an explicit retry`,async p=>{
    await login(p);await p.page.locator('#accountTab').click();
    await p.page.locator('#accountNewPassword').fill('Fixture-only passphrase 42!');await p.page.locator('#accountConfirmPassword').fill('Fixture-only passphrase 42!');
    const release=await hold(p,membership?'**/rest/v1/admin_users?*':'**/auth/v1/user');
    try{
      await p.page.locator('#accountSavePassword').click();
      await p.page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent.includes('could not be verified')&&!document.getElementById('accountSavePassword').disabled,null,{timeout:14000});
      assert(await p.page.locator('#accountTab').isVisible());noPasswordWrite(p);
      assert.equal(await p.page.locator('#accountNewPassword').inputValue(),'Fixture-only passphrase 42!');
    }finally{await release();}
    await p.page.locator('#accountSavePassword').click();
    await p.page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent.startsWith('Password saved.'));
    assert.equal(p.state.passwordChanges,1);assert.equal(await p.page.locator('#accountNewPassword').inputValue(),'');
  });

  await check('Auth connection: an unavailable startup membership check offers retry without signing out or claiming a denial',async p=>{
    await login(p);const release=await hold(p,'**/rest/v1/admin_users?*');
    const logoutCount=p.state.requests.filter(request=>request.url.includes('/auth/v1/logout')).length;
    try{
      await p.page.reload({waitUntil:'domcontentloaded'});
      await p.page.waitForFunction(()=>document.getElementById('adminMessage').textContent.includes('access could not be verified'),null,{timeout:14000});
      assert(await p.page.locator('#adminEmail').isEnabled());assert(await p.page.locator('#adminDashboard').isHidden());
      assert.equal(p.state.requests.filter(request=>request.url.includes('/auth/v1/logout')).length,logoutCount);
      assert(await p.page.evaluate(async()=>Boolean((await supabaseClient.auth.getSession()).data.session)));
    }finally{await release();}
    await p.page.reload({waitUntil:'networkidle'});await p.page.locator('#adminDashboard').waitFor({state:'visible'});
  });

  const report={checkedAt:new Date().toISOString(),engine,mode:'real ten-second read deadlines; every Auth/database request is a local fixture',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
  fs.mkdirSync('security/local-results',{recursive:true});fs.writeFileSync(`security/local-results/browser-auth-recovery-${engine}.json`,JSON.stringify(report,null,2)+'\n');
  await browser.close();await site.close();console.log(`${report.passed}/${results.length} Auth connection journeys passed`);if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});

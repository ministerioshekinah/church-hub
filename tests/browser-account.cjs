// Real SDK and browser forms, entirely isolated Auth/database fixtures.
// These tests never send emails or change a production credential.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engines=require('playwright');
const axe=require('axe-core');
const {startSite,createPage}=require('./browser/support.cjs');
const secret='Fixture-only new passphrase 42!';

(async()=>{
  const engine=process.env.BROWSER_ENGINE||'chromium';
  if(!['chromium','firefox','webkit'].includes(engine))throw Error('Unsupported browser engine');
  const site=await startSite();
  const browser=await engines[engine].launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
  const results=[];
  async function check(name,options,work){
    const p=await createPage(browser,site,options);
    try {await work(p);assert.deepEqual(p.state.errors,[]);results.push({name,pass:true});console.log('PASS',name);}
    catch(error){results.push({name,pass:false,error:error.stack});console.error('FAIL',name,error.message);}
    finally{await p.close();}
  }
  async function login(p){
    await p.goto('/admin/');await p.page.locator('#adminEmail').fill('admin@example.test');await p.page.locator('#adminPassword').fill('fixture-password');
    await p.page.locator('#adminLoginForm button[type="submit"]').click();await p.page.locator('#adminDashboard').waitFor({state:'visible'});
  }
  async function fill(page){await page.locator('#accountNewPassword').fill(secret);await page.locator('#accountConfirmPassword').fill(secret);}
  async function failBrowserLocks(page){
    // Exercise the real SDK's failure before it can clear local storage.
    // Replace the exposed manager consistently across engines. Keep failure
    // active until the UI settles so a background SDK check cannot consume it.
    await page.evaluate(()=>{
      window.__fixtureOriginalLocks=navigator.locks;
      Object.defineProperty(navigator,'locks',{configurable:true,value:{request:()=>Promise.reject(new DOMException('Fixture lock unavailable','SecurityError'))}});
    });
  }
  async function restoreBrowserLocks(page){
    await page.evaluate(()=>{Object.defineProperty(navigator,'locks',{configurable:true,value:window.__fixtureOriginalLocks});delete window.__fixtureOriginalLocks;});
  }
  const writes=state=>state.requests.filter(request=>request.url.includes('/auth/v1/user')&&request.method==='PUT');

  for(const type of ['invite','recovery'])await check(`Account ${type}: verified link, password setup, cleanup, and a fresh password sign-in`,{theme:type==='invite'?'light':'dark',viewport:{width:type==='invite'?1280:320,height:1000}},async p=>{
    const {page,state}=p;await p.authLanding(type);await page.locator('#accountSetupNotice').waitFor({state:'visible'});
    assert(await page.locator('#accountNewPassword').evaluate(element=>element===document.activeElement));
    assert.equal(new URL(page.url()).hash,'','SDK removes link credentials from the URL');
    assert.equal(writes(state).length,0);assert.equal(state.verificationRequests||0,0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(axe.source);assert.deepEqual(await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))}),[]);
    if(process.env.BROWSER_SCREENSHOT_DIR&&engine==='chromium'){
      fs.mkdirSync(process.env.BROWSER_SCREENSHOT_DIR,{recursive:true});
      await page.locator('[data-admin-panel="account"]').evaluate(element=>element.scrollIntoView({block:'start'}));
      await page.screenshot({path:path.join(process.env.BROWSER_SCREENSHOT_DIR,`account-${type}.png`)});
    }
    await fill(page);await page.locator('#accountSavePassword').click();
    await page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent.startsWith('Password saved.'));
    assert.equal(state.passwordChanges,1);assert.equal(JSON.parse(writes(state)[0].body).password,secret);assert.equal(JSON.parse(writes(state)[0].body).current_password,undefined);
    for(const id of ['accountCurrentPassword','accountNewPassword','accountConfirmPassword','accountVerificationCode'])assert.equal(await page.locator('#'+id).inputValue(),'');
    assert(!(await page.evaluate(()=>Object.values(localStorage).join(' '))).includes(secret));
    await page.locator('#signOutButton').click();await page.locator('#adminLoginView').waitFor({state:'visible'});
    await page.locator('#adminEmail').fill('admin@example.test');await page.locator('#adminPassword').fill('fixture-password');await page.locator('#adminLoginForm button[type="submit"]').click();
    await page.waitForFunction(()=>document.getElementById('adminMessage').textContent.startsWith('Unable to sign in'));
    await page.locator('#adminPassword').fill(secret);await page.locator('#adminLoginForm button[type="submit"]').click();await page.locator('#adminDashboard').waitFor({state:'visible'});
    assert(await page.locator('#accountSetupNotice').isHidden());
  });
  await check('Account validation: mismatched passwords focus confirmation without an Auth mutation',{},async p=>{
    await login(p);const {page,state}=p;await page.locator('#accountTab').click();await fill(page);await page.locator('#accountConfirmPassword').fill('Different fixture password');await page.locator('#accountSavePassword').click();
    assert.match(await page.locator('#accountPasswordStatus').innerText(),/do not match/);
    assert(await page.locator('#accountConfirmPassword').evaluate(element=>element===document.activeElement));assert.equal(writes(state).length,0);
    await page.locator('#accountShowPasswords').check();assert.equal(await page.locator('#accountNewPassword').getAttribute('type'),'text');
    await page.locator('#accountClearPassword').click();assert.equal(await page.locator('#accountNewPassword').inputValue(),'');assert.equal(await page.locator('#accountNewPassword').getAttribute('type'),'password');
  });
  await check('Account password change: the SDK forwards the provided current password without trimming it',{},async p=>{
    await login(p);const {page,state}=p;await page.locator('#accountTab').click();await page.locator('#accountCurrentPassword').fill(' Fixture current password ');await fill(page);
    await page.locator('#accountSavePassword').click();await page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent.startsWith('Password saved'));
    assert.equal(JSON.parse(writes(state)[0].body).current_password,' Fixture current password ');
    assert.equal(await page.locator('#accountCurrentPassword').inputValue(),'');
  });
  await check('Account authorization: revoked membership cannot submit a password change',{},async p=>{
    await login(p);const {page,state}=p;await page.locator('#accountTab').click();await fill(page);state.data.admin_users=[];await page.locator('#accountSavePassword').click();
    await page.waitForFunction(()=>document.getElementById('adminMessage').textContent.includes('not authorized'));
    assert.equal(writes(state).length,0);assert.equal(await page.locator('#accountNewPassword').inputValue(),'');assert(await page.locator('#accountTab').isHidden());
  });
  await check('Account sessions: an expired identity check offers retry and cannot mutate a password',{},async p=>{
    await login(p);const {page,state}=p;await page.locator('#accountTab').click();await fill(page);state.identityUnavailable=true;await page.locator('#accountSavePassword').click();
    await page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent.includes('session could not be verified'));
    assert.equal(writes(state).length,0);assert(await page.locator('#accountSavePassword').isEnabled());
  });
  for(const code of ['weak_password','same_password'])await check(`Account rejection: ${code} remains editable and does not claim success`,{},async p=>{
    await login(p);const {page,state}=p;state.passwordError={code,message:'Internal fixture detail',weak_password:{reasons:['length']}};
    await page.locator('#accountTab').click();await fill(page);await page.locator('#accountSavePassword').click();
    await page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent&&!document.getElementById('accountSavePassword').disabled);
    const message=await page.locator('#accountPasswordStatus').innerText();assert(!message.includes('Password saved'));assert(!message.includes('Internal fixture detail'));
    assert.equal(state.passwordChanges||0,0);assert.equal(await page.locator('#accountNewPassword').inputValue(),secret);
  });
  await check('Account verification: a requested nonce is explicit, rate-limit errors recover, and the nonce reaches Auth',{},async p=>{
    await login(p);const {page,state}=p;state.passwordError={code:'reauthentication_needed',message:'Verify first'};
    await page.locator('#accountTab').click();await fill(page);await page.locator('#accountSavePassword').click();await page.locator('#accountReauthentication').waitFor({state:'visible'});
    assert.equal(state.verificationRequests||0,0);
    state.verificationError={code:'over_email_send_rate_limit',message:'Fixture rate limit'};await page.locator('#accountSendCode').click();await page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent.includes('could not be sent'));
    state.verificationError=null;await page.locator('#accountSendCode').click();await page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent.startsWith('Check your account email'));
    await page.locator('#accountVerificationCode').fill('123456');state.passwordError=null;await page.locator('#accountSavePassword').click();await page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent.startsWith('Password saved'));
    assert.equal(JSON.parse(writes(state).at(-1).body).password,secret);assert.equal(JSON.parse(writes(state).at(-1).body).nonce,'123456');assert.equal(state.verificationRequests,2);
  });
  await check('Account privacy: cross-tab sign-out clears a visible new password',{},async p=>{
    await login(p);const {page,context}=p;await page.locator('#accountTab').click();await fill(page);await page.locator('#accountShowPasswords').check();
    const other=await context.newPage();await other.goto(site.url+'/admin/',{waitUntil:'networkidle'});await other.locator('#adminDashboard').waitFor({state:'visible'});await other.locator('#signOutButton').click();
    await page.locator('#adminLoginView').waitFor({state:'visible'});assert.equal(await page.locator('#accountNewPassword').inputValue(),'');assert.equal(await page.locator('#accountNewPassword').getAttribute('type'),'password');
    assert.equal(writes(p.state).length,0);
  });
  for(const owner of [false,true])await check(`Account identity change: a different signed-in account in another tab clears ${owner?'Owner':'Admin'} data without signing out that new account`,{owner},async p=>{
    await login(p);const {page,context,state}=p;
    await page.waitForFunction(()=>!document.getElementById('serviceLabelEn').disabled);
    await page.locator('#serviceLabelEn').fill('Private prior-account draft');
    if(owner){
      await page.locator('#administratorsTab').click();
      await page.waitForFunction(()=>document.querySelectorAll('#administratorList .administrator-item').length===2);
      await page.locator('#newAdministratorEmail').fill('private-invite-draft@example.test');
    }
    await page.locator('#accountTab').click();await fill(page);await page.locator('#accountShowPasswords').check();
    const other=await context.newPage();await other.goto(site.url+'/admin/',{waitUntil:'networkidle'});await other.locator('#adminDashboard').waitFor({state:'visible'});
    state.identityUser={id:'22222222-2222-4222-8222-222222222222',aud:'authenticated',role:'authenticated',email:'other@example.test',app_metadata:{},user_metadata:{}};
    const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:state.identityUser.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test-signature';
    const result=await other.evaluate(async session=>await supabaseClient.auth.setSession(session),{access_token:token,refresh_token:'fixture-other-refresh'});
    assert.equal(result.error,null);
    await page.waitForFunction(()=>document.getElementById('adminMessage').textContent.includes('signed-in account changed'));
    assert(await page.locator('#adminDashboard').isHidden());assert.equal(await page.locator('#serviceLabelEn').inputValue(),'');
    assert.equal(await page.locator('#accountNewPassword').inputValue(),'');assert.equal(await page.locator('#accountNewPassword').getAttribute('type'),'password');assert(await page.locator('#accountTab').isHidden());
    if(owner){assert.equal(await page.locator('#administratorList .administrator-item').count(),0);assert.equal(await page.locator('#newAdministratorEmail').inputValue(),'');assert(await page.locator('#administratorsTab').isHidden());}
    assert.equal(await page.evaluate(async()=>((await supabaseClient.auth.getSession()).data.session)?.user.id),state.identityUser.id);
    assert(!state.requests.some(request=>request.url.includes('/auth/v1/logout')));assert.equal(writes(state).length,0);
  });
  await check('Account identity refresh: a normal token refresh keeps the current editor and password form usable',{},async p=>{
    await login(p);const {page,state}=p;await page.waitForFunction(()=>!document.getElementById('serviceLabelEn').disabled);
    await page.locator('#serviceLabelEn').fill('Private same-account draft');await page.locator('#accountTab').click();await fill(page);
    assert.equal((await page.evaluate(async()=>await supabaseClient.auth.refreshSession())).error,null);
    assert(await page.locator('#adminDashboard').isVisible());assert.equal(await page.locator('#serviceLabelEn').inputValue(),'Private same-account draft');assert.equal(await page.locator('#accountNewPassword').inputValue(),secret);
    await page.locator('#accountSavePassword').click();await page.waitForFunction(()=>document.getElementById('accountPasswordStatus').textContent.startsWith('Password saved.'));
    assert.equal(state.passwordChanges,1);
  });
  await check('Account startup race: a prior-account membership response cannot reopen the dashboard after another tab switches identity',{},async p=>{
    await login(p);const {page,context,state}=p;
    const other=await context.newPage();await other.goto(site.url+'/admin/',{waitUntil:'networkidle'});await other.locator('#adminDashboard').waitFor({state:'visible'});
    let release;const held=new Promise(resolve=>{release=resolve});
    await context.route('**/rest/v1/admin_users?*',async route=>{if(route.request().frame().page()===page)await held;return route.fallback();});
    const membership=page.waitForRequest(request=>request.url().includes('/rest/v1/admin_users?'));
    try{
      await page.reload({waitUntil:'domcontentloaded'});await membership;
      state.identityUser={id:'22222222-2222-4222-8222-222222222222',aud:'authenticated',role:'authenticated',email:'other@example.test',app_metadata:{},user_metadata:{}};
      const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:state.identityUser.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test-signature';
      assert.equal((await other.evaluate(async session=>await supabaseClient.auth.setSession(session),{access_token:token,refresh_token:'fixture-other-refresh'})).error,null);
      await page.waitForFunction(()=>document.getElementById('adminMessage').textContent.includes('signed-in account changed'));
      const response=page.waitForResponse(response=>response.url().includes('/rest/v1/admin_users?'));release();await (await response).finished();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert(await page.locator('#adminDashboard').isHidden());assert.equal(await page.evaluate(()=>authenticatedAdmin),null);
      assert.equal(await page.locator('#accountIdentity').innerText(),'');assert.equal(writes(state).length,0);
    }finally{release();}
  });
  await check('Sign-out privacy: pending logout clears Owner drafts, revealed passwords and controls before the network settles',{owner:true},async p=>{
    await login(p);const {page,context}=p;
    await page.waitForFunction(()=>!document.getElementById('serviceLabelEn').disabled);
    await page.locator('#serviceLabelEn').fill('Private draft awaiting sign-out');
    await page.locator('#administratorsTab').click();await page.locator('#newAdministratorEmail').fill('private-invite@example.test');
    await page.locator('#accountTab').click();await fill(page);await page.locator('#accountShowPasswords').check();
    let release;const held=new Promise(resolve=>{release=resolve});
    await context.route('**/auth/v1/logout?*',async route=>{await held;return route.fallback();});
    try{
      const request=page.waitForRequest(request=>request.url().includes('/auth/v1/logout'));
      await page.locator('#signOutButton').click();await request;
      assert(await page.locator('#adminDashboard').isHidden());assert(await page.locator('#adminLoginForm').isHidden());
      assert.equal(await page.locator('#serviceLabelEn').inputValue(),'');assert.equal(await page.locator('#newAdministratorEmail').inputValue(),'');
      assert.equal(await page.locator('#administratorList .administrator-item').count(),0);
      assert.equal(await page.locator('#accountNewPassword').inputValue(),'');assert.equal(await page.locator('#accountNewPassword').getAttribute('type'),'password');
      assert(!(await page.locator('#adminMessage').innerText()).includes('Signed out securely'));
      release();await page.waitForFunction(()=>document.getElementById('adminMessage').textContent==='Signed out securely.');
      assert.equal(await page.evaluate(async()=>(await supabaseClient.auth.getSession()).data.session),null);
    }finally{release();}
  });
  await check('Sign-out privacy: a rejected global logout accurately reports local cleanup without claiming remote revocation',{theme:'dark',viewport:{width:320,height:1000}},async p=>{
    await login(p);const {page,state}=p;await page.locator('#accountTab').click();await fill(page);
    state.logoutError={code:'unexpected_failure',message:'Private provider detail'};
    await page.locator('#signOutButton').click();await page.waitForFunction(()=>document.getElementById('adminMessage').textContent.startsWith('Signed out on this device.'));
    assert(await page.locator('#adminEmail').evaluate(element=>element===document.activeElement));
    assert(await page.locator('#adminDashboard').isHidden());assert(await page.locator('#adminLoginForm').isVisible());
    assert.equal(await page.locator('#accountNewPassword').inputValue(),'');
    assert.match(await page.locator('#adminMessage').innerText(),/other sessions could not be confirmed/);
    assert(!(await page.locator('#adminMessage').innerText()).includes('Private provider detail'));
    assert.equal(await page.evaluate(async()=>(await supabaseClient.auth.getSession()).data.session),null);
    assert(await page.locator('#retrySignOutButton').isHidden(),'A retry without an SDK session cannot revoke remote sessions');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(axe.source);assert.deepEqual(await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id)),[]);
    if(process.env.BROWSER_SCREENSHOT_DIR&&engine==='chromium')await page.screenshot({path:path.join(process.env.BROWSER_SCREENSHOT_DIR,'signout-local-only-dark-320.png')});
    assert.equal(state.requests.filter(request=>request.url.includes('/auth/v1/logout')).length,1);
    state.logoutError=null;await login(p);await page.locator('#signOutButton').click();await page.waitForFunction(()=>document.getElementById('adminMessage').textContent==='Signed out securely.');
    assert(await page.locator('#adminEmail').evaluate(element=>element===document.activeElement));assert(await page.locator('#adminLoginForm').isVisible());
    assert.equal(await page.evaluate(async()=>(await supabaseClient.auth.getSession()).data.session),null);
    assert.equal(state.requests.filter(request=>request.url.includes('/auth/v1/logout')).length,2);
  });
  await check('Sign-out privacy: a browser lock failure keeps a cleared accessible view and an explicit retry',{theme:'dark',viewport:{width:320,height:1000}},async p=>{
    await login(p);const {page,state}=p;await page.locator('#accountTab').click();await fill(page);
    await failBrowserLocks(page);await page.locator('#signOutButton').click();await page.locator('#retrySignOutButton').waitFor({state:'visible'});await restoreBrowserLocks(page);
    assert(await page.locator('#retrySignOutButton').evaluate(element=>element===document.activeElement));
    assert(await page.locator('#adminDashboard').isHidden());assert(await page.locator('#adminLoginForm').isHidden());
    assert.equal(await page.locator('#accountNewPassword').inputValue(),'');assert.match(await page.locator('#adminMessage').innerText(),/could not be confirmed/);
    assert(await page.evaluate(async()=>Boolean((await supabaseClient.auth.getSession()).data.session)));
    assert.equal(state.requests.filter(request=>request.url.includes('/auth/v1/logout')).length,0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(axe.source);assert.deepEqual(await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id)),[]);
    if(process.env.BROWSER_SCREENSHOT_DIR&&engine==='chromium')await page.screenshot({path:path.join(process.env.BROWSER_SCREENSHOT_DIR,'signout-retry-dark-320.png')});
    await page.locator('#retrySignOutButton').click();await page.waitForFunction(()=>document.getElementById('adminMessage').textContent==='Signed out securely.');
    assert.equal(await page.evaluate(async()=>(await supabaseClient.auth.getSession()).data.session),null);
    assert.equal(state.requests.filter(request=>request.url.includes('/auth/v1/logout')).length,1);
  });
  await check('Sign-out privacy: another tab completing logout clears a failed retry without another request',{},async p=>{
    await login(p);const {page,state,context}=p;
    await failBrowserLocks(page);
    await page.locator('#signOutButton').click();await page.locator('#retrySignOutButton').waitFor({state:'visible'});
    await restoreBrowserLocks(page);
    const other=await context.newPage();await other.goto(site.url+'/admin/',{waitUntil:'networkidle'});await other.locator('#adminDashboard').waitFor({state:'visible'});
    await other.locator('#signOutButton').click();await page.waitForFunction(()=>document.getElementById('adminMessage').textContent==='Signed out on this device.');
    assert(await page.locator('#retrySignOutButton').isHidden());assert(await page.locator('#adminLoginForm').isVisible());
    assert.equal(state.requests.filter(request=>request.url.includes('/auth/v1/logout')).length,1);
  });
  await check('Sign-out privacy: changing accounts removes a previous account\'s failed retry',{},async p=>{
    await login(p);const {page,state,context}=p;
    await failBrowserLocks(page);
    await page.locator('#signOutButton').click();await page.locator('#retrySignOutButton').waitFor({state:'visible'});
    await restoreBrowserLocks(page);
    const other=await context.newPage();await other.goto(site.url+'/admin/',{waitUntil:'networkidle'});await other.locator('#adminDashboard').waitFor({state:'visible'});
    state.identityUser={id:'22222222-2222-4222-8222-222222222222',aud:'authenticated',role:'authenticated',email:'other@example.test',app_metadata:{},user_metadata:{}};
    const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:state.identityUser.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test-signature';
    assert.equal((await other.evaluate(async session=>await supabaseClient.auth.setSession(session),{access_token:token,refresh_token:'fixture-other-refresh'})).error,null);
    await page.waitForFunction(()=>document.getElementById('adminMessage').textContent.includes('signed-in account changed'));
    assert(await page.locator('#retrySignOutButton').isHidden());assert(await page.locator('#adminDashboard').isHidden());
    assert.equal(state.requests.filter(request=>request.url.includes('/auth/v1/logout')).length,0);
    assert.equal(await page.evaluate(async()=>((await supabaseClient.auth.getSession()).data.session)?.user.id),state.identityUser.id);
  });
  for(const noWebLocks of [false,true])await check(`Account race: sign-out during a pending password request clears UI and SDK (${noWebLocks?'process fallback':'Web Locks'})`,{noWebLocks},async p=>{
    await login(p);const {page,context,state}=p;await page.locator('#accountTab').click();await fill(page);
    let release;const held=new Promise(resolve=>{release=resolve});
    await context.route('**/auth/v1/user',async route=>{if(route.request().method()==='PUT')await held;return route.fallback();});
    const request=page.waitForRequest(request=>request.url().includes('/auth/v1/user')&&request.method()==='PUT');
    await page.locator('#accountSavePassword').click();await request;
    assert(await page.locator('#accountSavePassword').isDisabled());await page.locator('#signOutButton').click();
    assert(await page.locator('#adminDashboard').isHidden());assert.equal(await page.locator('#accountNewPassword').inputValue(),'');release();
    await page.waitForFunction(()=>document.getElementById('adminMessage').textContent==='Signed out securely.');assert.equal(await page.locator('#accountNewPassword').inputValue(),'');assert.equal(await page.locator('#accountPasswordStatus').innerText(),'');
    assert.equal(writes(state).length,1);
    const session=await page.evaluate(async()=>{const {data}=await supabaseClient.auth.getSession();return data.session});assert.equal(session,null);
  });
  await check('Account race: another tab signing out during a password change clears both sessions',{},async p=>{
    await login(p);const {page,context}=p;
    const other=await context.newPage();await other.goto(site.url+'/admin/',{waitUntil:'networkidle'});await other.locator('#adminDashboard').waitFor({state:'visible'});
    await page.locator('#accountTab').click();await fill(page);
    let release;const held=new Promise(resolve=>{release=resolve});
    await context.route('**/auth/v1/user',async route=>{if(route.request().method()==='PUT')await held;return route.fallback();});
    const request=page.waitForRequest(request=>request.url().includes('/auth/v1/user')&&request.method()==='PUT');
    await page.locator('#accountSavePassword').click();await request;await other.locator('#signOutButton').click();release();
    await other.waitForFunction(()=>document.getElementById('adminMessage').textContent==='Signed out securely.');
    await page.locator('#adminLoginView').waitFor({state:'visible'});
    for(const tab of [page,other]){
      assert.equal(await tab.locator('#accountNewPassword').inputValue(),'');
      assert.equal(await tab.evaluate(async()=>{const {data}=await supabaseClient.auth.getSession();return data.session}),null);
    }
  });
  await check('Account link errors: an unverifiable link stays signed out and gives a useful explanation',{},async p=>{
    await p.goto('/admin/#error=access_denied&error_code=otp_expired&type=invite');
    assert(await p.page.locator('#adminLoginView').isVisible());assert(await p.page.locator('#accountTab').isHidden());
    assert.match(await p.page.locator('#adminMessage').innerText(),/link could not be verified/);assert.equal(writes(p.state).length,0);
  });
  await check('Account optional bundle: an unavailable account script preserves sign-in and content editing',{},async p=>{
    await p.context.route('**/admin-account.js?*',route=>route.abort());await login(p);assert(await p.page.locator('#accountTab').isHidden());
    await p.page.locator('#serviceLabelEn').fill('Fixture content still works');await p.page.locator('#saveServiceButton').click();await p.page.waitForFunction(()=>document.getElementById('serviceDraftStatus').textContent.startsWith('Published.'));
    assert.equal(writes(p.state).length,0);
  });
  await check('Password recovery request: accessible mobile form, fixed redirect, generic response, and verified recovery landing',{theme:'dark',viewport:{width:320,height:1000}},async p=>{
    const {page,state}=p;await p.goto('/admin/?redirect_to=https://untrusted.example/');
    await page.locator('#adminEmail').fill('admin@example.test');await page.locator('#adminPassword').fill('Fixture text to clear');
    await page.locator('#forgotPasswordButton').click();assert.equal(await page.locator('#adminPassword').inputValue(),'');
    assert.equal(await page.locator('#passwordRecoveryEmail').inputValue(),'admin@example.test');
    assert(await page.locator('#passwordRecoveryEmail').evaluate(element=>element===document.activeElement));assert.equal(state.recoveryRequests||0,0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(axe.source);assert.deepEqual(await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id)}),[]);
    await page.locator('#requestPasswordRecovery').click();await page.waitForFunction(()=>document.getElementById('passwordRecoveryStatus').textContent.startsWith('If an account exists'));
    const request=state.requests.find(request=>request.url.includes('/auth/v1/recover'));
    assert.equal(new URL(request.url).searchParams.get('redirect_to'),'https://mcshekinah.org/admin/');assert.equal(JSON.parse(request.body).email,'admin@example.test');assert.equal(JSON.parse(request.body).password,undefined);
    const message=await page.locator('#passwordRecoveryStatus').innerText();state.recoveryError={code:'user_not_found',message:'Private provider account detail'};
    await page.locator('#requestPasswordRecovery').click();await page.waitForFunction(()=>!document.getElementById('requestPasswordRecovery').disabled);
    assert.equal(await page.locator('#passwordRecoveryStatus').innerText(),message);
    await p.authLanding('recovery');await page.locator('#accountSetupNotice').waitFor({state:'visible'});
    assert.equal(writes(state).length,0,'A recovery landing does not change the password automatically');
  });
  await check('Password recovery request: provider rate limits remain retryable with no automatic resend',{},async p=>{
    const {page,state}=p;await p.goto('/admin/');await page.locator('#forgotPasswordButton').click();await page.locator('#passwordRecoveryEmail').fill('admin@example.test');
    state.recoveryError={code:'over_email_send_rate_limit',message:'Fixture rate limit'};await page.locator('#requestPasswordRecovery').click();await page.waitForFunction(()=>document.getElementById('passwordRecoveryStatus').textContent.startsWith('Please wait'));
    assert.equal(state.recoveryRequests,1);assert(await page.locator('#requestPasswordRecovery').isEnabled());
    state.recoveryError=null;await page.locator('#requestPasswordRecovery').click();await page.waitForFunction(()=>document.getElementById('passwordRecoveryStatus').textContent.startsWith('If an account exists'));assert.equal(state.recoveryRequests,2);
  });
  await check('Password recovery request: cancelling a pending request keeps sign-in usable and ignores late status',{},async p=>{
    const {page,context,state}=p;await p.goto('/admin/');await page.locator('#forgotPasswordButton').click();await page.locator('#passwordRecoveryEmail').fill('admin@example.test');
    let release;const held=new Promise(resolve=>{release=resolve});await context.route('**/auth/v1/recover?*',async route=>{await held;return route.fallback()});
    const request=page.waitForRequest(request=>request.url().includes('/auth/v1/recover'));
    await page.locator('#requestPasswordRecovery').click();await request;assert(await page.locator('#requestPasswordRecovery').isDisabled());
    await page.locator('#cancelPasswordRecovery').click();assert(await page.locator('#adminEmail').evaluate(element=>element===document.activeElement));assert(await page.locator('#forgotPasswordButton').isDisabled());release();
    await page.waitForFunction(()=>!document.getElementById('forgotPasswordButton').disabled);
    assert(await page.locator('#passwordRecoveryForm').isHidden());assert.equal(await page.locator('#passwordRecoveryStatus').innerText(),'');assert.equal(state.recoveryRequests,1);
  });
  const report={checkedAt:new Date().toISOString(),engine,mode:'real SDK; all Auth, email, and content requests are local fixtures',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
  fs.mkdirSync('security/local-results',{recursive:true});fs.writeFileSync(`security/local-results/browser-account-${engine}.json`,JSON.stringify(report,null,2)+'\n');
  await browser.close();await site.close();console.log(`${report.passed}/${results.length} account browser journeys passed`);if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});

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
  for(const noWebLocks of [false,true])await check(`Account race: sign-out during a pending password request clears UI and SDK (${noWebLocks?'process fallback':'Web Locks'})`,{noWebLocks},async p=>{
    await login(p);const {page,context,state}=p;await page.locator('#accountTab').click();await fill(page);
    let release;const held=new Promise(resolve=>{release=resolve});
    await context.route('**/auth/v1/user',async route=>{if(route.request().method()==='PUT')await held;return route.fallback();});
    const request=page.waitForRequest(request=>request.url().includes('/auth/v1/user')&&request.method()==='PUT');
    await page.locator('#accountSavePassword').click();await request;
    assert(await page.locator('#accountSavePassword').isDisabled());await page.locator('#signOutButton').click();release();
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

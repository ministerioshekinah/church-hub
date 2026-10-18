const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const browserEngines=require('playwright');
const axe=require('axe-core');
const {startSite,createPage}=require('./browser/support.cjs');
const results=[];
async function check(name,fn) {
  if(process.env.BROWSER_TEST_FILTER&&!new RegExp(process.env.BROWSER_TEST_FILTER).test(name))return;
  const start=Date.now();
  try {await fn();results.push({name,pass:true,durationMs:Date.now()-start});console.log('PASS',name);}
  catch(error){results.push({name,pass:false,error:error.stack});console.error('FAIL',name,error.message);}
}
(async()=>{
  const site=await startSite();
  const engine=process.env.BROWSER_ENGINE||'chromium';
  if(!['chromium','firefox','webkit'].includes(engine))throw Error('BROWSER_ENGINE must be chromium, firefox, or webkit');
  const browser=await browserEngines[engine].launch({headless:true,
    ...(engine==='chromium'?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
  async function journey(options,fn){
    const p=await createPage(browser,site,options);
    try{await fn(p);assert.deepEqual(p.state.errors,[]);}
    catch(error){error.message+='\nBrowser diagnostics: '+JSON.stringify({pageErrors:p.state.errors,failedRequests:p.state.failedRequests.slice(-8),consoleErrors:p.state.consoleErrors.slice(-8)});throw error;}
    finally{await p.close();}
  }
  await check('Mobile navigation: keyboard, Escape, and section focus',()=>journey({},async({page,goto})=>{
    await goto();const menu=page.locator('#menuButton');await menu.focus();await page.keyboard.press('Enter');
    await page.locator('#navMenu a').first().focus();await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'),'false');assert(await menu.evaluate(e=>e===document.activeElement));
    await menu.click();await page.locator('#navMenu a[href="#visit"]').click();
    assert(await page.locator('#visit').evaluate(e=>e===document.activeElement));assert.equal(await menu.getAttribute('aria-expanded'),'false');
  }));
  await check('Landscape navigation: final link remains reachable inside the viewport',()=>journey({viewport:{width:844,height:320}},async({page,goto})=>{
    await goto();await page.locator('#menuButton').click();
    const nav=page.locator('#navMenu');const box=await nav.boundingBox();assert(box.y+box.height<=320);
    const first=nav.locator('a').first();assert((await first.boundingBox()).y>=box.y,'First link must not overflow above the scrollable menu');
    const last=nav.locator('a').last();await last.scrollIntoViewIfNeeded();const linkBox=await last.boundingBox();assert(linkBox.y+linkBox.height<=320);
    await last.click();assert.equal(await page.locator('#menuButton').getAttribute('aria-expanded'),'false');
  }));
  await check('Language and theme: preferences persist across real navigation without refetching on translation',()=>journey({motion:true},async({page,state,goto})=>{
    await goto();const before=state.requests.filter(r=>r.url.includes('/rest/v1/')).length;
    await page.locator('[data-lang="es"]').click();await page.waitForFunction(()=>document.documentElement.lang==='es');
    assert.equal(state.requests.filter(r=>r.url.includes('/rest/v1/')).length,before);
    await page.locator('#themeToggle').click();await page.locator('.hero-actions a[href="/newsletter/"]').click();
    await page.waitForFunction(()=>document.querySelector('#latestNewsletter')?.dataset.issueId);
    assert.equal(await page.locator('html').getAttribute('lang'),'es');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    assert.match(await page.locator('#latestNewsletter').innerText(),/Boletín/);
  }));
  await check('Rapid language changes finish with visible, correctly translated content',()=>journey({motion:true},async({page,goto})=>{
    await goto();await page.locator('[data-lang="es"]').click();await page.locator('[data-lang="en"]').click();await page.locator('[data-lang="es"]').click();
    await page.waitForFunction(()=>document.documentElement.lang==='es'&&getComputedStyle(document.querySelector('main')).opacity==='1');
    assert.match(await page.locator('h1').innerText(),/Un lugar/);assert.equal(await page.locator('[data-lang="es"]').getAttribute('aria-pressed'),'true');
  }));
  await check('Blocked browser storage preserves theme and bilingual controls',()=>journey({blockStorage:true},async({page,goto})=>{
    await goto();await page.locator('[data-lang="es"]').click();await page.locator('#themeToggle').click();
    assert.equal(await page.locator('html').getAttribute('lang'),'es');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  }));
  await check('Reduced motion pauses the decorative background',()=>journey({},async({page,goto})=>{
    await goto();assert.equal(await page.locator('html').getAttribute('data-ambient-motion'),'paused');
    assert(await page.locator('#backgroundMotion').isDisabled());
    assert.equal(await page.locator('.ambient-orb').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  }));
  await check('Archive: bilingual search, history, share, print, and incremental disclosure',()=>journey({},async({page,goto})=>{
    await goto('/newsletter/');await page.locator('#archiveSearch').fill('celebracion');assert.equal(await page.locator('.archive-item').count(),1);
    await page.locator('.archive-item').click();assert.match(page.url(),/issue=test-issue-1/);assert.match(await page.locator('#latestNewsletter h2').innerText(),/Celebration/);
    await page.goBack();assert.match(await page.locator('#latestNewsletter h2').innerText(),/Community issue 1/);
    await page.locator('#archiveSearch').fill('');await page.locator('#showMoreIssues').click();assert.equal(await page.locator('.archive-item').count(),8);
    assert(await page.locator('.archive-item').nth(6).evaluate(e=>e===document.activeElement));
    await page.locator('#copyNewsletterLink').click();assert.match(await page.evaluate(()=>window.__testClipboard[0]),/\/newsletter\/\?issue=test-issue-0$/);
    await page.locator('#printNewsletter').click();assert.equal(await page.evaluate(()=>window.__testPrints),1);
  }));
  await check('Missing issue and untrusted CMS text remain harmless text',()=>journey({},async({page,state,goto})=>{
    const payload='<img src=x onerror="window.__unsafe=true">';state.data.newsletters[0].title_en=payload;
    await goto('/newsletter/?issue=%3Cscript%3Ebad%3C/script%3E');
    assert(await page.locator('#newsletterSelectionNotice').isVisible());assert.equal(await page.locator('#latestNewsletter h2').innerText(),payload);
    assert.equal(await page.locator('#latestNewsletter img').count(),0);assert.equal(await page.evaluate(()=>window.__unsafe),undefined);
  }));
  await check('Policy deep links follow the visible language',()=>journey({lang:'es'},async({page,goto})=>{
    await goto('/privacy/#section-en-3');assert.match(page.url(),/#section-es-3$/);
    assert(await page.locator('#section-es-3').isVisible());await page.locator('[data-lang="en"]').click();assert.match(page.url(),/#section-en-3$/);
  }));
  await check('Clean routes preserve queries and fragments across legacy and directory aliases',()=>journey({},async({page,goto})=>{
    for(const [route,canonical] of [['/index.html','/'],['/newsletter.html','/newsletter/'],['/admin.html','/admin/'],['/newsletter/index.html','/newsletter/'],['/admin/index.html','/admin/'],['/privacy/index.html','/privacy/'],['/terms/index.html','/terms/'],['/contact/index.html','/contact/'],['/newsletter','/newsletter/'],['/admin','/admin/']]){
      await goto(route+'?source=browser#anchor');const url=new URL(page.url());assert.equal(url.pathname,canonical);assert.equal(url.search,'?source=browser');assert.equal(url.hash,'#anchor');
    }
  }));
  await check('Without JavaScript: policy translations and mobile navigation remain readable',()=>journey({javascript:false},async({page,goto})=>{
    await goto('/privacy/');assert(await page.locator('[data-language-content="en"]').isVisible());assert(await page.locator('[data-language-content="es"]').isVisible());
    assert(await page.locator('#navMenu').isVisible());assert.equal(await page.locator('#menuButton').isVisible(),false);
  }));
  await check('Original fonts load locally; the public page makes no font-provider requests',()=>journey({},async({page,state,goto})=>{
    await goto();const loaded=await page.evaluate(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family));
    assert(loaded.some(f=>f.includes('Inter')));assert(loaded.some(f=>f.includes('Playfair Display')));
    assert(!state.requests.some(r=>/fonts\.(googleapis|gstatic)\.com/.test(r.url)));
  }));
  await check('CSP blocks inline scripts and foreign scripts in the real browser',()=>journey({},async({page,goto})=>{
    await goto();await page.evaluate(()=>{
      window.__violations=[];document.addEventListener('securitypolicyviolation',e=>window.__violations.push(e.effectiveDirective));
      const inline=document.createElement('script');inline.textContent='window.__unsafe=true';document.body.append(inline);
      const external=document.createElement('script');external.src='https://example.invalid/untrusted.js';document.body.append(external);
    });
    await page.waitForFunction(()=>window.__violations.length>=2);assert.equal(await page.evaluate(()=>window.__unsafe),undefined);
  }));
  await check('Public pages: both languages/themes pass automated WCAG checks and fit mobile/desktop',async()=>{
    for(const width of [390,1440])for(const theme of ['light','dark'])for(const lang of ['en','es']) {
      await journey({viewport:{width,height:900},theme,lang},async({page,goto})=>{
        for(const route of ['/','/newsletter/','/privacy/','/terms/','/contact/']) {
          await goto(route);assert.equal(await page.locator('html').getAttribute('lang'),lang);
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' horizontal overflow');
          await page.evaluate(axe.source);const failures=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))});
          assert.deepEqual(failures,[],`${route} ${width} ${theme} ${lang}`);
        }
      });
    }
  });
  async function login(p){await p.goto('/admin/');await p.page.locator('#adminEmail').fill('admin@example.test');await p.page.locator('#adminPassword').fill('fixture-password');await p.page.locator('#adminLoginForm button[type="submit"]').click();await p.page.locator('#adminDashboard').waitFor({state:'visible'});}
  for(const moveFocus of [false,true])await check(`Sign-in recovery: ${moveFocus?'another focused control is preserved':'a keyboard failure returns to the password field and can be retried'}`,()=>journey({},async p=>{
    await p.goto('/admin/');const {page,state}=p;state.signInError=true;state.delay=150;
    await page.locator('#adminEmail').fill('admin@example.test');await page.locator('#adminPassword').fill('wrong-fixture-password');
    await page.locator('#adminPassword').press('Enter');if(moveFocus)await page.locator('#themeToggle').focus();
    await page.waitForFunction(()=>document.querySelector('#adminMessage').textContent.includes('Unable to sign in')&&!document.querySelector('#adminPassword').disabled);
    assert(await page.locator(moveFocus?'#themeToggle':'#adminPassword').evaluate(e=>e===document.activeElement));
    assert.equal(await page.locator('#adminPassword').inputValue(),'');
    assert.equal(await page.locator('#adminEmail').inputValue(),'admin@example.test');
    if(!moveFocus){state.signInError=false;await page.locator('#adminPassword').fill('fixture-password');await page.locator('#adminPassword').press('Enter');await page.locator('#adminDashboard').waitFor({state:'visible'});}
  }));
  await check('Admin supply chain: authentication works without a third-party script request',()=>journey({},async p=>{
    await login(p);
    assert(!p.state.requests.some(r=>new URL(r.url).hostname==='cdn.jsdelivr.net'));
    assert(await p.page.evaluate(()=>[...document.scripts].every(s=>new URL(s.src).origin===location.origin)));
  }));
  await check('Admin supply chain: an altered SDK is blocked by integrity and cannot enable sign-in',()=>journey({},async p=>{
    await p.context.route('**/assets/vendor/supabase-2.112.2.js',route=>route.fulfill({contentType:'text/javascript',body:'window.__alteredSDKExecuted=true;'}));
    await p.goto('/admin/');
    assert.equal(await p.page.evaluate(()=>window.__alteredSDKExecuted),undefined);
    assert(await p.page.locator('#adminEmail').isDisabled());
    assert(await p.page.locator('#adminLoginForm button[type="submit"]').isDisabled());
    assert.equal(await p.page.locator('#adminDashboard').isVisible(),false);
  }));
  await check('Service publishing: primary validation works when the compatibility script fails to load',()=>journey({},async p=>{
    await p.context.route('**/admin-service-validation.js?*',route=>route.abort());
    await login(p);const {page,state}=p;
    await page.locator('#serviceTimeInput').fill('');await page.locator('#saveServiceButton').click();
    assert.match(await page.locator('#serviceDraftStatus').innerText(),/valid service time/);
    assert(!state.requests.some(r=>r.method==='PATCH'));
    await page.locator('#serviceTimeInput').fill('15:30');state.delay=100;
    await page.locator('#saveServiceButton').click();assert(await page.locator('#serviceTimeInput').isDisabled());
    await page.waitForFunction(()=>document.querySelector('#serviceDraftStatus').textContent.startsWith('Published.'));
    assert.equal(state.data.service_settings[0].service_time,'15:30');assert(!(await page.locator('#serviceTimeInput').isDisabled()));
  }));
  await check('Admin: sign-in, keyboard tabs, bilingual editor, save, and private-data cleanup',()=>journey({theme:'dark',viewport:{width:1440,height:900}},async p=>{
    await login(p);const {page,state}=p;await page.locator('[data-admin-section="service"]').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-admin-section="announcements"]').getAttribute('aria-selected'),'true');
    await page.locator('[data-announcement-index="0"]').click();await page.locator('#announcementTitleEn').fill('Updated locally');
    await page.evaluate(axe.source);
    assert.deepEqual(await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id)}),[],'Authenticated dark announcement editor must have readable tags');
    await page.locator('.announcement-lang-tab[data-announcement-lang="es"]').click();await page.locator('#announcementTitleEs').fill('Actualizado localmente');
    await page.locator('#saveAnnouncementButton').click();await page.waitForFunction(()=>document.querySelector('#announcementDraftStatus').textContent.startsWith('Saved.'));
    assert.equal(state.data.announcements[0].title_es,'Actualizado localmente');
    await page.locator('#signOutButton').click();await page.locator('#adminLoginView').waitFor({state:'visible'});
    assert.equal(await page.locator('#announcementTitleEn').inputValue(),'');assert.equal(await page.locator('#adminDashboard').isVisible(),false);
  }));
  await check('Admin newsletter: optional bilingual sections survive the shared save and publication path',()=>journey({viewport:{width:1440,height:900}},async p=>{
    await login(p);const {page,state}=p;await page.locator('[data-admin-section="newsletter"]').click();
    await page.locator('[data-newsletter-id="test-issue-0"]').click();await page.locator('[data-add-optional="custom"]').click();
    await page.locator('[data-field="title_en"]').fill('Fixture extra');await page.locator('[data-field="title_es"]').fill('Sección de prueba');
    await page.locator('[data-field="body_en"]').fill('Local test only.');await page.locator('[data-field="body_es"]').fill('Solo prueba local.');
    await page.locator('[data-editor-lang="es"]').click();
    assert.equal(await page.locator('.preview-newsletter').getAttribute('lang'),'es');
    assert.equal(await page.locator('[data-field="body_es"]').evaluate(e=>e.closest('[lang]').lang),'es');
    assert.equal(await page.locator('#titleEs').evaluate(e=>e.closest('[lang]').lang),'es');
    await page.locator('#publishButton').click();await page.waitForFunction(()=>document.querySelector('#draftStatus').textContent.startsWith('Published.'));
    assert.equal(state.data.newsletters[0].optional_sections[0].body_es,'Solo prueba local.');
    assert.equal(await page.locator('[data-field="body_es"]').inputValue(),'Solo prueba local.');
  }));
  await check('Announcement lifecycle: create, save, publish, hide, and confirmed deletion',()=>journey({},async p=>{
    await login(p);const {page,state}=p;await page.locator('[data-admin-section="announcements"]').click();
    await page.locator('#addAnnouncementButton').click();const id=await page.locator('#announcementId').inputValue();
    await page.locator('#announcementTitleEn').fill('Local lifecycle test');await page.locator('#saveAnnouncementButton').click();
    await page.waitForFunction(()=>document.querySelector('#announcementDraftStatus').textContent.startsWith('Saved as hidden.'));
    assert.equal(state.data.announcements.find(r=>r.id===id).active,false);
    await page.locator('#toggleAnnouncementVisibilityButton').click();await page.waitForFunction(()=>document.querySelector('#announcementDraftStatus').textContent.startsWith('Published.'));
    assert.equal(state.data.announcements.find(r=>r.id===id).active,true);
    await page.locator('#toggleAnnouncementVisibilityButton').click();await page.waitForFunction(()=>document.querySelector('#announcementDraftStatus').textContent.startsWith('Hidden.'));
    await page.locator('#deleteAnnouncementButton').focus();await page.keyboard.press('Enter');await page.locator('#announcementEditorForm').waitFor({state:'hidden'});
    assert(!state.data.announcements.some(r=>r.id===id));assert(await page.locator('#addAnnouncementButton').evaluate(e=>e===document.activeElement));
  }));
  await check('Newsletter lifecycle: draft, publish, unpublish, and confirmed deletion',()=>journey({},async p=>{
    await login(p);const {page,state}=p;await page.locator('[data-admin-section="newsletter"]').click();
    assert.equal(await page.locator('#newsletterEditorForm').isVisible(),false,'Unselected editor must be hidden');await page.locator('#newNewsletterButton').click();
    await page.locator('#issueDate').fill('2026-10-25');await page.locator('#saveNewsletterButton').click();
    await page.waitForFunction(()=>document.querySelector('#draftStatus').textContent.startsWith('Saved privately'));
    assert.equal(state.data.newsletters.find(r=>r.id==='2026-10-25').status,'draft');
    await page.locator('#publishButton').click();await page.waitForFunction(()=>document.querySelector('#draftStatus').textContent.startsWith('Published.'));
    assert.equal(state.data.newsletters.find(r=>r.id==='2026-10-25').status,'published');
    await page.locator('#unpublishNewsletterButton').click();await page.waitForFunction(()=>document.querySelector('#draftStatus').textContent.startsWith('Unpublished.'));
    const issue=state.data.newsletters.find(r=>r.id==='2026-10-25');assert.equal(issue.status,'ready');assert.equal(issue.published_at,null);
    await page.locator('#deleteNewsletterButton').focus();await page.keyboard.press('Enter');await page.locator('#newsletterEditorForm').waitFor({state:'hidden'});
    assert(!state.data.newsletters.some(r=>r.id==='2026-10-25'));assert(await page.locator('#newNewsletterButton').evaluate(e=>e===document.activeElement));
  }));
  await check('Cross-tab sign-out clears the other tab’s private editor',()=>journey({},async p=>{
    await login(p);const other=await p.context.newPage();await other.goto(site.url+'/admin/',{waitUntil:'networkidle'});await other.locator('#adminDashboard').waitFor({state:'visible'});
    await other.locator('[data-admin-section="newsletter"]').click();await other.locator('[data-newsletter-id="test-issue-0"]').click();
    await other.locator('#titleEn').fill('Private unsaved fixture');await p.page.locator('#signOutButton').click();
    await other.locator('#adminLoginView').waitFor({state:'visible'});assert.equal(await other.locator('#titleEn').inputValue(),'');
  }));
  await check('Session restore: sign-out during another tab’s initial content load cannot reveal private content',()=>journey({},async p=>{
    p.state.data.newsletters.unshift({...p.state.data.newsletters[0],id:'private-draft',status:'draft',published_at:null,title_en:'Private fixture draft'});
    await login(p);await p.page.waitForFunction(()=>!document.querySelector('#serviceTimeInput').disabled);
    const other=await p.context.newPage();let release;
    const pending=new Promise(resolve=>{release=resolve});
    await p.context.route(/\/rest\/v1\/(service_settings|announcements|newsletters)\?/,async route=>{
      if(route.request().frame().page()===other)await pending;
      await route.fallback();
    });
    try {
      await other.goto(site.url+'/admin/',{waitUntil:'domcontentloaded'});
      await other.locator('#adminDashboard').waitFor({state:'visible'});
      await p.page.locator('#signOutButton').click();await p.page.locator('#adminLoginView').waitFor({state:'visible'});
      await p.page.waitForFunction(()=>!document.querySelector('#signOutButton').disabled);
    } finally {release();}
    await other.waitForLoadState('networkidle');
    assert(await other.locator('#adminLoginView').isVisible());
    assert.equal(await other.locator('#serviceLabelEn').inputValue(),'');
    assert.equal(await other.locator('#adminNewsletterList').innerText(),'No newsletters match this filter.');
  }));
  await check('Owner controls: fixture invitation, role change, removal, and self-access safeguards',()=>journey({owner:true},async p=>{
    await login(p);const {page,state}=p;await page.locator('#administratorsTab').click();
    const self=page.locator('.administrator-item').filter({hasText:'admin@example.test'});
    await self.waitFor();assert(await self.locator('select').isDisabled());assert(await self.locator('button').isDisabled());
    await page.locator('#newAdministratorEmail').fill('invited@example.test');state.delay=100;
    await page.locator('#inviteAdministratorForm button').click();assert(await page.locator('#newAdministratorEmail').isDisabled());
    await page.waitForFunction(()=>document.querySelector('#administratorInviteStatus').textContent.includes('Invitation sent'));
    await page.locator('#newAdministratorEmail').waitFor({state:'visible'});
    const invited=page.locator('.administrator-item').filter({hasText:'invited@example.test'});await invited.waitFor();
    await invited.locator('select').focus();await invited.locator('select').selectOption('owner');await page.waitForFunction(()=>[...document.querySelectorAll('.administrator-item')].some(row=>row.textContent.includes('invited@example.test')&&row.querySelector('.administrator-role').textContent==='Owner'));
    assert.equal(state.adminDirectory.find(row=>row.email==='invited@example.test').role,'owner');
    assert(await invited.locator('select').evaluate(e=>e===document.activeElement));
    await invited.locator('button').focus();await page.keyboard.press('Enter');await invited.waitFor({state:'hidden'});
    assert(!state.adminDirectory.some(row=>row.email==='invited@example.test'));
    assert(await page.locator('#refreshAdministratorsButton').evaluate(e=>e===document.activeElement));
    await page.locator('#refreshAdministratorsButton').click();await self.waitFor();
  }));
  await check('Owner invitation failure: email is retained, retry succeeds, and sign-out clears the list',()=>journey({owner:true},async p=>{
    await login(p);const {page,state}=p;await page.locator('#administratorsTab').click();
    await page.locator('.administrator-item').first().waitFor();state.functionError='Local fixture failure';
    await page.locator('#newAdministratorEmail').fill('retry@example.test');await page.locator('#inviteAdministratorForm button').click();
    await page.waitForFunction(()=>document.querySelector('#administratorInviteStatus').textContent&&document.querySelector('#inviteAdministratorForm').getAttribute('aria-busy')==='false');
    assert.equal(await page.locator('#newAdministratorEmail').inputValue(),'retry@example.test');
    assert(await page.locator('#newAdministratorEmail').isEnabled());state.functionError=null;
    await page.locator('#inviteAdministratorForm button').click();await page.waitForFunction(()=>document.querySelector('#administratorInviteStatus').textContent.includes('Invitation sent'));
    await page.locator('#signOutButton').click();await page.locator('#adminLoginView').waitFor({state:'visible'});
    assert.equal(await page.locator('#administratorList').innerText(),'');assert.equal(await page.locator('#newAdministratorEmail').inputValue(),'');
  }));
  await check('Backend outage: translated errors recover through every public retry control',()=>journey({lang:'es'},async({page,state,goto})=>{
    state.offline=true;await goto();
    assert(await page.locator('#serviceRetry').isVisible());assert(await page.locator('#announcementsRetry').isVisible());
    assert.match(await page.locator('#announcementList').innerText(),/No pudimos/);
    state.offline=false;await page.locator('#serviceRetry').click();await page.locator('#announcementsRetry').click();
    await page.locator('#serviceRetry').waitFor({state:'hidden'});await page.locator('#announcementsRetry').waitFor({state:'hidden'});
    state.offline=true;await goto('/newsletter/');assert(await page.locator('#newsletterRetry').isVisible());assert(await page.locator('#newsletterTools').isHidden());
    state.offline=false;await page.locator('#newsletterRetry').click();await page.locator('#newsletterRetry').waitFor({state:'hidden'});
    assert.match(await page.locator('#latestNewsletter h2').innerText(),/Boletín/);assert(await page.locator('#newsletterTools').isVisible());
  }));
  await check('Clipboard denied: the address remains selectable and newsletter sharing explains the fallback',()=>journey({lang:'es',clipboardDenied:true},async({page,goto})=>{
    await goto();await page.locator('#copyAddress').click();
    assert.match(await page.evaluate(()=>getSelection().toString()),/2149 W Washington/);
    assert.match(await page.locator('#copyStatus').innerText(),/Selecciona/);
    await goto('/newsletter/');await page.locator('#copyNewsletterLink').click();
    assert.match(await page.locator('#newsletterToolStatus').innerText(),/direcciones/);
  }));
  await check('Newsletter creation: another tab’s new issue cannot be overwritten by a stale draft',()=>journey({},async p=>{
    await login(p);const {page,state}=p;await page.locator('[data-admin-section="newsletter"]').click();await page.locator('#newNewsletterButton').click();
    await page.locator('#issueDate').fill('2026-11-01');await page.locator('#titleEn').fill('My unsaved draft');
    state.data.newsletters.push({...state.data.newsletters[0],id:'2026-11-01',issue_date:'2026-11-01',title_en:'Created by another tab'});
    await page.locator('#saveNewsletterButton').click();await page.waitForFunction(()=>document.querySelector('#draftStatus').textContent&&document.querySelector('[data-admin-panel="newsletter"]').getAttribute('aria-busy')==='false');
    assert.equal(state.data.newsletters.find(row=>row.id==='2026-11-01').title_en,'Created by another tab');
    assert.equal(await page.locator('#titleEn').inputValue(),'My unsaved draft');assert.match(await page.locator('#draftStatus').innerText(),/already exists/);
  }));
  await check('Deleted records: a stale newsletter or announcement editor cannot recreate them',()=>journey({},async p=>{
    await login(p);const {page,state}=p;
    await page.locator('[data-admin-section="newsletter"]').click();await page.locator('[data-newsletter-id="test-issue-0"]').click();
    state.data.newsletters=state.data.newsletters.filter(row=>row.id!=='test-issue-0');await page.locator('#saveNewsletterButton').click();
    await page.waitForFunction(()=>document.querySelector('#draftStatus').textContent&&document.querySelector('[data-admin-panel="newsletter"]').getAttribute('aria-busy')==='false');
    assert(!state.data.newsletters.some(row=>row.id==='test-issue-0'));assert.match(await page.locator('#draftStatus').innerText(),/Could not save/);
    await page.locator('[data-admin-section="announcements"]').click();await page.locator('[data-announcement-index="0"]').click();
    state.data.announcements=[];await page.locator('#saveAnnouncementButton').click();
    await page.waitForFunction(()=>document.querySelector('#announcementDraftStatus').textContent&&document.querySelector('[data-admin-panel="announcements"]').getAttribute('aria-busy')==='false');
    assert.equal(state.data.announcements.length,0);assert.match(await page.locator('#announcementDraftStatus').innerText(),/Could not save/);
  }));
  for (const editor of [
    {section:'service',control:'#serviceLabelEn',ready:'#serviceTimeInput'},
    {section:'announcements',control:'#addAnnouncementButton',ready:'[data-announcement-index="0"]'},
    {section:'newsletter',control:'#newNewsletterButton',ready:'[data-newsletter-id="test-issue-0"]'}
  ]) await check(`Editor loading: ${editor.section} cannot accept a draft that the initial response would erase`,()=>journey({},async p=>{
    p.state.delay=600;await login(p);const {page}=p;
    assert(await page.locator(editor.control).isDisabled());
    await page.locator(`[data-admin-section="${editor.section}"]`).click();
    await page.waitForFunction(section=>document.querySelector(`[data-admin-panel="${section}"]`).getAttribute('aria-busy')!=='true',editor.section);
    assert(await page.locator(editor.control).isEnabled());assert(await page.locator(editor.ready).isVisible());
  }));
  await check('Admin accessibility: increased text spacing keeps the narrow announcement filter usable',()=>journey({viewport:{width:320,height:900}},async p=>{
    await p.context.route('**/__text-spacing.css',route=>route.fulfill({contentType:'text/css',body:'*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'}));
    await login(p);const {page}=p;await page.locator('[data-admin-section="announcements"]').click();
    await page.evaluate(()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/__text-spacing.css';document.head.append(link)});
    await page.waitForFunction(()=>[...document.styleSheets].some(s=>s.href?.endsWith('/__text-spacing.css')));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const box=await page.locator('#announcementFilter').boundingBox();assert(box.x>=0&&box.x+box.width<=320);
    await page.locator('#announcementFilter').selectOption('hidden');assert.equal(await page.locator('#announcementCount').innerText(),'0 announcements');
    await page.locator('#announcementFilter').selectOption('active');assert.equal(await page.locator('#announcementCount').innerText(),'1 announcement');
  }));
  await check('Admin accessibility: reduced motion brings focused fields into view without smooth scrolling',()=>journey({viewport:{width:844,height:320}},async p=>{
    await login(p);const {page}=p;
    await page.waitForFunction(()=>!document.querySelector('#serviceMessageEs').disabled);
    await page.locator('#serviceMessageEs').focus();
    assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).scrollBehavior),'auto');
    // Browsers may align the caret rather than the whole textarea. Require the
    // focused control to be visible, without prescribing native alignment.
    await page.waitForFunction(()=>{const r=document.querySelector('#serviceMessageEs').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0});
    assert(await page.locator('#serviceMessageEs').evaluate(e=>e===document.activeElement));
    await page.locator('#serviceDraftStatus').evaluate(e=>{e.textContent='Test announcement'});
    assert.equal(await page.locator('#serviceDraftStatus').getAttribute('role'),'status');
  }));
  for (const editor of [
    {section:'service',table:'service_settings',field:'#serviceLabelEn',save:'#saveServiceButton',status:'#serviceDraftStatus',key:'service_label_en'},
    {section:'announcements',table:'announcements',select:'[data-announcement-index="0"]',field:'#announcementTitleEn',save:'#saveAnnouncementButton',status:'#announcementDraftStatus',key:'title_en'},
    {section:'newsletter',table:'newsletters',select:'[data-newsletter-id="test-issue-0"]',field:'#titleEn',save:'#saveNewsletterButton',status:'#draftStatus',key:'title_en'}
  ]) await check(`Concurrent edit: ${editor.section} preserves both the newer record and the unsaved draft`,()=>journey({},async p=>{
    await login(p);const {page,state}=p;await page.locator(`[data-admin-section="${editor.section}"]`).click();
    if(editor.select)await page.locator(editor.select).click();
    await page.locator(editor.field).fill('My unsaved draft');
    state.data[editor.table][0][editor.key]='Saved by another session';
    state.data[editor.table][0].updated_at='2026-10-18T00:00:00.123457+00:00';
    await page.locator(editor.save).click();
    await page.waitForFunction(({section,status})=>document.querySelector(status).textContent&&document.querySelector(`[data-admin-panel="${section}"]`).getAttribute('aria-busy')==='false',editor);
    assert.equal(state.data[editor.table][0][editor.key],'Saved by another session');
    assert.equal(await page.locator(editor.field).inputValue(),'My unsaved draft');
    assert.match(await page.locator(editor.status).innerText(),/changed|no longer exists/);
    assert(await page.locator(editor.save).isEnabled());
  }));
  for (const editor of [
    {section:'announcements',table:'announcements',select:'[data-announcement-index="0"]',button:'#deleteAnnouncementButton',status:'#announcementDraftStatus'},
    {section:'newsletter',table:'newsletters',select:'[data-newsletter-id="test-issue-0"]',button:'#deleteNewsletterButton',status:'#draftStatus'}
  ]) await check(`Concurrent deletion: ${editor.section} cannot delete a version the editor has not seen`,()=>journey({},async p=>{
    await login(p);const {page,state}=p;await page.locator(`[data-admin-section="${editor.section}"]`).click();await page.locator(editor.select).click();
    const row=state.data[editor.table][0];row.title_en='Newer version';row.updated_at='2026-10-18T00:00:00.123457+00:00';
    await page.locator(editor.button).click();
    await page.waitForFunction(({section})=>document.querySelector(`[data-admin-panel="${section}"]`).getAttribute('aria-busy')==='false',editor);
    assert(state.data[editor.table].some(item=>item.id===row.id&&item.title_en==='Newer version'));
    assert.match(await page.locator(editor.status).innerText(),/changed|no longer exists/);
  }));
  await check('Unsaved content: cancelling another announcement selection preserves the current draft',()=>journey({},async p=>{
    p.state.data.announcements.push({...p.state.data.announcements[0],id:'second-announcement',title_en:'Second announcement'});
    await login(p);const {page}=p;await page.locator('[data-admin-section="announcements"]').click();await page.locator('[data-announcement-index="0"]').click();
    await page.locator('#announcementTitleEn').fill('Keep my unsaved announcement');
    const dialogs=[];let discard=false;page.removeAllListeners('dialog');page.on('dialog',async d=>{dialogs.push(d.type());await(discard?d.accept():d.dismiss())});
    await page.locator('[data-announcement-index="1"]').click();
    assert.equal(await page.locator('#announcementTitleEn').inputValue(),'Keep my unsaved announcement');assert.deepEqual(dialogs,['confirm']);
    discard=true;await page.locator('[data-announcement-index="1"]').click();assert.equal(await page.locator('#announcementTitleEn').inputValue(),'Second announcement');
  }));
  await check('Unsaved content: cancelling a new newsletter preserves optional bilingual fields',()=>journey({},async p=>{
    await login(p);const {page}=p;await page.locator('[data-admin-section="newsletter"]').click();await page.locator('[data-newsletter-id="test-issue-0"]').click();
    await page.locator('[data-add-optional="custom"]').click();await page.locator('[data-field="body_en"]').fill('Unsaved optional English');await page.locator('[data-field="body_es"]').fill('Contenido adicional sin guardar');
    const dialogs=[];page.removeAllListeners('dialog');page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss()});
    await page.locator('#newNewsletterButton').click();
    assert.equal(await page.locator('[data-field="body_en"]').inputValue(),'Unsaved optional English');assert.equal(await page.locator('[data-field="body_es"]').inputValue(),'Contenido adicional sin guardar');
    assert.deepEqual(dialogs,['confirm']);
  }));
  await check('Unsaved content: navigation can be cancelled, and a successful save removes the warning',()=>journey({},async p=>{
    await login(p);const {page}=p;await page.locator('#serviceLabelEn').fill('Unsaved service title');
    const dialogs=[];page.removeAllListeners('dialog');page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss()});
    await page.locator('.admin-back-link').click();assert(new URL(page.url()).pathname.startsWith('/admin/'));assert.deepEqual(dialogs,['beforeunload']);
    await page.locator('#saveServiceButton').click();await page.waitForFunction(()=>document.querySelector('#serviceDraftStatus').textContent.startsWith('Published.'));
    await page.locator('.admin-back-link').click();await page.waitForURL(site.url+'/');assert.deepEqual(dialogs,['beforeunload']);
  }));
  await check('Unsaved content: reverted edits and language or theme controls do not warn',()=>journey({},async p=>{
    await login(p);const {page}=p;const original=await page.locator('#serviceLabelEn').inputValue();
    await page.locator('#serviceLabelEn').fill('Temporary edit');await page.locator('#serviceLabelEn').fill(original);
    await page.locator('#themeToggle').click();await page.locator('[data-admin-section="newsletter"]').click();await page.locator('[data-newsletter-id="test-issue-0"]').click();
    await page.locator('[data-editor-lang="es"]').click();
    const dialogs=[];page.removeAllListeners('dialog');page.on('dialog',async d=>{dialogs.push(d.type());await d.accept()});
    await page.locator('[data-newsletter-id="test-issue-1"]').click();await page.locator('.admin-back-link').click();await page.waitForURL(site.url+'/');assert.deepEqual(dialogs,[]);
  }));
  await check('Unsaved content: saved optional sections are clean, but removing one warns',()=>journey({},async p=>{
    await login(p);const {page}=p;await page.locator('[data-admin-section="newsletter"]').click();await page.locator('[data-newsletter-id="test-issue-0"]').click();
    await page.locator('[data-add-optional="custom"]').click();await page.locator('[data-field="body_en"]').fill('Saved optional English');await page.locator('[data-field="body_es"]').fill('Contenido guardado');
    await page.locator('#saveNewsletterButton').click();await page.waitForFunction(()=>document.querySelector('#draftStatus').textContent.startsWith('Saved.'));
    const dialogs=[];page.removeAllListeners('dialog');page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss()});
    await page.locator('[data-newsletter-id="test-issue-0"]').click();assert.deepEqual(dialogs,[]);
    await page.locator('[data-remove-optional]').click();await page.locator('[data-newsletter-id="test-issue-1"]').click();assert.deepEqual(dialogs,['confirm']);
    assert.equal(await page.locator('#titleEn').inputValue(),'Community issue 1');
  }));
  await check('Unsaved content: sign-out clears private drafts and removes navigation warnings',()=>journey({},async p=>{
    await login(p);const {page}=p;await page.locator('#serviceLabelEn').fill('Private unsaved fixture');
    const dialogs=[];page.removeAllListeners('dialog');page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss()});
    await page.locator('#signOutButton').click();await page.waitForFunction(()=>!document.querySelector('#adminLoginView').classList.contains('hidden'));
    assert.equal(await page.locator('#serviceLabelEn').inputValue(),'');await page.locator('.admin-back-link').click();await page.waitForURL(site.url+'/');assert.deepEqual(dialogs,[]);
  }));
  const report={checkedAt:new Date().toISOString(),engine,browser:browser.version(),mode:'local site and entirely mocked backend; no production writes',filter:process.env.BROWSER_TEST_FILTER||null,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
  const output=process.env.BROWSER_REPORT_PATH||path.resolve(__dirname,'../security/local-results/browser-regression.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  await browser.close();await site.close();console.log(`${report.passed}/${results.length} browser journeys passed`);if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exit(1)});

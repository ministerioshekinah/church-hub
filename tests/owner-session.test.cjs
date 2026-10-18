const test = require('node:test');
const assert = require('node:assert/strict');
const {page, click, read} = require('./helpers.cjs');
const settle = () => new Promise(resolve => setImmediate(resolve));

async function ownerPage(role = 'owner') {
  const p = await page('admin/index.html');
  p.run(`
    authenticatedAdmin={id:'test-owner'};
    supabaseClient={
      auth:{getUser:async()=>({data:{user:{id:'test-owner'}}})},
      from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:${JSON.stringify(role)}}})})})}),
      functions:{invoke:async()=>({data:{admins:[{id:'test-owner',email:'owner@example.test',role:'owner'}]}})}
    };
  `);
  p.run(read('administrators.js'));
  await settle();
  return p;
}

test('Owner session: verified owner controls use the primary authenticated client', async () => {
  const p = await ownerPage();
  assert.equal(p.document.getElementById('administratorsTab').hidden, false);
  assert(!read('administrators.js').includes('createClient('));
  click(p, p.document.getElementById('administratorsTab')); await settle();
  assert.match(p.document.getElementById('administratorList').textContent, /owner@example.test/);
  assert.equal(p.document.getElementById('administratorsTab').getAttribute('aria-selected'), 'true');
});

test('Owner session: content admins do not receive owner controls', async () => {
  const p = await ownerPage('admin');
  assert.equal(p.document.getElementById('administratorsTab').hidden, true);
  assert.equal(p.document.getElementById('administratorsPanel').hidden, true);
});

test('Owner session: signing out clears private list content and selected owner state', async () => {
  const p = await ownerPage();
  click(p, p.document.getElementById('administratorsTab')); await settle();
  p.run('showLogin()');
  assert.equal(p.document.getElementById('administratorList').textContent, '');
  assert.equal(p.document.getElementById('administratorsTab').hidden, true);
  assert.equal(p.document.querySelector('[role="tab"][aria-selected="true"]').dataset.adminSection, 'service');
});

test('Owner session: delayed role verification cannot restore access after sign-out', async () => {
  const p = await ownerPage('admin');
  p.run('let releaseMembership; supabaseClient.from=()=>({select:()=>({eq:()=>({maybeSingle:()=>new Promise(resolve=>{releaseMembership=resolve;})})})}); window.SHEKINAH_OWNER.refresh();');
  await settle();
  p.run('showLogin(); releaseMembership({data:{role:"owner"}});');
  await settle();
  assert.equal(p.document.getElementById('administratorsTab').hidden, true);
});

test('Owner session: a late list response cannot expose administrator emails after sign-out', async () => {
  const p = await ownerPage();
  p.run('let releaseList; supabaseClient.functions.invoke=()=>new Promise(resolve=>{releaseList=resolve;});');
  click(p, p.document.getElementById('administratorsTab'));
  p.run('showLogin(); releaseList({data:{admins:[{id:"test-owner",email:"late@example.test",role:"owner"}]}});');
  await settle();
  assert.equal(p.document.getElementById('administratorList').textContent, '');
  assert.equal(p.document.getElementById('administratorListStatus').textContent, '');
});

test('Owner session: returning owner can refresh controls after a new sign-in', async () => {
  const p = await ownerPage();
  p.run('showLogin(); authenticatedAdmin={id:"test-owner"}; window.SHEKINAH_OWNER.refresh();');
  await settle();
  assert.equal(p.document.getElementById('administratorsTab').hidden, false);
  assert.equal(p.document.getElementById('administratorList').textContent, '');
});

function submitInvitation(p, email) {
  p.document.getElementById('newAdministratorEmail').value=email;
  p.document.getElementById('inviteAdministratorForm').dispatchEvent(new p.Event('submit',{bubbles:true,cancelable:true}));
}

test('Owner invitation: pending input stays stable and duplicate submissions are ignored', async () => {
  const p=await ownerPage();
  p.run('let finishInvite; let inviteCalls=0; supabaseClient.functions.invoke=async(_,request)=>{if(request.body.action==="list")return {data:{admins:[]}}; ++inviteCalls;return new Promise(resolve=>{finishInvite=resolve});};');
  submitInvitation(p,'FIRST@example.test');
  assert.equal(p.document.getElementById('newAdministratorEmail').disabled,true);
  assert.equal(p.document.getElementById('inviteAdministratorForm').getAttribute('aria-busy'),'true');
  p.document.getElementById('inviteAdministratorForm').dispatchEvent(new p.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(p.run('inviteCalls'),1);
  p.run('finishInvite({data:{invited:true}})');await settle();
  assert.equal(p.document.getElementById('newAdministratorEmail').value,'');
  assert.equal(p.document.getElementById('newAdministratorEmail').disabled,false);
  assert.equal(p.document.getElementById('administratorInviteStatus').getAttribute('role'),'status');
  assert.match(p.document.getElementById('administratorInviteStatus').textContent,/Invitation sent/);
});

test('Owner invitation: a failed request preserves the email and releases the form', async () => {
  const p=await ownerPage();
  p.run('supabaseClient.functions.invoke=async()=>({error:new Error("Connection interrupted")});');
  submitInvitation(p,'retry@example.test');await settle();
  assert.equal(p.document.getElementById('newAdministratorEmail').value,'retry@example.test');
  assert.equal(p.document.getElementById('newAdministratorEmail').disabled,false);
  assert.equal(p.document.getElementById('inviteAdministratorForm').getAttribute('aria-busy'),'false');
  assert.match(p.document.getElementById('administratorInviteStatus').textContent,/Connection interrupted/);
});

test('Owner invitation: an old response cannot unlock a new session invitation', async () => {
  const p=await ownerPage();
  p.run('let finishOld, finishNew; supabaseClient.functions.invoke=()=>new Promise(resolve=>{finishOld=resolve});');
  submitInvitation(p,'old@example.test');
  p.run('showLogin(); authenticatedAdmin={id:"test-owner"};window.SHEKINAH_OWNER.refresh();');await settle();
  p.run('supabaseClient.functions.invoke=()=>new Promise(resolve=>{finishNew=resolve});');
  submitInvitation(p,'new@example.test');
  p.run('finishOld({data:{invited:true}})');await settle();
  assert.equal(p.document.getElementById('newAdministratorEmail').value,'new@example.test');
  assert.equal(p.document.getElementById('newAdministratorEmail').disabled,true);
  assert.equal(p.document.getElementById('administratorInviteStatus').textContent,'');
  p.run('finishNew({error:new Error("Local fixture complete")})');await settle();
  assert.equal(p.document.getElementById('newAdministratorEmail').disabled,false);
});

test('Owner list: an older refresh cannot replace the latest access list', async () => {
  const p=await ownerPage();
  p.run('let listResponses=[];supabaseClient.functions.invoke=()=>new Promise(resolve=>listResponses.push(resolve));');
  click(p,p.document.getElementById('administratorsTab'));
  click(p,p.document.getElementById('refreshAdministratorsButton'));
  p.run('listResponses[1]({data:{admins:[{id:"latest",email:"latest@example.test",role:"admin"}]}})');await settle();
  p.run('listResponses[0]({data:{admins:[{id:"stale",email:"removed@example.test",role:"admin"}]}})');await settle();
  assert.match(p.document.getElementById('administratorList').textContent,/latest@example.test/);
  assert(!p.document.getElementById('administratorList').textContent.includes('removed@example.test'));
});

test('Admin session: signing out clears draft fields, previews, and in-memory content', async () => {
  const p=await page('admin/index.html');
  p.run('adminNewsletters=[{id:"private",title_en:"Private title",status:"draft"}]; adminAnnouncements=[{id:"hidden",title_en:"Hidden message",active:false}]; document.getElementById("titleEn").value="Private draft text"; document.getElementById("previewTitle").textContent="Private draft text"; showLogin();');
  assert.equal(p.document.getElementById('titleEn').value,'');
  assert(!p.document.getElementById('previewTitle').textContent.includes('Private draft text'));
  assert.equal(p.run('adminNewsletters.length+adminAnnouncements.length'),0);
  assert(!p.document.getElementById('adminNewsletterList').textContent.includes('Private title'));
});

test('Admin session: a late content response cannot refill the editor after sign-out', async () => {
  const p=await page('admin/index.html');
  p.run('authenticatedAdmin={id:"fixture-admin"};let releaseContent; supabaseClient={from:()=>({select:()=>({abortSignal(){return this},order:()=>new Promise(resolve=>{releaseContent=resolve;})})})}; loadNewsletterEditor(); showLogin(); releaseContent({data:[{id:"private",title_en:"Delayed private draft",status:"draft"}]});');
  await settle();
  assert.equal(p.run('adminNewsletters.length'),0);
  assert(!p.document.getElementById('adminNewsletterList').textContent.includes('Delayed private draft'));
});

test('Admin session: a delayed session restore cannot reopen a signed-out dashboard', async () => {
  const p=await page('admin/index.html');
  p.run('let releaseUser; supabaseClient={auth:{getUser:()=>new Promise(resolve=>{releaseUser=resolve;})}}; restoreAuthenticatedAdmin(); showLogin(); releaseUser({data:{user:{id:"former-owner"}}});');
  await settle();
  assert.equal(p.document.getElementById('adminDashboard').classList.contains('visible'),false);
  assert.equal(p.run('authenticatedAdmin'),null);
});

test('Admin sign-in: an old completion cannot leave logout locked or unlock a newer attempt', async () => {
  const p=await page('admin/index.html');
  p.run(`let pendingLogins=[];supabaseClient={auth:{signInWithPassword:()=>new Promise(resolve=>pendingLogins.push(resolve))}};`);
  const submit=()=>p.document.getElementById('adminLoginForm').dispatchEvent(new p.Event('submit',{bubbles:true,cancelable:true}));
  submit();assert.equal(p.document.getElementById('adminEmail').disabled,true);
  p.run('showLogin()');assert.equal(p.document.getElementById('adminEmail').disabled,false);
  submit();submit();assert.equal(p.run('pendingLogins.length'),2);
  p.run(`pendingLogins[0]({error:{message:'old request'}})`);await settle();
  assert.equal(p.document.getElementById('adminEmail').disabled,true);
  p.run(`pendingLogins[1]({error:{message:'current request'}})`);await settle();
  assert.equal(p.document.getElementById('adminEmail').disabled,false);
});

test('Admin session: pending announcement save cannot restore private form content after sign-out', async () => {
  const p=await page('admin/index.html');
  p.run(`authenticatedAdmin={id:'admin'}; adminAnnouncements=[{id:'private',updated_at:'2026-10-18T00:00:00.123456+00:00',active:false,title_en:'Hidden',title_es:'Oculto'}]; selectAnnouncement(0);
    let releaseSave; supabaseClient=contentClient(()=>new Promise(resolve=>{releaseSave=resolve;}));
    let saveResult; saveAnnouncement().then(result=>{saveResult=result;}); showLogin(); releaseSave({data:{id:'private',updated_at:'2026-10-18T00:00:00.123456+00:00',active:false}});`);
  await settle();
  assert.equal(p.run('saveResult'),null);
  assert.equal(p.run('adminAnnouncements.length'),0);
  assert.equal(p.document.getElementById('announcementTitleEn').value,'');
});

test('Admin session: pending newsletter save cannot restore a signed-out editor', async () => {
  for(const extended of [false,true]) {
    const p=await page('admin/index.html');
    if(extended) p.run(read('newsletter-extensions.js'));
    p.run(`authenticatedAdmin={id:'admin'}; selectedNewsletterId='private';selectedNewsletterVersion='2026-10-18T00:00:00.123456+00:00';
      validateNewsletterForm=()=>({issue_date:'2026-10-13',title_en:'Private',title_es:'Privado'});
      let releaseSave; supabaseClient=contentClient(()=>new Promise(resolve=>{releaseSave=resolve;}));
      let saveResult; persistNewsletter().then(result=>{saveResult=result;}); showLogin(); releaseSave({data:{id:'private',status:'draft'}});`);
    await settle();
    assert.equal(p.run('saveResult'),null);
    assert.equal(p.run('selectedNewsletterId'),null);
    assert.equal(p.run('adminNewsletters.length'),0);
  }
});

test('Admin publishing: saving a live announcement retains the correct visible status', async () => {
  const p=await page('admin/index.html');
  p.run(`authenticatedAdmin={id:'admin'}; adminAnnouncements=[{id:'live',updated_at:'2026-10-18T00:00:00.123456+00:00',active:true,title_en:'Live',title_es:'Publicado'}]; selectAnnouncement(0);
    supabaseClient=contentClient(async()=>({data:{id:'live',updated_at:'2026-10-18T00:00:00.123456+00:00',active:true}}));`);
  click(p,p.document.getElementById('saveAnnouncementButton')); await settle();
  assert.match(p.document.getElementById('announcementDraftStatus').textContent,/Changes are live/);
});

async function servicePage() {
  const p=await page('admin/index.html');
  p.run(`authenticatedAdmin={id:'admin'};
    let serviceWrites=0;serviceVersion='2026-10-18T00:00:00.123456+00:00';
    supabaseClient=Object.assign(contentClient(async()=>{++serviceWrites;return {data:{id:1,updated_at:'2026-10-18T01:00:00+00:00'}}}),{auth:{getUser:async()=>({data:{user:{id:'admin'}}})}});`);
  p.run(read('admin-service-validation.js'));
  return p;
}

test('Admin publishing: service validation rejects an empty or impossible time before writing', async () => {
  for(const value of ['', '24:00', '12:61']) {
    const p=await servicePage();
    p.document.getElementById('serviceTimeInput').value=value;
    click(p,p.document.getElementById('saveServiceButton')); await settle();
    assert.equal(p.run('serviceWrites'),0);
    assert.match(p.document.getElementById('serviceDraftStatus').textContent,/valid service time/);
    assert.equal(p.document.getElementById('saveServiceButton').disabled,false);
  }
});

test('Admin publishing: service succeeds only after the intended row is returned', async () => {
  const p=await servicePage();
  p.document.getElementById('serviceTimeInput').value='15:00';
  click(p,p.document.getElementById('saveServiceButton')); await settle();
  assert.equal(p.run('serviceWrites'),1);
  assert.match(p.document.getElementById('serviceDraftStatus').textContent,/Published/);
});

test('Admin session: service verification cannot publish after sign-out during identity check', async () => {
  const p=await servicePage();
  p.run('let releaseServiceUser; supabaseClient.auth.getUser=()=>new Promise(resolve=>{releaseServiceUser=resolve;});');
  click(p,p.document.getElementById('saveServiceButton'));
  p.run('showLogin(); releaseServiceUser({data:{user:{id:"admin"}}});'); await settle();
  assert.equal(p.run('serviceWrites'),0);
  assert.equal(p.document.getElementById('serviceDraftStatus').textContent,'');
});

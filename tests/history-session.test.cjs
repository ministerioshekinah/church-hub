const test = require('node:test');
const assert = require('node:assert/strict');
const {page, click, read} = require('./helpers.cjs');
const settle = () => new Promise(resolve => setImmediate(resolve));

function lifecycle(p, type, persisted = true) {
  const event = new p.Event(type);
  Object.defineProperty(event, 'persisted', {value:persisted});
  p.browser.dispatchEvent(event);
}

function privateEditor(p) {
  p.run(`authenticatedAdmin={id:'fixture-owner'};
    loginView.classList.add('hidden'); dashboard.classList.add('visible');
    adminNewsletters=[{id:'private',title_en:'Private draft',status:'draft'}];
    document.getElementById('titleEn').value='Private draft text';
    document.getElementById('previewTitle').textContent='Private draft text';
    passwordInput.value='do-not-cache';passwordInput.type='text';`);
}

function assertCleared(p) {
  assert.equal(p.run('authenticatedAdmin'),null);
  assert.equal(p.run('adminNewsletters.length'),0);
  assert.equal(p.document.getElementById('adminDashboard').classList.contains('visible'),false);
  assert.equal(p.document.getElementById('titleEn').value,'');
  assert.equal(p.document.getElementById('adminPassword').value,'');
  assert.equal(p.document.getElementById('adminPassword').type,'password');
  assert(!p.document.getElementById('previewTitle').textContent.includes('Private draft text'));
}

test('History privacy: entering the history cache clears drafts, password, and Owner directory', async () => {
  const p=await page('admin/index.html');privateEditor(p);
  p.run(`supabaseClient={auth:{getUser:async()=>({data:{user:{id:'fixture-owner'}}})},
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'owner'}})})})}),
    functions:{invoke:async()=>({data:{admins:[{id:'fixture-owner',email:'owner@example.test',role:'owner'}]}})}};`);
  p.run(read('administrators.js'));await settle();
  click(p,p.document.getElementById('administratorsTab'));await settle();
  assert.match(p.document.getElementById('administratorList').textContent,/owner@example.test/);
  lifecycle(p,'pagehide');assertCleared(p);
  assert.equal(p.document.getElementById('administratorList').textContent,'');
  assert.equal(p.document.getElementById('administratorsTab').hidden,true);
});

test('History privacy: an ordinary pageshow does not erase an active editor or reload', async () => {
  const p=await page('admin/index.html');privateEditor(p);
  let reloads=0;p.location.reload=()=>{++reloads};
  lifecycle(p,'pageshow',false);await settle();
  assert.equal(p.document.getElementById('titleEn').value,'Private draft text');
  assert.equal(reloads,0);
});

test('History privacy: a persisted pageshow scrubs synchronously and reloads without reusing the old client', async () => {
  const p=await page('admin/index.html');privateEditor(p);
  let reloads=0;p.location.reload=()=>{assertCleared(p);++reloads};
  p.run('supabaseClient={auth:{getUser:()=>{throw Error("Frozen client must not be reused")}}};');
  lifecycle(p,'pageshow');assertCleared(p);assert.equal(reloads,1);
});

test('History privacy: a late content read cannot refill the frozen document after pagehide', async () => {
  const p=await page('admin/index.html');privateEditor(p);
  p.run(`let releaseContent;
    supabaseClient={from:()=>({select:()=>({abortSignal(){return this},order:()=>new Promise(resolve=>{releaseContent=resolve})})})};
    loadNewsletterEditor();`);
  lifecycle(p,'pagehide');
  p.run('releaseContent({data:[{id:"private",title_en:"Late private draft",status:"draft"}]})');await settle();
  assertCleared(p);
  assert(!p.document.getElementById('adminNewsletterList').textContent.includes('Late private draft'));
});

test('History privacy: an old identity restore cannot reopen the cleared document after pageshow', async () => {
  const p=await page('admin/index.html');privateEditor(p);
  let reloads=0;p.location.reload=()=>{++reloads};
  p.run('let releaseIdentity;supabaseClient={auth:{getUser:()=>new Promise(resolve=>{releaseIdentity=resolve})}};restoreAuthenticatedAdmin();');
  lifecycle(p,'pageshow');
  p.run('releaseIdentity({data:{user:{id:"old-admin"}}})');await settle();
  assertCleared(p);assert.equal(reloads,1);
});

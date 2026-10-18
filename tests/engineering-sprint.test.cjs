const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {page, click, read, root} = require('./helpers.cjs');
const settle = () => new Promise(resolve => setImmediate(resolve));
async function admin() {
  const p = await page('admin/index.html');
  p.browser.confirm = () => true;
  p.run(`authenticatedAdmin={id:'test-admin'};
    adminAnnouncements=[{id:'a',active:false,title_en:'A',title_es:'A'},{id:'b',active:false,title_en:'B',title_es:'B'}];
    selectAnnouncement(0);
    adminNewsletters=[{id:'a',issue_date:'2026-10-11',status:'draft',title_en:'A',title_es:'A'},
      {id:'b',issue_date:'2026-10-18',status:'draft',title_en:'B',title_es:'B'}];
    selectNewsletter('a');`);
  return p;
}

test('Fonts: self-hosted bytes match the original provider files and retain both licensed families', () => {
  const provenance = JSON.parse(read('assets/fonts/provenance.json'));
  assert.equal(provenance.files.length, 11);
  for (const font of provenance.files) {
    const bytes = fs.readFileSync(path.join(root, 'assets/fonts', font.file));
    assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), font.sha256);
  }
  const css = read('assets/fonts/fonts.css');
  assert.equal((css.match(/@font-face/g)||[]).length, 36);
  assert(!css.includes('https:'));
  assert.match(css, /font-family: 'Inter'/);
  assert.match(css, /font-family: 'Playfair Display'/);
  for(const family of ['inter','playfairdisplay'])assert.match(read(`assets/fonts/${family}-OFL.txt`), /SIL OPEN FONT LICENSE/);
  assert.match(read('style.css'), /font-family: "Inter", sans-serif/);
  assert.match(read('style.css'), /font-family: "Playfair Display", serif/);
});

test('Information: a shared section follows the visible language and preserves its query', async () => {
  const p = await page('privacy/index.html', {reduced:true});
  p.location.href='https://mcshekinah.org/privacy/?source=church#section-en-3';
  click(p,p.document.querySelector('[data-lang="es"]'));
  assert.equal(p.location.hash,'#section-es-3');
  assert.equal(p.location.search,'?source=church');
  assert.equal(p.document.getElementById('section-es-3').closest('[data-language-content]').hidden,false);
  click(p,p.document.querySelector('[data-lang="en"]'));
  assert.equal(p.location.hash,'#section-en-3');
  assert(p.reports.scrolls.length>=2);
});

test('Information: unrecognized section hashes cannot create redirects or selectors', async () => {
  const p = await page('privacy/index.html', {reduced:true});
  p.location.hash='#section-en-999';
  click(p,p.document.querySelector('[data-lang="es"]'));
  assert.equal(p.location.hash,'#section-en-999');
  assert.equal(p.location.origin,'https://mcshekinah.org');
});

test('Announcement deletion: a delayed response removes its captured ID and preserves another selection', async () => {
  const p = await admin();
  p.run(`let finishDelete;supabaseClient={from:()=>({delete:()=>({eq:()=>({select:()=>({maybeSingle:()=>new Promise(r=>{finishDelete=r})})})})})};`);
  click(p,p.document.getElementById('deleteAnnouncementButton'));
  assert.equal(p.document.getElementById('announcementTitleEn').disabled,true);
  p.run(`selectAnnouncement(1);finishDelete({data:{id:'a'},error:null});`);
  await settle();
  assert.equal(p.run('JSON.stringify(adminAnnouncements.map(x=>x.id))'),'["b"]');
  assert.equal(p.run('selectedAnnouncementIndex'),0);
  assert.equal(p.document.getElementById('announcementTitleEn').value,'B');
  assert.equal(p.document.getElementById('announcementEditorForm').classList.contains('hidden'),false);
});

for (const kind of ['Announcement','Newsletter']) {
  const lower=kind.toLowerCase();
  const statusId=kind==='Announcement'?'announcementDraftStatus':'draftStatus';
  test(`${kind} deletion: a zero-row response cannot report success or remove local content`, async () => {
    const p=await admin();
    p.run(`supabaseClient={from:()=>({delete:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data:null,error:null})})})})})};`);
    click(p,p.document.getElementById(`delete${kind}Button`));await settle();
    assert.equal(p.run(kind==='Announcement'?'adminAnnouncements.length':'adminNewsletters.length'),2);
    assert.match(p.document.getElementById(statusId).textContent,/not deleted/);
    assert.equal(p.document.getElementById(`delete${kind}Button`).disabled,false);
  });
  test(`${kind} actions: a thrown network error unlocks the editor and provides retry feedback`, async () => {
    const p=await admin();
    p.run(`supabaseClient={from:()=>({upsert:()=>({select:()=>({single:async()=>{throw new Error('offline')}})})})};`);
    click(p,p.document.getElementById(`save${kind}Button`));await settle();
    assert.equal(p.document.getElementById(`save${kind}Button`).disabled,false);
    assert.match(p.document.getElementById(statusId).textContent,/could not be completed/);
    assert.equal(p.run('editorOperations.size'),0);
  });
}

test('Announcement actions: save and publish cannot overlap while a request is pending', async () => {
  const p=await admin();
  p.run(`let finishSave,requests=0;supabaseClient={from:()=>({upsert:()=>{requests++;return {select:()=>({single:()=>new Promise(r=>{finishSave=r})})}}})};`);
  click(p,p.document.getElementById('saveAnnouncementButton'));
  click(p,p.document.getElementById('toggleAnnouncementVisibilityButton'));
  assert.equal(p.run('requests'),1);
  assert.equal(p.document.getElementById('addAnnouncementButton').disabled,true);
  p.run(`finishSave({data:{id:'a',active:false},error:null});`);await settle();
  assert.equal(p.document.getElementById('addAnnouncementButton').disabled,false);
  assert.equal(p.document.getElementById('announcementTitleEn').disabled,false);
});

test('Announcement save: a late response cannot replace a different open draft', async () => {
  const p=await admin();
  p.run(`let finishSave;supabaseClient={from:()=>({upsert:()=>({select:()=>({single:()=>new Promise(r=>{finishSave=r})})})})};let result;saveAnnouncement().then(r=>{result=r});selectAnnouncement(1);finishSave({data:{id:'a',active:false}});`);
  await settle();
  assert.equal(p.run('result'),null);
  assert.equal(p.document.getElementById('announcementTitleEn').value,'B');
});

test('Newsletter deletion: a late response preserves another open issue', async () => {
  const p=await admin();
  p.run(`let finishDelete;supabaseClient={from:()=>({delete:()=>({eq:()=>({select:()=>({maybeSingle:()=>new Promise(r=>{finishDelete=r})})})})})};`);
  click(p,p.document.getElementById('deleteNewsletterButton'));
  p.run(`selectNewsletter('b');finishDelete({data:{id:'a'},error:null});`);await settle();
  assert.equal(p.run('selectedNewsletterId'),'b');
  assert.equal(p.run('JSON.stringify(adminNewsletters.map(x=>x.id))'),'["b"]');
  assert.equal(p.document.getElementById('titleEn').value,'B');
});

for(const extended of [false,true])test(`Newsletter save: another selection survives a delayed save (${extended?'optional editor':'base editor'})`,async()=>{
  const p=await admin();
  if(extended)p.run(read('newsletter-extensions.js'));
  p.run(`let finishSave;supabaseClient={from:()=>({upsert:()=>({select:()=>({single:()=>new Promise(r=>{finishSave=r})})})})};let result;persistNewsletter().then(r=>{result=r});selectNewsletter('b');finishSave({data:{id:'a',status:'draft'}});`);
  await settle();
  assert.equal(p.run('result'),null);
  assert.equal(p.run('selectedNewsletterId'),'b');
  assert.equal(p.document.getElementById('titleEn').value,'B');
});

test('Newsletter persistence: optional sections use the same guarded writer', async () => {
  const p=await admin();p.run(read('newsletter-extensions.js'));
  p.run(`adminNewsletters[0].optional_sections=[{id:'test',type:'custom',title_en:'Extra',title_es:'Más',body_en:'Hello',body_es:'Hola'}];selectNewsletter('a');
    let payload;supabaseClient={from:()=>({upsert:value=>{payload=value;return {select:()=>({single:async()=>({data:{id:'a',status:'draft'}})})}}})};loadNewsletterEditor=async()=>{};`);
  await p.run('persistNewsletter()');
  assert.equal(p.run('payload.optional_sections[0].body_es'),'Hola');
  assert(!read('newsletter-extensions.js').includes('persistNewsletter = async'));
});

test('Editor session: an old request cannot unlock a newer signed-in operation', async () => {
  const p=await admin();
  p.run(`let completions=[];supabaseClient={from:()=>({upsert:()=>({select:()=>({single:()=>new Promise(r=>completions.push(r))})})})};`);
  click(p,p.document.getElementById('saveAnnouncementButton'));
  p.run(`showLogin();authenticatedAdmin={id:'second-admin'};adminAnnouncements=[{id:'b',active:false,title_en:'B',title_es:'B'}];selectAnnouncement(0);`);
  click(p,p.document.getElementById('saveAnnouncementButton'));
  p.run(`completions[0]({data:{id:'a',active:false}});`);await settle();
  assert.equal(p.document.getElementById('saveAnnouncementButton').disabled,true);
  assert.equal(p.document.getElementById('announcementTitleEn').value,'B');
  p.run(`completions[1]({data:{id:'b',active:false}});`);await settle();
  assert.equal(p.document.getElementById('saveAnnouncementButton').disabled,false);
});

test('Service publishing: the primary bundle rejects zero-row updates without the compatibility extension', async () => {
  const p=await admin();
  p.document.getElementById('serviceTimeInput').value='15:00';
  p.run(`supabaseClient={auth:{getUser:async()=>({data:{user:{id:'test-admin'}}})},from:()=>({update:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data:null,error:null})})})})})};`);
  click(p,p.document.getElementById('saveServiceButton'));await settle();
  assert.match(p.document.getElementById('serviceDraftStatus').textContent,/row was not updated/);
  assert.equal(p.document.getElementById('serviceTimeInput').disabled,false);
});

test('Service publishing: repeated clicks share one operation and preserve the captured form', async () => {
  const p=await admin();p.document.getElementById('serviceTimeInput').value='15:00';
  p.run(`let finishService,payload,writes=0;supabaseClient={auth:{getUser:async()=>({data:{user:{id:'test-admin'}}})},from:()=>({update:value=>{writes++;payload=value;return {eq:()=>({select:()=>({maybeSingle:()=>new Promise(r=>{finishService=r})})})}}})};`);
  click(p,p.document.getElementById('saveServiceButton'));await settle();
  click(p,p.document.getElementById('saveServiceButton'));
  assert.equal(p.run('writes'),1);assert.equal(p.document.getElementById('serviceTimeInput').disabled,true);
  p.document.getElementById('serviceTimeInput').value='16:00';
  assert.equal(p.run('payload.service_time'),'15:00');
  p.run(`finishService({data:{id:1}})`);await settle();
  assert.equal(p.document.getElementById('serviceTimeInput').disabled,false);
});

test('Service publishing: an old completion cannot unlock the next authenticated save', async () => {
  const p=await admin();p.document.getElementById('serviceTimeInput').value='15:00';
  p.run(`let finishes=[];supabaseClient={auth:{getUser:async()=>({data:{user:{id:authenticatedAdmin.id}}})},from:()=>({update:()=>({eq:()=>({select:()=>({maybeSingle:()=>new Promise(r=>finishes.push(r))})})})})};`);
  click(p,p.document.getElementById('saveServiceButton'));await settle();
  p.run(`showLogin();authenticatedAdmin={id:'second-admin'}`);p.document.getElementById('serviceTimeInput').value='16:00';
  click(p,p.document.getElementById('saveServiceButton'));await settle();
  p.run(`finishes[0]({data:{id:1}})`);await settle();
  assert.equal(p.document.getElementById('saveServiceButton').disabled,true);
  p.run(`finishes[1]({data:{id:1}})`);await settle();
  assert.equal(p.document.getElementById('saveServiceButton').disabled,false);
});

test('Newsletter reset: a closed editor cannot recreate a deleted issue from stale form values', async () => {
  const p=await admin();
  p.run(`let writes=0;supabaseClient={from:()=>{writes++;throw Error('Must not write')}};resetNewsletterEditor();`);
  assert.equal(await p.run('persistNewsletter()'),null);
  assert.equal(p.run('writes'),0);
});

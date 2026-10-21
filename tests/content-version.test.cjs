const test = require('node:test');
const assert = require('node:assert/strict');
const {page, click} = require('./helpers.cjs');
const settle = () => new Promise(resolve => setImmediate(resolve));

const editors = [
  {name:'service', version:'serviceVersion', field:'serviceLabelEn', button:'saveServiceButton', status:'serviceDraftStatus', save:'saveServiceChanges()'},
  {name:'announcements', version:'selectedAnnouncementVersion', field:'announcementTitleEn', button:'saveAnnouncementButton', status:'announcementDraftStatus', save:'saveAnnouncement()'},
  {name:'newsletter', version:'selectedNewsletterVersion', field:'titleEn', button:'saveNewsletterButton', status:'draftStatus', save:'persistNewsletter()'}
];

async function editorPage() {
  const p = await page('admin/index.html');
  p.run(`authenticatedAdmin={id:'test-admin'};
    const originalVersion='2026-10-18T00:00:00.123456+00:00';
    serviceVersion=originalVersion;
    adminAnnouncements=[{id:'a',updated_at:originalVersion,active:false,title_en:'Original',title_es:'Original'}];
    selectAnnouncement(0);
    adminNewsletters=[{id:'n',updated_at:originalVersion,issue_date:'2026-10-18',status:'draft',title_en:'Original',title_es:'Original'}];
    selectNewsletter('n');`);
  p.document.getElementById('serviceTimeInput').value='15:00';
  return p;
}

for (const editor of editors) {
  test(`Content versions: ${editor.name} refuses an unversioned write and preserves its draft`, async () => {
    const p = await editorPage();
    p.document.getElementById(editor.field).value='Unsaved draft';
    p.run(`${editor.version}=null; let requests=0; supabaseClient={from(){requests++;throw Error('Must not write')}};`);
    click(p,p.document.getElementById(editor.button));
    await settle();
    assert.equal(p.run('requests'),0);
    assert.equal(p.document.getElementById(editor.field).value,'Unsaved draft');
    assert.match(p.document.getElementById(editor.status).textContent,/version could not be verified/);
    assert.equal(p.document.getElementById(editor.button).disabled,false);
  });

  test(`Content versions: ${editor.name} uses each returned timestamp without losing microseconds`, async () => {
    const p = await editorPage();
    p.run(`let versions=[],payloads=[];
      supabaseClient=Object.assign(contentClient(async({table,payload,id,filters})=>{
        versions.push(filters.updated_at);
        payloads.push(payload);
        return {data:{...payload,id,updated_at:versions.length===1?'2026-10-18T00:00:00.123457+00:00':'2026-10-18T00:00:00.123458+00:00'}};
      }),{auth:{getUser:async()=>({data:{user:{id:'test-admin'}}})}});`);
    await p.run(editor.save);
    p.document.getElementById(editor.field).value='Second save';
    await p.run(editor.save);
    assert.equal(p.run('JSON.stringify(versions)'),JSON.stringify(['2026-10-18T00:00:00.123456+00:00','2026-10-18T00:00:00.123457+00:00']));
    assert.equal(p.run(editor.version),'2026-10-18T00:00:00.123458+00:00');
    assert.equal(p.document.getElementById(editor.field).value,'Second save');
    for(const payload of JSON.parse(p.run('JSON.stringify(payloads)'))) {
      for(const field of ['created_by','updated_by','created_at','updated_at'])assert(!Object.hasOwn(payload,field),'audit fields belong to the server');
    }
  });

  test(`Content versions: ${editor.name} cannot silently downgrade after an incomplete server response`, async () => {
    const p = await editorPage();
    p.run(`let requests=0;supabaseClient=Object.assign(contentClient(async({payload,id})=>{
      requests++;return {data:{...payload,id}};
    }),{auth:{getUser:async()=>({data:{user:{id:'test-admin'}}})}});`);
    await p.run(editor.save);
    await p.run(editor.save);
    assert.equal(p.run('requests'),1);
    assert.match(p.document.getElementById(editor.status).textContent,/version could not be verified/);
  });
}

test('Content versions: signing out clears all captured versions', async () => {
  const p=await editorPage();p.run('showLogin()');
  for(const editor of editors)assert.equal(p.run(editor.version),null);
});

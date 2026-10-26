const test = require('node:test');
const assert = require('node:assert/strict');
const { review } = require('../admin-content-review.js');
const { page, click, read } = require('./helpers.cjs');
const settle = () => new Promise(resolve => setImmediate(resolve));
const complete = {issue_date:'2026-10-25',title_en:'Our community',title_es:'Nuestra comunidad',gathering_en:'Welcome.',gathering_es:'Bienvenidos.'};

test('Editorial review: exact bilingual starter copy is flagged without rewriting the draft', () => {
  const data = {...complete, scripture_en:'  Add this week’s scripture passage here! ', scripture_es:'AGREGA AQUI EL PASAJE BIBLICO DE ESTA SEMANA.', community_en:'Add church news, reminders, ministry updates, or upcoming activities here.', community_es:'Agrega aquí noticias de la iglesia, recordatorios, actualizaciones de ministerios o próximas actividades.'};
  const original = JSON.stringify(data);
  const items = review(data);
  assert.equal(items.length,4);
  assert(items.every(item=>item.kind==='template'));
  assert.deepEqual(items.map(item=>item.field),['scriptureEn','scriptureEs','communityEn','communityEs']);
  assert.equal(JSON.stringify(data),original);
  assert.deepEqual(review({...complete, scripture_en:'We will add this week’s scripture passage here together.',scripture_es:'Leeremos juntos.'}),[]);
});

test('Editorial review: missing translations describe the actual public fallback in each direction', () => {
  const items = review({...complete, community_en:'Meet at noon.',scripture_es:'Un mensaje en español.'});
  assert.deepEqual(items.map(item=>[item.kind,item.field,item.language]),[['translation','scriptureEn','en'],['translation','communityEs','es']]);
  assert.match(items[0].message,/English readers will not see/);
  assert.match(items[1].message,/Spanish readers will see the English/);
});

test('Editorial review: an entirely empty message is different from intentionally empty sections', () => {
  assert.deepEqual(review(complete),[]);
  const items = review({issue_date:'2026-10-25',title_en:'Title',title_es:'Título'});
  assert.deepEqual(items.map(item=>item.kind),['empty']);
  const optional = [{type:'custom',title_en:'News',title_es:'Noticias',body_en:'Welcome',body_es:'Bienvenidos'}];
  assert.deepEqual(review({issue_date:'2026-10-25',title_en:'Title',title_es:'Título'},optional),[]);
});

test('Editorial review: required fields, optional headings and malformed optional data are handled safely', () => {
  assert.deepEqual(review(null,null).map(item=>item.kind),['required','required','required','empty']);
  const items=review(complete,[null,7,{key:'scripture',type:'custom',body_en:'English only.'}]);
  assert.deepEqual(items.map(item=>[item.kind,item.field,item.index]),[['heading','title_en',2],['translation','body_es',2]]);
});

test('Editorial review: duplicate important banners are evaluated in each language with English fallback', () => {
  const optional = [
    {type:'important_announcement',body_es:'Spanish first.'},
    {type:'important_announcement',body_en:'English first, Spanish second.'},
    {type:'important_announcement',body_en:'English second.',body_es:'Spanish third.'},
    {type:'important_announcement',body_en:'',body_es:''}
  ];
  const hidden=review(complete,optional).filter(item=>item.kind==='hidden');
  assert.deepEqual(hidden.map(item=>[item.index,item.language,item.field]),[[2,'en','body_en'],[1,'es','body_en'],[2,'es','body_es']]);
});

async function editor(options={}) {
  const p=await page('admin/index.html',options);
  p.run(`authenticatedAdmin={id:'editor'};
    adminNewsletters=[${JSON.stringify({...complete,id:'issue & special/#',status:'published',updated_at:'2026-10-25T00:00:00.123456+00:00',scripture_en:"Add this week's scripture passage here.",scripture_es:'Agrega aquí el pasaje bíblico de esta semana.'})}];
    selectNewsletter('issue & special/#');`);
  await settle();
  return p;
}

test('Editorial editor: reminders focus the correct language and preserve the selected field while typing', async () => {
  const p=await editor();
  const panel=p.document.getElementById('newsletterReview');
  assert.equal(panel.hidden,false);
  assert.equal(p.document.querySelectorAll('[data-review-kind="template"]').length,2);
  click(p,p.document.querySelectorAll('[data-review-kind="template"]')[1]);
  await settle();
  assert.equal(p.document.querySelector('[data-editor-lang].active').dataset.editorLang,'es');
  assert.equal(p.reports.focused,'scriptureEs');
  const field=p.document.getElementById('scriptureEs');
  field.value='Esta semana leemos juntos.';
  field.dispatchEvent(new p.Event('input',{bubbles:true}));
  await settle();
  assert.equal(p.document.querySelectorAll('[data-review-kind="template"]').length,1);
  assert.equal(p.reports.focused,'scriptureEs');
  assert.match(p.document.querySelector('[data-editor-change-state="newsletter"]').textContent,/Unsaved changes/);
});

test('Editorial editor: optional reminders follow the current section after add/remove operations', async () => {
  const p=await editor();
  p.run(read('newsletter-extensions.js'));
  click(p,p.document.querySelector('[data-add-optional="custom"]'));
  let field=p.document.querySelector('[data-field="body_en"]');
  field.value='English optional message';field.dispatchEvent(new p.Event('input',{bubbles:true}));
  await settle();
  let reminder=Array.from(p.document.querySelectorAll('.editor-review-link')).find(button=>button.textContent.includes('no Spanish text'));
  assert(reminder);click(p,reminder);await settle();
  assert.equal(p.document.querySelector('[data-editor-lang].active').dataset.editorLang,'es');
  // Optional fields have no IDs; assign one only to observe fixture focus.
  p.document.querySelector('[data-field="body_es"]').id='optionalSpanish';
  click(p,reminder);assert.equal(p.reports.focused,'optionalSpanish');
  click(p,p.document.querySelector('[data-remove-optional]'));await settle();
  assert(!p.document.getElementById('newsletterReviewList').textContent.includes('Additional section'));
});

test('Editorial editor: pending save locks reminders and a successful save clears the dirty indicator', async () => {
  const p=await editor();
  const field=p.document.getElementById('communityEn');field.value='An unsaved update';field.dispatchEvent(new p.Event('input',{bubbles:true}));
  await settle();
  p.run(`let releaseSave; supabaseClient=contentClient(({payload,id})=>new Promise(resolve=>{releaseSave=()=>resolve({data:{...payload,id,updated_at:'2026-10-25T00:00:00.123457+00:00'}})}));`);
  click(p,p.document.getElementById('saveNewsletterButton'));await settle();
  assert(Array.from(p.document.querySelectorAll('.editor-review-link')).every(button=>button.disabled));
  p.run('releaseSave()');await settle();
  assert.equal(p.document.querySelector('[data-editor-change-state="newsletter"]').hidden,true);
  assert(Array.from(p.document.querySelectorAll('.editor-review-link')).every(button=>!button.disabled));
  assert.equal(field.value,'An unsaved update');
});

test('Editorial editor: reminders do not block saving and the published link is fixed-origin and cleared on logout', async () => {
  const p=await editor();
  const link=p.document.getElementById('viewPublishedNewsletter');
  assert.equal(link.hidden,false);assert.equal(link.getAttribute('href'),'/newsletter/?issue=issue%20%26%20special%2F%23');
  p.run(`let writes=0;supabaseClient=contentClient(async({payload,id})=>{writes++;return {data:{...payload,id,updated_at:'2026-10-25T00:00:00.123457+00:00'}}});`);
  await p.run('persistNewsletter()');await settle();
  assert.equal(p.run('writes'),1);
  p.run('showLogin()');await settle();
  assert.equal(link.hidden,true);assert.equal(link.hasAttribute('href'),false);
  assert.equal(p.document.getElementById('newsletterReview').hidden,true);
  assert.equal(p.document.getElementById('newsletterReviewList').textContent,'');
  assert(Array.from(p.document.querySelectorAll('[data-editor-change-state]')).every(element=>element.hidden));
  assert(![...p.storage.values()].some(value=>String(value).includes('scripture')));
});

test('Editorial editor: a missing review bundle retains core editing and saving', async () => {
  const p=await editor({withoutReview:true});
  p.run(`supabaseClient=contentClient(async({payload,id})=>({data:{...payload,id,updated_at:'2026-10-25T00:00:00.123457+00:00'}}));`);
  assert.equal(p.document.getElementById('newsletterReview').hidden,true);
  assert(await p.run('persistNewsletter()'));
  assert.deepEqual(p.reports.errors,[]);
});

test('Editorial editor: a new issue is visibly unsaved and has no public link', async () => {
  const p=await editor();
  click(p,p.document.getElementById('newNewsletterButton'));await settle();
  assert.equal(p.document.querySelector('[data-editor-change-state="newsletter"]').textContent,'Not saved yet');
  assert.equal(p.document.getElementById('viewPublishedNewsletter').hidden,true);
  assert.equal(p.document.getElementById('viewPublishedNewsletter').hasAttribute('href'),false);
});

test('Editorial editor: Spanish preview follows public English fallback and declares the spoken language', async () => {
  const p=await editor();
  p.document.getElementById('scriptureEs').value='';
  click(p,p.document.querySelector('[data-editor-lang="es"]'));
  assert.equal(p.document.getElementById('previewScripture').textContent,"Add this week's scripture passage here.");
  assert.equal(p.document.getElementById('previewScripture').getAttribute('lang'),'en');
  assert.equal(p.document.getElementById('previewGathering').getAttribute('lang'),'es');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const {page} = require('./helpers.cjs');
const issues=[
  {id:'one',issue_date:'2026-10-25',title_en:'English title',gathering_en:'Welcome to worship.',gathering_es:'Bienvenidos.',scripture_en:'English passage.',optional_sections:[
    {type:'custom',title_en:'English heading',body_en:'English message.'},
    {type:'celebrations',body_en:'Birthday news.'}
  ]},
  {id:'two',issue_date:'2026-10-18',title_en:'Another English title',community_en:'English content.'}
];

test('Content languages: Spanish pages mark English newsletter fallbacks for assistive technology',async()=>{
  const p=await page('newsletter/index.html',{issues,storage:{ministerioLanguage:'es'}});
  const article=p.document.getElementById('latestNewsletter');
  assert.equal(article.querySelector('h2').getAttribute('lang'),'en');
  assert.equal(article.querySelector('.issue-date').getAttribute('lang'),'es');
  const sections=article.querySelectorAll('.newsletter-section');
  assert.equal(sections[0].querySelector('h3').getAttribute('lang'),'es');
  assert.equal(sections[0].querySelector('p').getAttribute('lang'),'es');
  assert.equal(sections[1].querySelector('p').getAttribute('lang'),'en');
  assert.equal(sections[3].querySelector('h3').getAttribute('lang'),'en');
  assert.equal(sections[4].querySelector('h3').textContent,'Cumpleaños y Celebraciones');
  assert.equal(sections[4].querySelector('h3').getAttribute('lang'),'es');
  const shortcut=p.document.querySelector('#newsletterContents a[href="#newsletter-section-4"]');
  assert.equal(shortcut.getAttribute('lang'),'en');
  assert.equal(p.document.querySelector('.archive-item strong').getAttribute('lang'),'en');
  assert.equal(p.document.querySelector('#issuePagination strong').getAttribute('lang'),'en');
});

test('Content languages: announcement fields and homepage preview retain their actual language',async()=>{
  const announcements=[{title_en:'English news',description_en:'English description',description_es:'Descripción en español',tag_en:'News'}];
  const p=await page('index.html',{issues,announcements,storage:{ministerioLanguage:'es'}});
  const card=p.document.querySelector('.announcement-card');
  assert.equal(card.querySelector('h3').getAttribute('lang'),'en');
  assert.equal(card.querySelector('p').getAttribute('lang'),'es');
  assert.equal(card.querySelector('.tag').getAttribute('lang'),'en');
  assert.equal(p.document.getElementById('homepageNewsletterTitle').getAttribute('lang'),'en');
  p.run("applyLanguage('en')");assert.equal(card.isConnected,false);
  assert.equal(p.document.querySelector('.announcement-card p').getAttribute('lang'),'en');
});

test('Service language: an English-only schedule and cancellation remain visible in Spanish',async()=>{
  const service={day_en:'Wednesday',day_es:' ',service_label_en:'Evening service',special_message_en:'No service this Wednesday.',service_time:'19:00',address:'2149 W Washington Blvd, Los Angeles'};
  const p=await page('index.html',{storage:{ministerioLanguage:'es'},fetch:async url=>({ok:true,json:async()=>url.includes('service_settings')?[service]:[]})});
  for(const id of ['visitServiceDay','heroServiceDay']){
    assert.equal(p.document.getElementById(id).textContent,'Wednesday');
    assert.equal(p.document.getElementById(id).getAttribute('lang'),'en');
  }
  assert.equal(p.document.getElementById('heroServiceLabel').textContent,'Evening service');
  const message=p.document.getElementById('specialServiceMessage');
  assert.equal(message.textContent,'No service this Wednesday.');
  assert.equal(message.getAttribute('lang'),'en');
  assert.equal(p.document.getElementById('visitCalendar').hidden,true);
  p.run('renderServiceUnavailable()');
  assert.equal(message.getAttribute('lang'),'es');
  assert.equal(p.document.getElementById('visitServiceDay').textContent,'Día por confirmar');
});

test('Service language: a Spanish-only schedule and notice remain visible in English',async()=>{
  const service={day_es:'Miércoles',service_label_es:'Servicio de oración',special_message_es:'No hay servicio este miércoles.',service_time:'19:00',address:'2149 W Washington Blvd, Los Angeles'};
  const p=await page('index.html',{fetch:async url=>({ok:true,json:async()=>url.includes('service_settings')?[service]:[]})});
  assert.equal(p.document.getElementById('visitServiceDay').textContent,'Miércoles');
  assert.equal(p.document.getElementById('visitServiceDay').getAttribute('lang'),'es');
  assert.equal(p.document.getElementById('heroServiceLabel').textContent,'Servicio de oración');
  assert.equal(p.document.getElementById('specialServiceMessage').textContent,'No hay servicio este miércoles.');
  assert.equal(p.document.getElementById('specialServiceMessage').getAttribute('lang'),'es');
  assert.equal(p.document.getElementById('visitCalendar').hidden,true);
});

test('Service language: missing weekdays never invent a Sunday schedule',async()=>{
  const p=await page('index.html');
  assert.equal(p.document.getElementById('visitServiceDay').textContent,'Day to be confirmed');
  assert.equal(p.document.getElementById('heroServiceLabel').textContent,'Church service');
  assert.equal(p.document.getElementById('visitCalendar').hidden,true);
  p.run("applyLanguage('es')");
  assert.equal(p.document.getElementById('visitServiceDay').textContent,'Día por confirmar');
});

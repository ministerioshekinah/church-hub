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

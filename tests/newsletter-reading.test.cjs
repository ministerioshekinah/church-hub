const test = require('node:test');
const assert = require('node:assert/strict');
const {page, click, safeMarkup} = require('./helpers.cjs');
const issues = [
  {id:'new',issue_date:'2026-10-25',title_en:'A new season',title_es:'Una nueva etapa',gathering_en:'Worship together.',scripture_en:'A light for our path.',community_en:'Welcome to the community.'},
  {id:'middle',issue_date:'2026-10-18',title_en:'Together',title_es:'Juntos',gathering_en:'Find encouragement.',gathering_es:'Encuentra ánimo.',optional_sections:[{id:'safe',type:'custom',title_en:'Community meal',title_es:'Comida comunitaria',body_en:'Bring your favorite dish.',body_es:'Trae tu plato favorito.'}]},
  {id:'old',issue_date:'2025-12-28',title_en:'A year of gratitude',title_es:'Un año de gratitud',community_en:'A special collection for neighbors.'}
];

test('Newsletter reader: section shortcuts include optional headings and move keyboard focus',async()=>{
  const p=await page('newsletter/index.html',{issues});
  assert.equal(p.document.getElementById('newsletterContentsWrap').hidden,false);
  const link=p.document.querySelector('#newsletterContents a');
  const target=p.document.getElementById(link.hash.slice(1));
  assert.equal(link.textContent,target.textContent);assert.equal(target.getAttribute('tabindex'),'-1');
  click(p,link);assert.equal(p.reports.focused,target.id);
  click(p,p.document.querySelector('#issuePagination a'));
  assert.match(p.document.getElementById('newsletterContents').textContent,/Community meal/);
});

test('Newsletter reader: neighbors move through chronological issues and preserve normal modified links',async()=>{
  const p=await page('newsletter/index.html',{issues});
  const nav=p.document.getElementById('issuePagination');
  assert.equal(nav.children.length,1);assert.match(nav.textContent,/Older issue/);
  const event=click(p,nav.firstElementChild,{ctrlKey:true});assert.equal(event.defaultPrevented,false);
  assert.equal(p.document.getElementById('latestNewsletter').dataset.issueId,'new');
  click(p,nav.firstElementChild);assert.equal(p.location.search,'?issue=middle');
  assert.equal(nav.children.length,2);assert.match(nav.textContent,/Newer issue/);
  assert.equal(p.reports.focused,'latestNewsletter');
  click(p,nav.lastElementChild);assert.equal(p.document.getElementById('latestNewsletter').dataset.issueId,'old');
  assert.equal(nav.children.length,1);assert.match(nav.textContent,/Newer issue/);
});

test('Newsletter reader: history and section hash changes do not rebuild a focused article unnecessarily',async()=>{
  const p=await page('newsletter/index.html',{issues});
  const heading=p.document.querySelector('#latestNewsletter h3');
  p.location.hash='#newsletter-section-1';p.browser.dispatchEvent(new p.Event('popstate'));
  assert.equal(p.document.querySelector('#latestNewsletter h3'),heading);
  p.location.search='?issue=middle';p.browser.dispatchEvent(new p.Event('popstate'));
  assert.equal(p.document.getElementById('latestNewsletter').dataset.issueId,'middle');
  assert.equal(p.reports.focused,'newsletter-section-1');
});

test('Newsletter reader: a directly opened section link resolves after async content arrives',async()=>{
  const p=await page('newsletter/index.html',{issues,boot:false});
  p.location.search='?issue=middle';p.location.hash='#newsletter-section-4';
  p.document.dispatchEvent(new p.Event('DOMContentLoaded'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.reports.focused,'newsletter-section-4');
  assert.equal(p.document.getElementById('newsletter-section-4').textContent,'Community meal');
});

test('Newsletter reader: search matches English, Spanish, accents, body text and issue dates',async()=>{
  const p=await page('newsletter/index.html',{issues});
  const search=p.document.getElementById('archiveSearch');
  for(const [query,id] of [['encouragement','middle'],['animo','middle'],['plato favorito','middle'],['2025-12-28','old'],['neighbors','old']]){
    search.value=query;search.dispatchEvent(new p.Event('input'));
    const links=p.document.querySelectorAll('.archive-item');assert.equal(links.length,1,query);
    assert.equal(new URL(links[0].href).searchParams.get('issue'),id);
  }
  click(p,p.document.getElementById('clearArchiveSearch'));
  assert.equal(search.value,'');assert.equal(p.document.querySelectorAll('.archive-item').length,2);
  assert.equal(p.reports.focused,'archiveSearch');assert.equal(p.document.getElementById('clearArchiveSearch').hidden,true);
  assert.equal(p.reports.requests.length,1);
});

test('Newsletter reader: empty results and language changes keep the search query usable',async()=>{
  const p=await page('newsletter/index.html',{issues});
  const search=p.document.getElementById('archiveSearch');search.value='does not exist';search.dispatchEvent(new p.Event('input'));
  assert.match(p.document.getElementById('newsletterArchive').textContent,/No other issues match/);
  p.run("applyLanguage('es')");assert.equal(search.value,'does not exist');
  assert.match(p.document.getElementById('newsletterArchive').textContent,/No hay otros boletines/);
  assert.match(p.document.getElementById('newsletterContentsWrap').getAttribute('aria-label'),/En este boletín/);
  assert.match(p.document.getElementById('issuePagination').textContent,/Boletín anterior/);
});

test('Newsletter reader: empty, single-issue and failed states hide irrelevant navigation',async()=>{
  const p=await page('newsletter/index.html',{issues:[issues[0]]});
  assert.equal(p.document.getElementById('issuePagination').hidden,true);
  assert.equal(p.document.getElementById('browseNewsletterArchive').hidden,true);
  assert.equal(p.document.getElementById('archiveSearchWrap').hidden,true);
  p.run('renderNewsletterPage([])');assert.equal(p.document.getElementById('newsletterContentsWrap').hidden,true);
  assert.equal(p.document.title,'Newsletter | Ministerio Cristiano Shekinah');
  p.run(`renderNewsletterPage(${JSON.stringify(issues.map(item=>({...item,date_en:item.issue_date,sections:[{heading_en:'Heading',body_en:'Body'},{heading_en:'Other',body_en:'Text'}]})))})`);
  p.run('renderNewsletterError()');
  for(const id of ['newsletterContentsWrap','issuePagination','browseNewsletterArchive'])assert.equal(p.document.getElementById(id).hidden,true,id);
});

test('Newsletter reader: hostile CMS titles remain plain text in every new navigation surface',async()=>{
  const payload='<img src=x onerror=alert(1)> & "bad"';
  const p=await page('newsletter/index.html',{issues:[{...issues[0],optional_sections:[{type:'custom',title_en:payload,body_en:'A safe body'}]},{...issues[1],id:'" onmouseover="bad',title_en:payload},issues[2]]});
  for(const id of ['newsletterContents','issuePagination'])safeMarkup(assert,p.document.getElementById(id));
  assert(p.document.getElementById('newsletterContents').textContent.includes(payload));
  assert(p.document.getElementById('issuePagination').textContent.includes(payload));
  const url=new URL(p.document.querySelector('#issuePagination a').href);
  assert.equal(url.origin,'https://mcshekinah.org');assert.equal(url.searchParams.get('issue'),'" onmouseover="bad');
});

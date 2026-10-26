const test = require('node:test');
const assert = require('node:assert/strict');
const {page, click, safeMarkup} = require('./helpers.cjs');
const service = {id:1,day_en:'Sunday',day_es:'Domingo',service_label_en:'Sunday Service',service_label_es:'Servicio Dominical',service_time:'15:00:00',address:'2149 W Washington Blvd, Los Angeles, CA 90018'};
const settle = () => new Promise(resolve => setImmediate(resolve));
async function fixture() {
  return page('index.html',{fetch:async url=>({ok:true,json:async()=>url.includes('service_settings')?[service]:[]})});
}
test('Visit: every address and both map destinations follow the current service settings',async()=>{
  const p=await fixture();const address='10 New Street & Suite 4, Los Angeles';
  p.run(`renderServiceSettings(${JSON.stringify({...service,address})})`);
  for(const el of p.document.querySelectorAll('[data-service-address]'))assert.equal(el.textContent,address);
  for(const link of p.document.querySelectorAll('[data-map-provider]')){
    const url=new URL(link.href);assert(['maps.apple.com','www.google.com'].includes(url.hostname));
    assert.equal(url.searchParams.get(link.dataset.mapProvider==='apple'?'daddr':'destination'),address);
  }
});
test('Visit: hostile address values remain text inside fixed map origins',async()=>{
  const p=await fixture();const address='"><svg onload=alert(1)> & https://evil.test';
  p.run(`renderServiceSettings(${JSON.stringify({...service,address})})`);
  for(const el of p.document.querySelectorAll('[data-service-address]')){safeMarkup(assert,el);assert.equal(el.textContent,address);}
  assert.equal(new URL(p.document.querySelector('[data-map-provider="apple"]').href).origin,'https://maps.apple.com');
});
test('Visit: failed refresh removes stale addresses and map actions, and retry can restore them',async()=>{
  const p=await fixture();p.run('renderServiceUnavailable()');
  assert.equal(p.document.getElementById('heroServiceSummary').hidden,true);
  for(const link of p.document.querySelectorAll('[data-map-provider]')){assert.equal(link.hasAttribute('href'),false);assert.equal(link.getAttribute('aria-disabled'),'true');}
  for(const id of ['copyAddress','shareVisit'])assert.equal(p.document.getElementById(id).hidden,true);
  p.run(`renderServiceSettings(${JSON.stringify(service)})`);
  assert.equal(p.document.getElementById('shareVisit').hidden,false);
  assert(p.document.querySelector('[data-map-provider]').hasAttribute('href'));
});
test('Visit: summary, share control and unavailable state translate into Spanish',async()=>{
  const p=await fixture();p.run("applyLanguage('es')");
  assert.equal(p.document.getElementById('heroServiceDay').textContent,'Domingo');
  assert.equal(p.document.getElementById('heroSummaryTime').textContent,'3:00 PM');
  assert.match(p.document.getElementById('shareVisit').textContent,/Compartir/);
  p.run("publicLoadState.service='error';cachedService=null;applyLanguage('es')");
  assert.match(p.document.getElementById('visitAddress').textContent,/dirección/);
});
test('Visit: copy uses the authoritative address; sharing without native support copies useful details',async()=>{
  const p=await fixture();click(p,p.document.getElementById('copyAddress'));await settle();
  assert.equal(p.reports.clipboard[0],service.address);
  click(p,p.document.getElementById('shareVisit'));await settle();
  assert.match(p.reports.clipboard[1],/Sunday · 3:00 PM/);
  assert(p.reports.clipboard[1].includes(service.address));
  assert(p.reports.clipboard[1].endsWith('https://mcshekinah.org/'));
});
test('Visit: native share cancellation stays quiet and never copies unexpectedly',async()=>{
  const p=await fixture();p.run("navigator.share=async()=>{const e=new Error('Cancelled');e.name='AbortError';throw e}");
  click(p,p.document.getElementById('shareVisit'));await settle();
  assert.equal(p.reports.clipboard.length,0);assert.equal(p.document.getElementById('copyStatus').textContent,'');
  assert.equal(p.document.getElementById('shareVisit').disabled,false);
});
test('Visit: pending copy is deduplicated and cannot announce stale information after a service change',async()=>{
  const p=await fixture();p.run('let finishVisitCopy; navigator.clipboard.writeText=()=>new Promise(r=>finishVisitCopy=r)');
  click(p,p.document.getElementById('copyAddress'));click(p,p.document.getElementById('shareVisit'));
  assert.equal(p.document.getElementById('shareVisit').disabled,true);
  p.run(`renderServiceSettings(${JSON.stringify({...service,address:'New address'})});finishVisitCopy()`);await settle();
  assert.equal(p.document.getElementById('copyStatus').textContent,'');assert.equal(p.document.getElementById('copyAddress').disabled,false);
});
test('Visit: clipboard denial provides a translated manual fallback',async()=>{
  const p=await fixture();p.run("applyLanguage('es');navigator.clipboard.writeText=async()=>{throw Error('Denied')}");
  click(p,p.document.getElementById('copyAddress'));await settle();
  assert.match(p.document.getElementById('copyStatus').textContent,/Selecciona/);
});

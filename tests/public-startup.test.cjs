const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const {read, page} = require('./helpers.cjs');

function startup(name,ready=false) {
  const {document,Event} = parseHTML(read(name));
  Object.defineProperty(document,'readyState',{value:'complete'});
  let reloads=0;
  vm.runInNewContext(read('public-startup.js'),{document,window:{SHEKINAH_PUBLIC_READY:ready,location:{reload(){reloads++;}}}});
  return {document,Event,reloads:()=>reloads};
}

test('Public startup: a missing application exposes bilingual recovery and a working reload control',()=>{
  const p=startup('index.html');
  const notice=p.document.getElementById('publicStartupNotice');
  assert.equal(notice.hidden,false);
  assert.match(notice.querySelector('[lang="en"]').textContent,/did not finish loading/);
  assert.match(notice.querySelector('[lang="es"]').textContent,/no terminó de cargar/);
  p.document.getElementById('reloadPublicPage').dispatchEvent(new p.Event('click'));
  assert.equal(p.reloads(),1);
  assert.equal(p.document.querySelector('link[href="/no-script.css?v=1.1"]').getAttribute('rel'),'stylesheet');
  assert.equal(p.document.querySelectorAll('[aria-busy="true"]').length,0);
  assert.equal(p.document.getElementById('heroServiceTime').textContent,'—');
});

test('Public startup: successful application startup leaves the recovery notice hidden',async()=>{
  const p=await page();
  assert.equal(p.run('window.SHEKINAH_PUBLIC_READY'),true);
  p.run(read('public-startup.js'));
  assert.equal(p.document.getElementById('publicStartupNotice').hidden,true);
  assert.equal(p.document.querySelectorAll('head > link[href^="/no-script.css"]').length,0);
});

test('Public startup: recovery is present on all public routes and avoids external services',()=>{
  for(const name of ['index.html','newsletter/index.html','privacy/index.html','terms/index.html','contact/index.html','404.html']) {
    const p=startup(name);
    assert.equal(p.document.getElementById('publicStartupNotice').hidden,false,name);
    assert(p.document.querySelector('script[src="/public-startup.js?v=1.0"]'),name);
    assert.match(read(name),/Enable JavaScript and reload/);
    assert.match(read(name),/Activa JavaScript/);
  }
  assert.doesNotMatch(read('public-startup.js'),/fetch\(|localStorage|sessionStorage|https?:\/\//);
});

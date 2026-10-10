const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const {root, read, page, click} = require('./helpers.cjs');
function resolveRoute(input, blockedHistory = false) {
  const original = new URL(input, 'https://mcshekinah.org');
  const moves = [];
  const location = {pathname:original.pathname,search:original.search,hash:original.hash,replace:destination=>moves.push({kind:'navigate',destination})};
  const history = {state:{preserved:true},replaceState(state,_,destination){if(blockedHistory)throw Error('blocked');moves.push({kind:'normalize',destination,state});}};
  vm.runInNewContext(read('clean-urls.js'), {window:{location,history}});
  return {original,moves};
}
test('Routes: legacy links preserve newsletter queries and auth fragments on the same origin', () => {
  for(const [old,next] of [['/newsletter.html','/newsletter/'],['/admin.html','/admin/'],['/newsletter','/newsletter/'],['/admin','/admin/']]) {
    const suffix='?issue=archive%202&next=https%3A%2F%2Fevil.example#access_token=example&refresh_token=example';
    const {moves}=resolveRoute(old+suffix);
    assert.equal(moves.length,1);assert.equal(moves[0].kind,'navigate');
    assert.equal(moves[0].destination,next+suffix);
    assert.equal(new URL(moves[0].destination,'https://mcshekinah.org').origin,'https://mcshekinah.org');
  }
});
test('Routes: direct index filenames normalize in place without another navigation', () => {
  for(const [old,next] of [['/index.html','/'],['/newsletter/index.html','/newsletter/'],['/admin/index.html','/admin/']]) {
    const {moves}=resolveRoute(old+'?issue=older#visit');
    assert.equal(moves.length,1);assert.equal(moves[0].kind,'normalize');assert.equal(moves[0].destination,next+'?issue=older#visit');assert.equal(moves[0].state.preserved,true);
  }
});
test('Routes: already clean paths do not redirect or loop', () => {
  for(const pathname of ['/','/newsletter/','/admin/'])assert.equal(resolveRoute(pathname+'?issue=old').moves.length,0);
  const {moves}=resolveRoute('/admin/index.html?code=example#recovery',true);
  assert.equal(moves[0].destination,'/admin/?code=example#recovery');
});
test('Routes: every page link is clean and local styles/scripts resolve from directory URLs', () => {
  for(const [file,url] of [['index.html','/'],['newsletter/index.html','/newsletter/'],['admin/index.html','/admin/']]) {
    const {document}=parseHTML(read(file));
    for(const link of document.querySelectorAll('a[href]')) {
      const target=new URL(link.getAttribute('href'),'https://mcshekinah.org'+url);
      if(target.origin==='https://mcshekinah.org') {
        assert(!target.pathname.endsWith('.html'),target.href);
        assert(fs.existsSync(path.join(root,target.pathname.slice(1),'index.html')),target.href);
      }
    }
    for(const asset of document.querySelectorAll('script[src],link[rel="stylesheet"]')) {
      const raw=asset.getAttribute('src')||asset.getAttribute('href');
      const target=new URL(raw,'https://mcshekinah.org'+url);
      if(target.origin==='https://mcshekinah.org') {assert(raw.startsWith('/'),raw);assert(fs.existsSync(path.join(root,target.pathname.slice(1))),target.href);}
    }
    assert.equal(document.querySelector('link[rel="canonical"]').getAttribute('href'),'https://mcshekinah.org'+url);
  }
});
test('Routes: dynamically loaded admin extensions use root asset paths', () => {
  const {document}=parseHTML(read('admin/index.html'));let onReady;
  vm.runInNewContext(read('supabase-config.js'), {document,window:{location:{pathname:'/admin/'},addEventListener:(_,fn)=>{onReady=fn;}}});
  onReady();
  for(const name of ['admin-service-validation.js','administrators.js','newsletter-extensions.js']) {
    const script=document.querySelector(`script[src^="/${name}"]`);assert(script,name);assert(fs.existsSync(path.join(root,name)));
  }
});
test('Routes: archive selection keeps a clean URL and supports direct issue links', async () => {
  const issues=[{id:'new',issue_date:'2026-10-10',title_en:'New'},{id:'old',issue_date:'2026-10-03',title_en:'Old'}];
  const p=await page('newsletter/index.html',{issues});
  const link=p.document.querySelector('.archive-item');
  assert.equal(new URL(link.href).pathname,'/newsletter/');
  click(p,link);assert.equal(p.location.pathname,'/newsletter/');assert.equal(p.location.search,'?issue=old');
  assert.equal(p.reports.requests.length,1);
});

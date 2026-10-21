const test=require('node:test');
const assert=require('node:assert/strict');
const {read,page,safeMarkup}=require('./helpers.cjs');
const payloads={
 title_en:'<img src=x onerror=alert(1)>',title_es:'<svg onload=alert(1)>',
 description_en:'</p><script>alert(1)</script>',description_es:'<iframe srcdoc="<script>alert(1)</script>"></iframe>',
 tag_en:'<a href="javascript:alert(1)">click</a>',tag_es:'<math><mtext><img src=x onerror=alert(1)></mtext></math>'
};
for(const [field,value] of Object.entries(payloads))test('XSS: announcement '+field,async()=>{
 const p=await page();p.run(`applyLanguage('${field.endsWith('es')?'es':'en'}');renderAnnouncements([${JSON.stringify({title_en:'Title',tag_en:'Tag',description_en:'Text',[field]:value})}]);`);
 const el=p.document.getElementById('announcementList');safeMarkup(assert,el);assert(el.textContent.includes(value));
});
for(const field of ['service_label_en','time_display','special_message_en'])test('XSS: service '+field,async()=>{
 const p=await page();const value='<img src=x onerror=alert(1)>';p.run(`renderServiceSettings(${JSON.stringify({[field]:value})})`);
 const el=p.document.getElementById({service_label_en:'heroServiceLabel',time_display:'heroServiceTime',special_message_en:'specialServiceMessage'}[field]);safeMarkup(assert,el);assert.equal(el.textContent,value);
});
const issue={id:'safe',title_en:'Title',title_es:'Título',date_en:'October',date_es:'Octubre',sections:[]};
for(const field of ['title_en','date_en','heading_en','body_en'])test('XSS: newsletter '+field,async()=>{
 const p=await page('newsletter/index.html');const value='</h2><img src=x onerror=alert(1)>';const fixture={...issue};if(['heading_en','body_en'].includes(field))fixture.sections=[{[field]:value}];else fixture[field]=value;
 p.run(`renderNewsletter(${JSON.stringify(fixture)},document.getElementById('latestNewsletter'))`);const el=p.document.getElementById('latestNewsletter');safeMarkup(assert,el);assert(el.textContent.includes(value));
});
test('XSS: archive issue ID remains a same-origin encoded query',async()=>{
 const p=await page('newsletter/index.html');const bad={...issue,id:'"><img src=x onerror=alert(1)>',title_en:'<script>alert(1)</script>',date_en:'<img src=x>'};p.run(`renderNewsletterPage(${JSON.stringify([issue,bad])})`);const el=p.document.getElementById('newsletterArchive');safeMarkup(assert,el);const href=new URL(el.querySelector('a').href);assert.equal(href.origin,'https://mcshekinah.org');assert.equal(href.searchParams.get('issue'),bad.id);assert(el.textContent.includes(bad.title_en));
});
for(const type of ['custom','important_announcement','__proto__','constructor'])test('XSS: optional newsletter '+type,async()=>{
 const p=await page('newsletter/index.html');const value='<img src=x onerror=alert(1)>';p.run(`renderNewsletter(${JSON.stringify({...issue,optional_sections:[{type,title_en:value,body_en:value}]})},document.getElementById('latestNewsletter'))`);const el=p.document.getElementById('latestNewsletter');safeMarkup(assert,el);assert(el.textContent.includes(value));
});
test('XSS: admin announcement editor list',async()=>{
 const p=await page('admin/index.html');p.run(`adminAnnouncements=[${JSON.stringify({id:'test',title_en:payloads.title_en,tag_en:payloads.tag_en,description_en:payloads.description_en})}];renderAdminAnnouncementList()`);safeMarkup(assert,p.document.getElementById('adminAnnouncementList'));
});
test('XSS: admin newsletter ID and status attributes',async()=>{
 const p=await page('admin/index.html');p.run(`adminNewsletters=[${JSON.stringify({id:'" onmouseover="alert(1)',status:'"><img src=x onerror=alert(1)>',title_en:payloads.title_en,issue_date:'2026-10-10'})}];renderAdminNewsletterList()`);safeMarkup(assert,p.document.getElementById('adminNewsletterList'));
});
for(const file of ['index.html','newsletter/index.html','admin/index.html','newsletter.html','admin.html','privacy/index.html','terms/index.html','contact/index.html'])test('CSP: '+file+' blocks injected scripts, objects, base URLs',async()=>{
 const {parseHTML}=require('linkedom');const {document}=parseHTML(read(file));const csp=document.querySelector('meta[http-equiv="Content-Security-Policy"]').content;const script=csp.match(/script-src ([^;]+)/)[1];assert(!script.includes('unsafe-inline'));assert(!script.includes('unsafe-eval'));assert(csp.includes("object-src 'none'"));assert(csp.includes("base-uri 'none'"));assert(csp.includes('upgrade-insecure-requests'));for(const el of document.querySelectorAll('script')){assert(el.hasAttribute('src'));assert.equal(el.textContent.trim(),'');}
});
test('Supply chain: the local SDK matches its pinned upstream bytes, SRI, version, and notices',()=>{
 const {parseHTML}=require('linkedom');const {document}=parseHTML(read('admin/index.html'));
 const provenance=JSON.parse(read('assets/vendor/provenance.json'));
 const el=document.querySelector('script[src*="/assets/vendor/supabase-"]');
 assert.equal(el.src,'/assets/vendor/'+provenance.file);
 const bytes=Buffer.from(read('assets/vendor/'+provenance.file));
 const crypto=require('node:crypto');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),provenance.sha256);
 assert.equal('sha384-'+crypto.createHash('sha384').update(bytes).digest('base64'),el.getAttribute('integrity'));
 assert.equal(el.getAttribute('integrity'),'sha384-OUpie84zd1LdwNlK9uJJQRwab0BLqo3eKYKFh7hSVL58FSk7wPp2l0kfUMIIoaQd');
 assert.equal(el.getAttribute('crossorigin'),'anonymous');
 const notices=read('assets/vendor/THIRD_PARTY_NOTICES.txt');
 for(const dependency of provenance.licenses)assert(notices.includes(dependency.name+' '+dependency.version));
 assert(document.querySelector('meta[http-equiv="Content-Security-Policy"]').content.includes("script-src 'self';"));
});
test('Supply chain: runtime audit covers the exact browser and Edge Function package pins',()=>{
 const manifest=JSON.parse(read('security/runtime-dependencies/package.json'));
 const lock=JSON.parse(read('security/runtime-dependencies/package-lock.json'));
 const versions=manifest.dependencies;
 assert.equal(manifest.private,true);
 assert.deepEqual(lock.packages[''].dependencies,versions);
 for(const [name,version] of Object.entries(versions)){
  assert.match(version,/^\d+\.\d+\.\d+$/);
  assert.equal(lock.packages['node_modules/'+name].version,version);
 }
 assert.equal(JSON.parse(read('assets/vendor/provenance.json')).version,versions['@supabase/supabase-js']);
 assert(read('admin/index.html').includes('/assets/vendor/supabase-'+versions['@supabase/supabase-js']+'.js'));
 assert(read('supabase/functions/admin-users/index.ts').includes('npm:@supabase/server@'+versions['@supabase/server']+'"'));
 assert(read('.github/workflows/frontend-checks.yml').includes('npm audit --prefix security/runtime-dependencies --audit-level=high'));
});
test('Redirect: invitation parameters cannot change the origin',()=>{const vm=require('node:vm');let target;vm.runInNewContext(read('admin-redirect.js'),{window:{location:{search:'?next=https://evil.example',hash:'#access_token=test',replace:v=>target=v}}});assert.equal(new URL(target,'https://mcshekinah.org').origin,'https://mcshekinah.org');assert(target.startsWith('/admin/index.html?'));assert(target.endsWith('#access_token=test'));});
test('Privacy: admin requests never select author UUIDs or wildcard columns',()=>{for(const file of ['admin.js','newsletter-extensions.js','admin-service-validation.js']){const source=read(file);assert(!/\.select\(\s*["']\*["']/.test(source));assert(!/\b(?:created_by|updated_by)\s*:/.test(source));}});
test('Availability security: backend failure never resurrects static hidden announcements',async()=>{const p=await page('index.html',{unavailable:true});assert(p.reports.requests.length>0);assert(p.reports.requests.every(url=>url.startsWith('https://nhzxlsjwsvyimozubbho.supabase.co/rest/v1/')));assert(p.document.getElementById('announcementList').textContent.includes('could not load'));});
test('Availability security: backend failure never resurrects static unpublished newsletters',async()=>{const p=await page('newsletter/index.html',{unavailable:true});assert.equal(p.reports.requests.length,1);assert(p.reports.requests[0].includes('/rest/v1/newsletters?'));assert(p.document.getElementById('latestNewsletter').textContent.includes('could not load'));});

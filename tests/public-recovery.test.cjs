const test=require('node:test');
const assert=require('node:assert/strict');
const {page,click,safeMarkup}=require('./helpers.cjs');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const issues=[{id:'new',issue_date:'2026-10-18',title_en:'Latest',title_es:'Actual',optional_sections:[]},{id:'old',issue_date:'2026-10-11',title_en:'Older',title_es:'Anterior',optional_sections:[]}];

for(const lang of ['en','es'])test(`Sharing: denied clipboard offers the displayed issue URL in ${lang}, even after a missing deep link`,async()=>{
 const p=await page('newsletter/index.html',{issues,clipboardDenied:true,storage:{ministerioLanguage:lang},reduced:true});
 p.location.search='?issue=unavailable&tracking=private';p.location.hash='#obsolete';
 p.run('renderNewsletterPage(cachedNewsletterIssues)');
 click(p,p.document.getElementById('copyNewsletterLink'));await settle();
 const status=p.document.getElementById('newsletterToolStatus');
 const link=status.querySelector('a');assert(link,'a usable fallback URL is visible');
 assert.equal(link.href,'https://mcshekinah.org/newsletter/?issue=new');
 assert.equal(link.textContent,link.href);
 assert.match(status.textContent,lang==='es'?/Copia este enlace/:/Copy this link/);
 assert.equal(p.location.search,'?issue=unavailable&tracking=private','sharing must not change navigation history');
});

for(const denied of [false,true])test(`Sharing: a delayed ${denied?'failure':'success'} cannot label another issue`,async()=>{
 const p=await page('newsletter/index.html',{issues});
 p.run(`let finishCopy;navigator.clipboard.writeText=()=>new Promise((resolve,reject)=>{finishCopy=()=>${denied?'reject(new Error("denied"))':'resolve()'};});`);
 click(p,p.document.getElementById('copyNewsletterLink'));
 click(p,p.document.querySelector('.archive-item'));
 assert.equal(p.document.getElementById('latestNewsletter').dataset.issueId,'old');
 p.run('finishCopy()');await settle();
 assert.equal(p.document.getElementById('newsletterToolStatus').textContent,'');
});

test('Sharing: fallback links encode CMS IDs and never create executable markup',async()=>{
 const id='\"><svg onload=alert(1)> /?x=#';
 const p=await page('newsletter/index.html',{issues:[{...issues[0],id}],clipboardDenied:true});
 click(p,p.document.getElementById('copyNewsletterLink'));await settle();
 const status=p.document.getElementById('newsletterToolStatus');safeMarkup(assert,status);
 const link=new URL(status.querySelector('a').href);
 assert.equal(link.origin,'https://mcshekinah.org');assert.equal(link.searchParams.get('issue'),id);
 assert.equal(link.hash,'');assert.equal(link.pathname,'/newsletter/');
});

// Read-only production checks. Edge POSTs request only a denied list operation.
// No passwords, signups, invitations, content writes, or destructive probes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {read}=require('./helpers.cjs');
const config={};require('node:vm').runInNewContext(read('supabase-config.js').split('/* Admin-only')[0],{window:config});
const {url:api,publishableKey}=config.SHEKINAH_SUPABASE;
const site='https://mcshekinah.org';
const results=[];const findings=[];
async function get(url,options={}){return fetch(url,{...options,signal:AbortSignal.timeout(15000)});}
async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,detail:e.message});}}
const rest=(path,options={})=>get(api+'/rest/v1/'+path,{...options,headers:{apikey:publishableKey,...options.headers}});
(async()=>{
 for(const path of ['/','/newsletter/','/admin/','/privacy/','/terms/','/contact/','/newsletter.html','/admin.html']) await check('HTTPS page and CSP: '+path,async()=>{const r=await get(site+path);assert.equal(r.status,200);const html=await r.text();assert(html.includes('Content-Security-Policy'));assert(html.includes("object-src 'none'"));});
 await check('HTTP redirects to HTTPS',async()=>{const r=await get('http://mcshekinah.org',{redirect:'manual'});assert([301,302,307,308].includes(r.status));assert(r.headers.get('location').startsWith('https://mcshekinah.org'));});
 for(const table of ['service_settings','announcements','newsletters'])await check('Public intended fields remain readable: '+table,async()=>{const r=await rest(table+'?select=id&limit=5');assert.equal(r.status,200);assert(Array.isArray(await r.json()));});
 for(const [table,query] of [['announcements','active=eq.false'],['newsletters','status=neq.published'],['newsletters','published_at=is.null']])await check('Hidden content excluded: '+table+' '+query,async()=>{const r=await rest(table+'?select=id&'+query);assert.equal(r.status,200);assert.deepEqual(await r.json(),[]);});
 for(const [table,columns] of [['service_settings',['updated_by']],['announcements',['created_by','updated_by']],['newsletters',['created_by','updated_by']]])for(const column of columns)await check('Author metadata denied: '+table+'.'+column,async()=>{const r=await rest(table+'?select='+column+'&limit=1');assert([401,403].includes(r.status));});
 await check('Anonymous cannot list administrator memberships',async()=>{const r=await rest('admin_users?select=user_id');assert([401,403].includes(r.status));});
 await check('Forged REST session cannot authenticate',async()=>{const r=await rest('newsletters?select=id',{headers:{Authorization:'Bearer invalid-session'}});assert.equal(r.status,401);});
 for(const [name,token] of [['missing',null],['malformed','invalid-session'],['forged',Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:'00000000-0000-4000-8000-000000000001',role:'authenticated',exp:4102444800})).toString('base64url')+'.invalid-signature']])await check('Admin Edge rejects '+name+' session',async()=>{const r=await get(api+'/functions/v1/admin-users',{method:'POST',headers:{apikey:publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:'{"action":"list"}'});assert.equal(r.status,401);});
 await check('Admin Edge CORS is restricted to church origin',async()=>{const r=await get(api+'/functions/v1/admin-users',{method:'OPTIONS',headers:{Origin:'https://evil.example','Access-Control-Request-Method':'POST'}});assert.equal(r.headers.get('access-control-allow-origin'),site);assert(!r.headers.get('access-control-allow-methods')?.includes('DELETE'));});
 for(const path of ['/.env','/.git/config','/supabase/.env'])await check('Sensitive file absent: '+path,async()=>{const r=await get(site+path);assert.equal(r.status,404);});
 const auth=await get(api+'/auth/v1/settings',{headers:{apikey:publishableKey}});assert.equal(auth.status,200);const settings=await auth.json();
 if(!settings.disable_signup)findings.push({name:'Public self-signup remains enabled',action:'Disable new user signups in Supabase Auth if accounts are invitation-only. Non-admin accounts remain denied by tested RLS policies.'});
 const headers=(await get(site+'/admin/')).headers;
 for(const header of ['strict-transport-security','x-content-type-options'])if(!headers.has(header))findings.push({name:'Missing hosting header: '+header,action:'Configure an HTTPS proxy or host that supports custom response headers.'});
 if(!headers.has('x-frame-options')&&!/frame-ancestors/.test(headers.get('content-security-policy')||''))findings.push({name:'Missing header-based framing restriction',action:'Configure CSP frame-ancestors at the hosting/proxy layer; a meta tag cannot enforce this directive.'});
 const report={checkedAt:new Date().toISOString(),mode:'read-only production probes',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,tests:results,findings};
 fs.mkdirSync('security/local-results',{recursive:true});fs.writeFileSync('security/local-results/live-security.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});

const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const {read}=require('./helpers.cjs');
const OWNER='11111111-1111-4111-8111-111111111111';
const TARGET='22222222-2222-4222-8222-222222222222';
const OTHER='33333333-3333-4333-8333-333333333333';
const source=stripTypeScriptTypes(read('supabase/functions/admin-users/index.ts').replace(/^import.*\n/,'').replace('export default','globalThis.edge ='));
function fixture(options={}) {
  const rows=options.rows||[{user_id:OWNER,role:'owner'},{user_id:TARGET,role:'admin'}];
  const calls=[];
  let config;
  const context=vm.createContext({Response,TextDecoder,Uint8Array,console:{error(){}},withSupabase:(c,fn)=>{config=c;return fn;}});
  vm.runInContext(source,context);
  const ctx={userClaims:options.noUser?null:{id:options.caller||OWNER},supabaseAdmin:{
    from(table){let op='select',values,head=false,filters=[];const query={
      select(cols,opts){head=opts?.head||false;return query;},eq(key,val){filters.push([key,val]);return query;},order(){return query;},
      insert(v){op='insert';values=v;return query;},update(v){op='update';values=v;return query;},delete(){op='delete';return query;},
      maybeSingle(){return result(true);},single(){return result(true);},then(resolve,reject){return result(false).then(resolve,reject);}
    };async function result(single){calls.push({table,op,values,filters});if(options.dbError)return {data:null,error:new Error('private-database-secret')};let matches=rows.filter(row=>filters.every(([k,v])=>row[k]===v));if(head)return {count:matches.length,error:null};if(op==='update')matches=matches.map(row=>({...row,...values}));if(op==='delete'&&options.suppressedDelete)matches=[];if(op==='delete'&&options.wrongDeletedRow)matches=[{user_id:OTHER}];return {data:single?(matches[0]||null):matches,error:null};}return query;},
    auth:{admin:{listUsers:async()=>({data:{users:options.users||[]},error:options.authError?new Error('private-auth-secret'):null}),inviteUserByEmail:async(email,opts)=>{calls.push({op:'invite',email,opts});return {data:{user:{id:OTHER}},error:null};}}}
  }};
  async function request(body={action:'list'},opts={}) {const method=opts.method||'POST';const headers={'Content-Type':opts.type||'application/json',...opts.headers};if(opts.origin!==false)headers.Origin=opts.origin||'https://mcshekinah.org';const req=new Request('https://test.invalid/admin-users',{method,headers,...(!['GET','HEAD'].includes(method)?{body:opts.raw??JSON.stringify(body)}:{})});const res=await context.edge.fetch(req,ctx);return {res,body:await res.json(),calls,config};}
  return {request,calls,config};
}
const denyCases=[
 ['unauthenticated caller',{}, {noUser:true},401],
 ['ordinary authenticated user',{}, {caller:OTHER},403],
 ['content administrator cannot manage accounts',{}, {caller:TARGET},403],
 ['owner lookup failure fails closed',{}, {dbError:true},500],
 ['GET cannot list administrators',{method:'GET'},{},405],
 ['PUT cannot perform actions',{method:'PUT'},{},405],
 ['DELETE cannot perform actions',{method:'DELETE'},{},405],
 ['foreign browser origin',{origin:'https://evil.example'},{},403],
 ['null origin',{origin:'null'},{},403],
 ['lookalike site origin',{origin:'https://mcshekinah.org.evil.example'},{},403],
 ['text body rejected',{type:'text/plain'},{},415],
 ['JSONP content type rejected',{type:'application/jsonp'},{},415],
 ['malformed JSON',{raw:'{'},{},400],
 ['null body',{raw:'null'},{},400],
 ['array body',{raw:'[]'},{},400],
 ['scalar body',{raw:'1'},{},400],
 ['missing action',{raw:'{}'},{},400],
 ['nonstring action',{raw:'{"action":{}}'},{},400],
 ['oversized body',{raw:'{"action":"list","x":"'+'a'.repeat(8192)+'"}'},{},413]
];
for(const [name,opts,options,status] of denyCases)test('Edge: '+name,async()=>{const f=fixture(options);const r=await f.request(undefined,opts);assert.equal(r.res.status,status);assert(!f.calls.some(c=>['insert','update','delete','invite'].includes(c.op)));assert(!JSON.stringify(r.body).includes('private-'));});
const badActions=[
 ['unknown action',{action:'delete-all'},400],
 ['invalid invite address',{action:'invite',email:'a@'},400],
 ['email header injection',{action:'invite',email:'a@example.com\r\nBcc: b@example.com'},400],
 ['oversized invite address',{action:'invite',email:'a'.repeat(250)+'@test.org'},400],
 ['nonstrings cannot become email',{action:'invite',email:{}},400],
 ['role must be allowlisted',{action:'set-role',userId:TARGET,role:'service_role'},400],
 ['role target must be UUID',{action:'set-role',userId:'../owner',role:'admin'},400],
 ['remove target must be UUID',{action:'remove',userId:'*'},400],
 ['self-demotion blocked',{action:'set-role',userId:OWNER,role:'admin'},409],
 ['self-removal blocked',{action:'remove',userId:OWNER},409],
 ['missing removal target',{action:'remove',userId:OTHER},404],
];
for(const [name,body,status] of badActions)test('Edge: '+name,async()=>{const f=fixture();const r=await f.request(body);assert.equal(r.res.status,status);assert(!f.calls.some(c=>['insert','update','delete','invite'].includes(c.op)));});
test('Edge: successful owner list is never cached',async()=>{const r=await fixture().request();assert.equal(r.res.status,200);assert.equal(r.body.admins.length,2);assert.equal(r.res.headers.get('cache-control'),'no-store');assert.equal(r.res.headers.get('x-content-type-options'),'nosniff');});
test('Edge: internal auth errors do not reach caller',async()=>{const r=await fixture({authError:true}).request();assert.equal(r.res.status,500);assert(!JSON.stringify(r.body).includes('private-auth-secret'));});
test('Edge: invites default to content admin even if role is injected',async()=>{const r=await fixture().request({action:'invite',email:' New@Example.org ',role:'owner'});assert.equal(r.res.status,200);assert.equal(r.body.role,'admin');const invitation=r.calls.find(c=>c.op==='invite');assert.equal(invitation.email,'new@example.org');assert.equal(invitation.opts.redirectTo,'https://mcshekinah.org/admin/');assert.equal(r.calls.find(c=>c.op==='insert').values.role,'admin');});
test('Edge: already-authorized owner is not demoted by invite',async()=>{const r=await fixture({users:[{id:OWNER,email:'owner@example.org'}]}).request({action:'invite',email:'owner@example.org'});assert.equal(r.body.role,'owner');assert(!r.calls.some(c=>['insert','invite','update'].includes(c.op)));});
test('Edge: an owner may change another administrator role',async()=>{const r=await fixture().request({action:'set-role',userId:TARGET,role:'owner'});assert.equal(r.res.status,200);assert.equal(r.body.admin.role,'owner');});
test('Edge: an owner may remove another content administrator',async()=>{const r=await fixture().request({action:'remove',userId:TARGET});assert.equal(r.res.status,200);assert(r.calls.some(c=>c.op==='delete'));});
test('Edge: a silently suppressed deletion cannot report revoked administrator access',async()=>{const r=await fixture({suppressedDelete:true}).request({action:'remove',userId:TARGET});assert.equal(r.res.status,409);assert.match(r.body.error,/not removed/);assert.equal(r.body.ok,undefined);});
test('Edge: a removal response must identify the requested administrator',async()=>{const r=await fixture({wrongDeletedRow:true}).request({action:'remove',userId:TARGET});assert.equal(r.res.status,409);assert.equal(r.body.ok,undefined);});
test('Edge: authentication middleware required and CORS constrained',()=>{const {config}=fixture();assert.equal(config.auth,'user');assert.equal(config.cors['Access-Control-Allow-Origin'],'https://mcshekinah.org');assert.equal(config.cors['Access-Control-Allow-Methods'],'POST, OPTIONS');});

const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const {read}=require('./helpers.cjs');

// Real PostgreSQL trigger semantics in an isolated WASM database. These tests
// never connect to Supabase and contain only fictional account identifiers.
const OWNER='11111111-1111-4111-8111-111111111111';
const ADMIN='22222222-2222-4222-8222-222222222222';
const OTHER='33333333-3333-4333-8333-333333333333';
const historical=read('supabase/migrations/202608090003_security_hardening.sql');
const original=historical.slice(historical.indexOf('create or replace function private.prevent_last_owner_loss()'),historical.lastIndexOf('commit;'));
const repair=read('supabase/migrations/20261018202726_fix_admin_removal_trigger.sql');
let db;
before(async()=>{
  db=new PGlite();
  await db.exec("CREATE SCHEMA private; CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE public.admin_users(user_id uuid PRIMARY KEY,role text NOT NULL CHECK(role IN ('owner','admin')));");
  await db.exec(original);
});
after(async()=>{await db?.close();});
beforeEach(async()=>{
  await db.exec(repair);
  await db.exec('TRUNCATE public.admin_users;');
  await db.query('INSERT INTO public.admin_users VALUES($1,\'owner\'),($2,\'admin\')',[OWNER,ADMIN]);
});
const rows=async()=> (await db.query('SELECT user_id,role FROM public.admin_users ORDER BY user_id')).rows;

test('Database: migration repairs a silently suppressed content-admin deletion',async()=>{
  await db.exec(original);
  assert.deepEqual((await db.query('DELETE FROM public.admin_users WHERE user_id=$1 RETURNING user_id',[ADMIN])).rows,[]);
  assert.equal((await rows()).length,2,'The original trigger retained the supposedly removed account');
  await db.exec(repair);
  assert.deepEqual((await db.query('DELETE FROM public.admin_users WHERE user_id=$1 RETURNING user_id',[ADMIN])).rows,[{user_id:ADMIN}]);
  assert.deepEqual(await rows(),[{user_id:OWNER,role:'owner'}]);
});
test('Database: deleting the final Owner remains forbidden',async()=>{
  await assert.rejects(db.query('DELETE FROM public.admin_users WHERE user_id=$1',[OWNER]),{code:'23514'});
  assert.equal((await rows()).length,2);
});
test('Database: demoting the final Owner remains forbidden',async()=>{
  await assert.rejects(db.query("UPDATE public.admin_users SET role='admin' WHERE user_id=$1",[OWNER]),{code:'23514'});
  assert.equal((await rows())[0].role,'owner');
});
test('Database: another Owner allows a confirmed removal',async()=>{
  await db.query("INSERT INTO public.admin_users VALUES($1,'owner')",[OTHER]);
  assert.deepEqual((await db.query('DELETE FROM public.admin_users WHERE user_id=$1 RETURNING user_id',[OWNER])).rows,[{user_id:OWNER}]);
  assert.equal((await rows()).filter(row=>row.role==='owner').length,1);
});
test('Database: another Owner allows demotion and ordinary promotions still work',async()=>{
  await db.query("UPDATE public.admin_users SET role='owner' WHERE user_id=$1",[ADMIN]);
  await db.query("UPDATE public.admin_users SET role='admin' WHERE user_id=$1",[OWNER]);
  assert.deepEqual(await rows(),[{user_id:OWNER,role:'admin'},{user_id:ADMIN,role:'owner'}]);
});
test('Database: a bulk delete cannot remove the last Owner or partially revoke others',async()=>{
  await db.query("INSERT INTO public.admin_users VALUES($1,'owner')",[OTHER]);
  const before=await rows();
  await assert.rejects(db.query('DELETE FROM public.admin_users'),{code:'23514'});
  assert.deepEqual(await rows(),before);
});
test('Database: a bulk demotion is atomic and leaves the Owners intact',async()=>{
  await db.query("INSERT INTO public.admin_users VALUES($1,'owner')",[OTHER]);
  const before=await rows();
  await assert.rejects(db.query("UPDATE public.admin_users SET role='admin' WHERE role='owner'"),{code:'23514'});
  assert.deepEqual(await rows(),before);
});
test('Database: the repair preserves trigger, private privileges and account data when repeated',async()=>{
  const before=await rows();await db.exec(repair);await db.exec(repair);assert.deepEqual(await rows(),before);
  const result=await db.query("SELECT t.tgenabled, p.prosecdef, p.proconfig, has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute, has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgname='protect_last_owner'");
  assert.deepEqual(result.rows,[{tgenabled:'O',prosecdef:true,proconfig:['search_path=""'],anon_execute:false,authenticated_execute:false}]);
});

async function removeThroughHandler(){
  const source=stripTypeScriptTypes(read('supabase/functions/admin-users/index.ts').replace(/^import.*\n/,'').replace('export default','globalThis.edge ='));
  const context=vm.createContext({Response,TextDecoder,Uint8Array,console:{error(){}},withSupabase:(_,handler)=>handler});
  vm.runInContext(source,context);
  const client={from(table){
    assert.equal(table,'admin_users');let operation='SELECT',columns='user_id,role',head=false;const filters=[];
    const query={select(value,options){columns=value;head=Boolean(options?.head);return query},eq(key,value){assert(['user_id','role'].includes(key));filters.push([key,value]);return query},delete(){operation='DELETE';return query},maybeSingle(){return execute(true)},then(resolve,reject){return execute(false).then(resolve,reject)}};
    async function execute(single){
      const where=filters.map(([key],i)=>`${key}=$${i+1}`).join(' AND ');
      const sql=operation==='DELETE'?`DELETE FROM public.admin_users WHERE ${where} RETURNING ${columns}`:`SELECT ${head?'count(*)::int AS count':columns} FROM public.admin_users WHERE ${where}`;
      try{const result=await db.query(sql,filters.map(([,value])=>value));return head?{count:result.rows[0].count,error:null}:{data:single?result.rows[0]||null:result.rows,error:null};}
      catch(error){return {data:null,error};}
    }
    return query;
  }};
  const response=await context.edge.fetch(new Request('https://test.invalid/admin-users',{method:'POST',headers:{'content-type':'application/json',origin:'https://mcshekinah.org'},body:JSON.stringify({action:'remove',userId:ADMIN})}),{userClaims:{id:OWNER},supabaseAdmin:client});
  return {status:response.status,body:await response.json()};
}

test('Database + Edge: the handler detects the original trigger failure before the repair is applied',async()=>{
  await db.exec(original);
  const result=await removeThroughHandler();assert.equal(result.status,409);assert.match(result.body.error,/not removed/);
  assert.equal((await rows()).length,2);
});
test('Database + Edge: the repaired trigger confirms actual access removal through the handler',async()=>{
  const result=await removeThroughHandler();assert.equal(result.status,200);assert.equal(result.body.ok,true);
  assert.deepEqual(await rows(),[{user_id:OWNER,role:'owner'}]);
});

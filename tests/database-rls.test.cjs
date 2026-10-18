const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {root}=require('./helpers.cjs');

// Apply the complete repository migration chain, then exercise the actual
// policies as PostgreSQL roles. Auth identities are local fictional fixtures;
// this does not replace a test of hosted Auth middleware or concurrent sessions.
const OWNER='11111111-1111-4111-8111-111111111111';
const ADMIN='22222222-2222-4222-8222-222222222222';
const OUTSIDER='33333333-3333-4333-8333-333333333333';
let db;
before(async()=>{
  db=new PGlite();
  await db.exec(`CREATE SCHEMA auth;
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;`);
  const directory=path.join(root,'supabase/migrations');
  for(const name of fs.readdirSync(directory).filter(name=>name.endsWith('.sql')).sort())await db.exec(fs.readFileSync(path.join(directory,name),'utf8'));
  await db.query('INSERT INTO auth.users VALUES($1),($2),($3)',[OWNER,ADMIN,OUTSIDER]);
});
after(async()=>{await db?.close();});
beforeEach(async()=>{
  await db.exec('RESET ROLE;');
  await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
  await db.exec('TRUNCATE public.admin_users,public.announcements,public.newsletters;');
  await db.query('INSERT INTO auth.users VALUES($1),($2),($3) ON CONFLICT DO NOTHING',[OWNER,ADMIN,OUTSIDER]);
  await db.query("INSERT INTO public.admin_users(user_id,role) VALUES($1,'owner'),($2,'admin')",[OWNER,ADMIN]);
  await db.exec("INSERT INTO public.announcements(id,active,title_en,title_es) VALUES('public',true,'Public','Público'),('private',false,'Private','Privado'); INSERT INTO public.newsletters(id,issue_date,status,published_at,title_en,title_es) VALUES('published','2026-10-18','published',now(),'Public','Público'),('draft','2026-10-11','draft',null,'Private','Privado');");
});
async function asRole(role,user,action){
  assert(['anon','authenticated','service_role'].includes(role));
  await db.exec(`SET ROLE ${role}`);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user||'']);
  try{return await action();}finally{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub','',false)");}
}
for(const [role,user] of [['anon',null],['authenticated',OUTSIDER]])test(`RLS: ${role} nonmembers see public content only and cannot write`,async()=>{
  await asRole(role,user,async()=>{
    assert.deepEqual((await db.query('SELECT id FROM public.announcements ORDER BY id')).rows,[{id:'public'}]);
    assert.deepEqual((await db.query('SELECT id FROM public.newsletters ORDER BY id')).rows,[{id:'published'}]);
    if(role==='anon')await assert.rejects(db.query("UPDATE public.service_settings SET day_en='Altered' WHERE id=1"),{code:'42501'});
    else assert.deepEqual((await db.query("UPDATE public.service_settings SET day_en='Altered' WHERE id=1 RETURNING id")).rows,[]);
    await assert.rejects(db.query("INSERT INTO public.announcements(id,title_en,title_es) VALUES('forbidden','No','No')"),{code:'42501'});
  });
});
test('RLS: revocation immediately removes private reads and writes for the same authenticated identity',async()=>{
  await asRole('authenticated',ADMIN,async()=>{
    assert.equal((await db.query('SELECT id FROM public.newsletters')).rows.length,2);
    assert.deepEqual((await db.query("UPDATE public.service_settings SET day_en='Authorized' WHERE id=1 RETURNING id")).rows,[{id:1}]);
  });
  await asRole('service_role',null,async()=>assert.deepEqual((await db.query('DELETE FROM public.admin_users WHERE user_id=$1 RETURNING user_id',[ADMIN])).rows,[{user_id:ADMIN}]));
  await asRole('authenticated',ADMIN,async()=>{
    assert.deepEqual((await db.query('SELECT user_id FROM public.admin_users')).rows,[]);
    assert.deepEqual((await db.query('SELECT id FROM public.newsletters ORDER BY id')).rows,[{id:'published'}]);
    assert.deepEqual((await db.query("UPDATE public.service_settings SET day_en='Revoked' WHERE id=1 RETURNING id")).rows,[]);
    assert.deepEqual((await db.query("DELETE FROM public.announcements WHERE id='private' RETURNING id")).rows,[]);
    await assert.rejects(db.query("INSERT INTO public.newsletters(id,issue_date,title_en,title_es) VALUES('forbidden','2026-10-10','No','No')"),{code:'42501'});
  });
});
test('RLS: content administrators cannot manage membership or read author UUID columns',async()=>{
  await asRole('authenticated',ADMIN,async()=>{
    assert.deepEqual((await db.query('SELECT user_id FROM public.admin_users')).rows,[{user_id:ADMIN}]);
    await assert.rejects(db.query('DELETE FROM public.admin_users WHERE user_id=$1',[OWNER]),{code:'42501'});
    await assert.rejects(db.query("UPDATE public.admin_users SET role='owner' WHERE user_id=$1",[ADMIN]),{code:'42501'});
    for(const table of ['service_settings','announcements','newsletters'])await assert.rejects(db.query(`SELECT updated_by FROM public.${table}`),{code:'42501'});
  });
});
test('RLS: privileged account management retains least privilege over church content',async()=>{
  await asRole('service_role',null,async()=>{
    for(const table of ['service_settings','announcements','newsletters'])await assert.rejects(db.query(`SELECT id FROM public.${table}`),{code:'42501'});
    await assert.rejects(db.query('DELETE FROM public.admin_users WHERE user_id=$1',[OWNER]),{code:'23514'});
  });
});
test('RLS: deleting an Auth fixture account cascades to membership without retaining access',async()=>{
  assert.deepEqual((await db.query('DELETE FROM auth.users WHERE id=$1 RETURNING id',[ADMIN])).rows,[{id:ADMIN}]);
  assert.deepEqual((await db.query('SELECT user_id FROM public.admin_users WHERE user_id=$1',[ADMIN])).rows,[]);
  await asRole('authenticated',ADMIN,async()=>{
    assert.deepEqual((await db.query('SELECT id FROM public.newsletters ORDER BY id')).rows,[{id:'published'}]);
    assert.deepEqual((await db.query("UPDATE public.service_settings SET day_en='Deleted account' WHERE id=1 RETURNING id")).rows,[]);
  });
});
test('RLS: an Auth cascade cannot delete the final Owner account',async()=>{
  await assert.rejects(db.query('DELETE FROM auth.users WHERE id=$1',[OWNER]),{code:'23514'});
  assert.deepEqual((await db.query('SELECT id FROM auth.users WHERE id=$1',[OWNER])).rows,[{id:OWNER}]);
  assert.deepEqual((await db.query('SELECT user_id FROM public.admin_users WHERE user_id=$1',[OWNER])).rows,[{user_id:OWNER}]);
});

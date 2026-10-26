const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {read}=require('./helpers.cjs');

// Execute the exact vendored SDK, not a stub of its session-writing behavior.
// The injected fetch never leaves this process and has no real credentials.
async function fixture() {
  const context={console,URL,URLSearchParams,Headers,Request,Response,AbortController,
    TextEncoder,TextDecoder,crypto:globalThis.crypto,WebSocket:globalThis.WebSocket,
    setTimeout,clearTimeout,setInterval,clearInterval};
  vm.runInNewContext(read('assets/vendor/supabase-2.112.2.js'),context);
  const storage=new Map();
  const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{},user_metadata:{}};
  const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test-signature';
  let release,started;
  const held=new Promise(resolve=>{release=resolve});
  const updateStarted=new Promise(resolve=>{started=resolve});
  const events=[];
  const client=context.supabase.createClient('https://fixture.example.test','fixture-publishable-key',{
    auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,lock:context.supabase.processLock,
      storage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}},
    global:{fetch:async(url,options={})=>{
      const path=new URL(url).pathname;
      if(path==='/auth/v1/user'&&options.method==='PUT'){
        events.push('password-start');started();await held;events.push('password-end');
        return new Response(JSON.stringify(user),{headers:{'Content-Type':'application/json'}});
      }
      if(path==='/auth/v1/user')return new Response(JSON.stringify(user),{headers:{'Content-Type':'application/json'}});
      if(path==='/auth/v1/logout'){events.push('logout');return new Response(null,{status:204});}
      throw Error('Unexpected fixture request: '+path);
    }}
  });
  const result=await client.auth.setSession({access_token:token,refresh_token:'fixture-refresh'});
  assert.equal(result.error,null);
  return {client,release,updateStarted,events};
}

test('Real Auth SDK: process-lock fallback prevents a delayed password response restoring a signed-out session',{timeout:10000},async()=>{
  const p=await fixture();
  try {
    const update=p.client.auth.updateUser({password:'Fixture-only password 42!'});
    await p.updateStarted;
    const signOut=p.client.auth.signOut();
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(p.events,['password-start'],'Sign-out waits for the earlier session write');
    p.release();
    assert.equal((await update).error,null);assert.equal((await signOut).error,null);
    assert.deepEqual(p.events,['password-start','password-end','logout']);
    assert.equal((await p.client.auth.getSession()).data.session,null);
  } finally {p.release();await p.client.auth.dispose();}
});

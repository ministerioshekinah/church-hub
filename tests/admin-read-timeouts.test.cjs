const test=require('node:test');
const assert=require('node:assert/strict');
const {page}=require('./helpers.cjs');
const http=require('node:http');
const {once}=require('node:events');

async function fixture(){
  const p=await page('admin/index.html');
  p.run(`window.SHEKINAH_SUPABASE={url:'https://fixture.example.test',publishableKey:'fixture-key'};
    let timers=new Map(),nextTimer=0,fetches=[];
    setTimeout=(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,delay});return id};
    clearTimeout=id=>timers.delete(id);
    fetch=async(input,options)=>{fetches.push({input,options});return {ok:true}};`);
  return p;
}

test('Auth read deadline: a stalled identity body can be aborted after headers arrive',async()=>{
  const p=await fixture();
  await p.run(`fetchAdminRequest('https://fixture.example.test/auth/v1/user',{method:'GET'})`);
  assert.equal(p.run('fetches[0].options.signal.aborted'),false);
  assert.equal(p.run('[...timers.values()][0].delay'),10000);
  p.run('[...timers.values()][0].callback()');
  assert.equal(p.run('fetches[0].options.signal.aborted'),true);
  assert.equal(p.run('timers.size'),0);
});

test('Auth read deadline: the native fetch body rejects when a local server sends headers but never finishes JSON',async()=>{
  const server=http.createServer((request,response)=>{
    assert.equal(request.url,'/auth/v1/user');
    response.writeHead(200,{'Content-Type':'application/json'});
    response.write('{"id":');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try {
    const p=await fixture();p.browser.fixtureNativeFetch=fetch;
    p.run(`window.SHEKINAH_SUPABASE.url='http://127.0.0.1:${server.address().port}';fetch=(input,options)=>window.fixtureNativeFetch(input,options);`);
    const response=await p.run(`fetchAdminRequest(window.SHEKINAH_SUPABASE.url+'/auth/v1/user')`);
    const body=response.json();
    p.run('[...timers.values()][0].callback()');
    await assert.rejects(body,{name:'AbortError'});
    assert.equal(p.run('timers.size'),0);
  } finally {
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
});

test('Auth read deadline: writes, other endpoints and other origins keep their original fetch semantics',async()=>{
  const p=await fixture();
  for(const [address,method] of [
    ['https://fixture.example.test/auth/v1/user','PUT'],
    ['https://fixture.example.test/auth/v1/token','POST'],
    ['https://fixture.example.test/auth/v1/recover','POST'],
    ['https://fixture.example.test/auth/v1/logout','POST'],
    ['https://fixture.example.test/rest/v1/newsletters','GET'],
    ['https://other.example.test/auth/v1/user','GET']
  ])await p.run(`fetchAdminRequest(${JSON.stringify(address)},{method:${JSON.stringify(method)}})`);
  assert.equal(p.run('fetches.length'),6);assert.equal(p.run('timers.size'),0);
  assert.equal(p.run('fetches.every(request=>request.options.signal===undefined)'),true);
});

test('Auth read deadline: caller cancellation and an already aborted request are preserved',async()=>{
  const p=await fixture();
  await p.run(`let source=new AbortController();fetchAdminRequest('https://fixture.example.test/auth/v1/user',{signal:source.signal})`);
  p.run('source.abort()');
  assert.equal(p.run('fetches[0].options.signal.aborted'),true);assert.equal(p.run('timers.size'),0);
  await p.run(`fetchAdminRequest({url:'https://fixture.example.test/auth/v1/user',method:'GET',signal:source.signal})`);
  assert.equal(p.run('fetches[1].options.signal.aborted'),true);assert.equal(p.run('timers.size'),0);
});

test('Auth read deadline: network rejection clears its timer and retains the original error',async()=>{
  const p=await fixture();p.run('fetch=async()=>{throw Error("fixture offline")}');
  await assert.rejects(p.run(`fetchAdminRequest('https://fixture.example.test/auth/v1/user')`),/fixture offline/);
  assert.equal(p.run('timers.size'),0);
});

test('Membership read: verified, absent and unavailable responses remain distinct and use an abort signal',async()=>{
  const p=await fixture();
  p.run(`let result={data:{user_id:'fixture-admin'},error:null},readSignal;
    supabaseClient={from(){return {select(){return this},eq(){return this},abortSignal(signal){readSignal=signal;return this},async maybeSingle(){return result}}}};`);
  assert.equal(await p.run(`verifyAdmin('fixture-admin')`),true);
  assert.equal(p.run('typeof readSignal.addEventListener'),"function");
  p.run('result={data:null,error:null}');assert.equal(await p.run(`verifyAdmin('fixture-admin')`),false);
  p.run('result={data:null,error:{message:"fixture unavailable"}}');assert.equal(await p.run(`verifyAdmin('fixture-admin')`),null);
  assert.equal(p.run('timers.size'),0);
});

test('Membership outage: startup stays signed out, gives retry guidance and does not revoke a valid session',async()=>{
  const p=await fixture();
  p.run(`let signOuts=0;supabaseClient={auth:{getUser:async()=>({data:{user:{id:'fixture-admin'}},error:null}),signOut:async()=>{signOuts++;return {error:null}}}};verifyAdmin=async()=>null;`);
  await p.run('restoreAuthenticatedAdmin()');
  assert.equal(p.run('signOuts'),0);assert.equal(p.run('authenticatedAdmin'),null);
  assert.match(p.document.getElementById('adminMessage').textContent,/access could not be verified/);
  assert.equal(p.document.getElementById('adminEmail').disabled,false);
});

test('Auth startup exception: an SDK lock or initialization failure exposes usable recovery guidance',async()=>{
  const p=await fixture();
  p.run(`window.supabase={createClient:()=>({auth:{onAuthStateChange(){},getUser:async()=>{throw Error('fixture lock timeout')}}})};`);
  await p.run('initializeAuth()');
  assert.equal(p.run('authenticatedAdmin'),null);assert.equal(p.document.getElementById('adminEmail').disabled,false);
  assert.match(p.document.getElementById('adminMessage').textContent,/could not finish loading/);
});

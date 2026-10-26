const test = require('node:test');
const assert = require('node:assert/strict');
const { page, click, read } = require('./helpers.cjs');
const settle = () => new Promise(resolve => setImmediate(resolve));
const secret = 'Fixture-only passphrase 42!';

async function account({hash='',signedIn=true}={}) {
  const p=await page('admin/index.html');p.location.hash=hash;p.run(read('admin-account.js'));
  p.run(`let calls=[],allow=true,identityError=null,identityId='fixture-admin',passwordError=null,passwordResult='fixture-admin',codeError=null;
    supabaseClient={auth:{
      getUser:async()=>{calls.push('identity');return {data:{user:identityId?{id:identityId}:null},error:identityError}},
      updateUser:async attributes=>{calls.push({update:attributes});return {data:{user:passwordResult?{id:passwordResult}:null},error:passwordError}},
      reauthenticate:async()=>{calls.push('code');return {error:codeError}}
    }};
    window.SHEKINAH_ACCOUNT.connect({client:supabaseClient,identity:()=>authenticatedAdmin,generation:()=>adminSessionVersion,
      verify:async()=>{calls.push('membership');return allow},invalidate(message){showLogin();adminMessage.textContent=message},
      open(){selectAdminSection(document.getElementById('accountTab'))}});`);
  if(signedIn)p.run(`authenticatedAdmin={id:'fixture-admin'};dashboard.classList.add('visible');loginView.classList.add('hidden');window.SHEKINAH_ACCOUNT.authenticated({id:'fixture-admin',email:'editor@example.test'});`);
  return p;
}

function submit(p, password=secret, confirmation=password) {
  p.document.getElementById('accountNewPassword').value=password;
  p.document.getElementById('accountConfirmPassword').value=confirmation;
  p.document.getElementById('accountPasswordForm').dispatchEvent(new p.Event('submit',{bubbles:true,cancelable:true}));
}
const status=p=>p.document.getElementById('accountPasswordStatus').textContent;
const calls=p=>JSON.parse(p.run('JSON.stringify(calls)'));

for(const hash of ['#type=invite','#type=recovery'])test(`Account: ${hash} selects setup only after verified administrator identity`,async()=>{
  const p=await account({hash,signedIn:false});
  assert.equal(p.document.getElementById('accountTab').hidden,true);
  submit(p);await settle();assert.deepEqual(calls(p),[]);
  p.run(`authenticatedAdmin={id:'fixture-admin'};window.SHEKINAH_ACCOUNT.authenticated({id:'fixture-admin',email:'editor@example.test'});`);
  assert.equal(p.document.getElementById('accountTab').hidden,false);
  assert.equal(p.document.getElementById('accountSetupNotice').hidden,false);
  assert.equal(p.reports.focused,'accountNewPassword');
  assert.deepEqual(calls(p),[],'Displaying setup does not change credentials or send mail');
});

test('Account: normal sign-in stays in the current editor until Account is selected',async()=>{
  const p=await account();
  assert.equal(p.document.querySelector('.admin-content-tab.active').dataset.adminSection,'service');
  assert.equal(p.document.getElementById('accountSetupNotice').hidden,true);
  assert.equal(p.document.getElementById('accountIdentity').textContent,'editor@example.test');
  click(p,p.document.getElementById('accountTab'));
  assert.equal(p.document.querySelector('.admin-content-tab.active').dataset.adminSection,'account');
});

test('Account: an SDK recovery event opens setup without calling Auth from its callback',async()=>{
  const p=await account();
  p.run(`window.SHEKINAH_ACCOUNT.authEvent('PASSWORD_RECOVERY',{user:{id:'different-user'}});`);
  assert.equal(p.document.getElementById('accountSetupNotice').hidden,true);
  p.run(`window.SHEKINAH_ACCOUNT.authEvent('PASSWORD_RECOVERY',{user:{id:'fixture-admin'}});`);
  assert.equal(p.document.getElementById('accountSetupNotice').hidden,false);
  assert.deepEqual(calls(p),[]);
});

test('Account: short or mismatched passwords fail locally with field focus and no request',async()=>{
  const p=await account();submit(p,'short');await settle();
  assert.match(status(p),/at least 12/);assert.equal(p.reports.focused,'accountNewPassword');
  submit(p,secret,'different fixture value');await settle();
  assert.match(status(p),/do not match/);assert.equal(p.reports.focused,'accountConfirmPassword');
  assert.deepEqual(calls(p),[]);
});

test('Account: a password change verifies identity and membership and clears every secret after a confirmed response',async()=>{
  const p=await account();p.document.getElementById('accountCurrentPassword').value='Old fixture password';
  submit(p);await settle();
  assert.deepEqual(calls(p),['identity','membership',{update:{password:secret,current_password:'Old fixture password'}}]);
  assert.match(status(p),/^Password saved/);
  for(const id of ['accountCurrentPassword','accountNewPassword','accountConfirmPassword','accountVerificationCode'])assert.equal(p.document.getElementById(id).value,'');
  assert.equal(p.document.getElementById('accountSavePassword').disabled,false);
  assert.equal(p.storage.size,0,'The account module never persists a password or a private form');
  assert.deepEqual(p.reports.errors,[]);
});

for(const state of ['identity failure','different identity','revoked membership'])test(`Account: ${state} cannot reach the password mutation`,async()=>{
  const p=await account();p.run(state==='identity failure'?'identityError=new Error("offline")':state==='different identity'?'identityId="other-admin"':'allow=false');
  submit(p);await settle();
  assert(!calls(p).some(call=>typeof call==='object'));
  if(state!=='identity failure'){
    assert.equal(p.document.getElementById('accountTab').hidden,true);
    assert.equal(p.run('authenticatedAdmin'),null);
    assert.equal(p.document.getElementById('accountNewPassword').value,'');
  } else assert.match(status(p),/could not be verified/);
});

for(const code of ['weak_password','same_password','unknown_error'])test(`Account: ${code} is explained without displaying the backend message or claiming success`,async()=>{
  const p=await account();p.run(`passwordError={code:${JSON.stringify(code)},message:'Private backend detail <img src=x onerror=alert(1)>'}`);
  submit(p);await settle();
  assert(!status(p).includes('Private backend detail'));assert(!status(p).includes('Password saved'));
  assert.equal(p.document.getElementById('accountSavePassword').disabled,false);
  assert.equal(p.document.getElementById('accountNewPassword').value,secret);
});

test('Account: reauthentication sends a code only after explicit action and submits that nonce with the password',async()=>{
  const p=await account();p.run('passwordError={code:"reauthentication_needed"}');submit(p);await settle();
  assert.equal(p.document.getElementById('accountReauthentication').hidden,false);
  assert(!calls(p).includes('code'));
  click(p,p.document.getElementById('accountSendCode'));await settle();
  assert.equal(calls(p).filter(call=>call==='code').length,1);
  assert.match(status(p),/Check your account email/);
  p.document.getElementById('accountVerificationCode').value=' 123456 ';
  p.run('passwordError=null');submit(p);await settle();
  assert.deepEqual(calls(p).at(-1),{update:{password:secret,nonce:'123456'}});
  assert.match(status(p),/^Password saved/);
});

test('Account: invalid verification codes can be retried without requesting another email automatically',async()=>{
  const p=await account();p.run('passwordError={code:"reauthentication_not_valid"}');
  submit(p);await settle();
  assert.match(status(p),/invalid or expired/);assert(!calls(p).includes('code'));
  assert.equal(p.document.getElementById('accountReauthentication').hidden,false);
});

test('Account: an incomplete success response cannot claim that the password was saved',async()=>{
  const p=await account();p.run('passwordResult=null');submit(p);await settle();
  assert.match(status(p),/could not be verified/);assert(!status(p).includes('Password saved'));
});

test('Account: concurrent submits share one operation and a late identity response after logout cannot write',async()=>{
  const p=await account();p.run('let finishIdentity;supabaseClient.auth.getUser=()=>{calls.push("identity");return new Promise(resolve=>{finishIdentity=resolve})}');
  submit(p);submit(p);await settle();assert.deepEqual(calls(p),['identity']);
  assert.equal(p.document.getElementById('accountSavePassword').disabled,true);
  p.run('showLogin();finishIdentity({data:{user:{id:"fixture-admin"}}})');await settle();
  assert.deepEqual(calls(p),['identity']);assert.equal(status(p),'');assert.equal(p.document.getElementById('accountNewPassword').value,'');
});

test('Account: an old password response cannot overwrite the next account screen or unlock its request',async()=>{
  const p=await account();p.run('let finishes=[];supabaseClient.auth.updateUser=()=>new Promise(resolve=>finishes.push(resolve))');
  submit(p);await settle();
  p.run('showLogin();authenticatedAdmin={id:"next-admin"};identityId="next-admin";window.SHEKINAH_ACCOUNT.authenticated({id:"next-admin",email:"next@example.test"})');
  submit(p);await settle();
  p.run('finishes[0]({data:{user:{id:"fixture-admin"}}})');await settle();
  assert.equal(status(p),'');assert.equal(p.document.getElementById('accountSavePassword').disabled,true);
  p.run('finishes[1]({data:{user:{id:"next-admin"}}})');await settle();
  assert.match(status(p),/^Password saved/);assert.equal(p.document.getElementById('accountIdentity').textContent,'next@example.test');
});

test('Account: a thrown network error unlocks the form without logging passwords',async()=>{
  const p=await account();p.run('supabaseClient.auth.updateUser=async()=>{throw Error("private request details")};');submit(p);await settle();
  assert.match(status(p),/Check your connection/);assert.equal(p.document.getElementById('accountSavePassword').disabled,false);
  assert.deepEqual(p.reports.errors,[]);
});

test('Account: clear, sign-out, and history-cache cleanup erase and conceal password fields',async()=>{
  const p=await account();
  for(const mode of ['clear','logout','history']){
    p.run('authenticatedAdmin={id:"fixture-admin"};window.SHEKINAH_ACCOUNT.authenticated({id:"fixture-admin"})');
    p.document.getElementById('accountNewPassword').value=secret;
    p.document.getElementById('accountShowPasswords').checked=true;
    p.document.getElementById('accountShowPasswords').dispatchEvent(new p.Event('change',{bubbles:true}));
    assert.equal(p.document.getElementById('accountNewPassword').type,'text');
    if(mode==='clear')click(p,p.document.getElementById('accountClearPassword'));
    else if(mode==='logout')p.run('showLogin()');
    else p.run('clearHistorySessionView()');
    assert.equal(p.document.getElementById('accountNewPassword').value,'');
    assert.equal(p.document.getElementById('accountNewPassword').type,'password');
    assert.equal(p.document.getElementById('accountShowPasswords').checked,false);
  }
});

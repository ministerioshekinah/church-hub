const test=require('node:test');
const assert=require('node:assert/strict');
const {page,read,click}=require('./helpers.cjs');
const settle=()=>new Promise(resolve=>setImmediate(resolve));

async function fixture(){
  const p=await page('admin/index.html');p.run(read('admin-account.js'));
  p.run(`let finishLogout,logoutCalls=0,ownerClears=0;
    supabaseClient={auth:{signOut:()=>{logoutCalls++;return new Promise(resolve=>{finishLogout=resolve})}}};
    authenticatedAdmin={id:'fixture-owner'};lastAuthEventId='fixture-owner';
    window.SHEKINAH_OWNER={clear(){ownerClears++}};
    window.SHEKINAH_ACCOUNT.connect({client:supabaseClient,identity:()=>authenticatedAdmin,generation:()=>adminSessionVersion,verify:async()=>true,open(){}});
    window.SHEKINAH_ACCOUNT.authenticated({id:'fixture-owner',email:'owner@example.test'});
    dashboard.classList.add('visible');loginView.classList.add('hidden');
    document.getElementById('serviceLabelEn').value='Private draft';
    document.getElementById('accountNewPassword').value='Private fixture password';
    document.getElementById('accountNewPassword').type='text';
    passwordInput.value='Private sign-in password';passwordInput.type='text';`);
  return p;
}

test('Sign-out privacy: a pending request immediately clears private data without claiming completion',async()=>{
  const p=await fixture();const generation=p.run('adminSessionVersion');
  click(p,p.document.getElementById('signOutButton'));
  assert.equal(p.document.getElementById('adminDashboard').classList.contains('visible'),false);
  assert.equal(p.document.getElementById('serviceLabelEn').value,'');
  for(const id of ['accountNewPassword','adminPassword']){
    assert.equal(p.document.getElementById(id).value,'');assert.equal(p.document.getElementById(id).type,'password');
  }
  assert.equal(p.run('authenticatedAdmin'),null);assert(p.run('adminSessionVersion')>generation);assert.equal(p.run('ownerClears'),1);
  assert.equal(p.document.getElementById('adminLoginForm').hidden,true);
  assert.equal(p.document.getElementById('forgotPasswordButton').hidden,true);
  assert(!p.document.getElementById('adminMessage').textContent.includes('Signed out securely'));
  p.run('finishLogout({error:null})');await settle();
});

test('Sign-out privacy: provider failure keeps private data cleared and an explicit retry can finish',async()=>{
  const p=await fixture();click(p,p.document.getElementById('signOutButton'));
  p.run('finishLogout({error:{message:"Private provider detail"}})');await settle();
  assert.match(p.document.getElementById('adminMessage').textContent,/could not be confirmed/);
  assert(!p.document.getElementById('adminMessage').textContent.includes('Private provider detail'));
  assert.equal(p.document.getElementById('adminDashboard').classList.contains('visible'),false);
  assert.equal(p.document.getElementById('retrySignOutButton').hidden,false);
  assert.equal(p.reports.focused,'retrySignOutButton');assert.equal(p.run('logoutCalls'),1);
  click(p,p.document.getElementById('retrySignOutButton'));
  assert.equal(p.run('logoutCalls'),2);assert.equal(p.document.getElementById('retrySignOutButton').hidden,true);
  p.run('finishLogout({error:null})');await settle();
  assert.equal(p.document.getElementById('adminMessage').textContent,'Signed out securely.');
  assert.equal(p.document.getElementById('adminLoginForm').hidden,false);assert.equal(p.reports.focused,'adminEmail');
});

test('Sign-out privacy: duplicate requests and hidden sign-in submissions cannot start competing Auth operations',async()=>{
  const p=await fixture();p.run('let signIns=0;supabaseClient.auth.signInWithPassword=async()=>{signIns++;return {error:new Error("blocked")}}');
  click(p,p.document.getElementById('signOutButton'));click(p,p.document.getElementById('signOutButton'));
  p.document.getElementById('adminLoginForm').dispatchEvent(new p.Event('submit',{bubbles:true,cancelable:true}));
  await settle();assert.equal(p.run('logoutCalls'),1);assert.equal(p.run('signIns'),0);
  p.run('finishLogout({error:null})');await settle();
});

test('Sign-out privacy: a confirmed SDK sign-out event wins over a late request failure',async()=>{
  const p=await fixture();click(p,p.document.getElementById('signOutButton'));
  p.run(`handleAdminAuthChange('SIGNED_OUT',null);finishLogout({error:new Error('late failure')});`);await settle();
  assert.equal(p.document.getElementById('adminMessage').textContent,'Signed out securely.');
  assert.equal(p.document.getElementById('retrySignOutButton').hidden,true);assert.equal(p.document.getElementById('adminLoginForm').hidden,false);
});

test('Sign-out privacy: changing identity invalidates an old failed retry and its late completion',async()=>{
  const p=await fixture();click(p,p.document.getElementById('signOutButton'));
  p.run(`handleAdminAuthChange('SIGNED_IN',{user:{id:'other-fixture-account'}});finishLogout({error:new Error('old failure')});`);await settle();
  assert.match(p.document.getElementById('adminMessage').textContent,/signed-in account changed/);
  assert.equal(p.document.getElementById('retrySignOutButton').hidden,true);assert.equal(p.run('logoutCalls'),1);
});

test('Sign-out privacy: a late content response cannot refill the cleared dashboard',async()=>{
  const p=await fixture();p.run(`let finishRead;withAdminReadTimeout=()=>new Promise(resolve=>{finishRead=resolve});let loading=fetchServiceEditor();`);
  click(p,p.document.getElementById('signOutButton'));
  p.run(`finishRead({data:{id:1,service_label_en:'Late private response',updated_at:'fixture-version'},error:null});`);
  await p.run('loading');assert.equal(p.document.getElementById('serviceLabelEn').value,'');
  p.run('finishLogout({error:null})');await settle();
});

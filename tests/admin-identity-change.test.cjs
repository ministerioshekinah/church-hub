const test=require('node:test');
const assert=require('node:assert/strict');
const {page,read}=require('./helpers.cjs');

async function fixture({signedIn=true}={}){
  const p=await page('admin/index.html');p.run(read('admin-account.js'));
  p.run(`let authCallback,identityReads=0,ownerClears=0;
    window.SHEKINAH_SUPABASE={url:'https://fixture.example.test',publishableKey:'fixture'};
    window.supabase={createClient:()=>({auth:{onAuthStateChange(callback){authCallback=callback},getUser:async()=>{identityReads++;return {data:{user:null},error:{name:'AuthSessionMissingError'}}}}})};`);
  await p.run('initializeAuth()');
  p.run(`window.SHEKINAH_OWNER={clear(){ownerClears++}};`);
  if(signedIn)p.run(`authenticatedAdmin={id:'fixture-owner'};dashboard.classList.add('visible');loginView.classList.add('hidden');window.SHEKINAH_ACCOUNT.authenticated({id:'fixture-owner',email:'owner@example.test'});
    document.getElementById('serviceLabelEn').value='Private old-account draft';
    document.getElementById('accountNewPassword').value='Private fixture password';document.getElementById('accountNewPassword').type='text';`);
  return p;
}

for(const event of ['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED','PASSWORD_RECOVERY'])test(`Identity change: ${event} for another account clears private data without an Auth call`,async()=>{
  const p=await fixture();const generation=p.run('adminSessionVersion');
  assert.equal(p.run(`authCallback(${JSON.stringify(event)},{user:{id:'fixture-other-admin'}})`),undefined,'The SDK callback stays synchronous');
  assert.equal(p.run('authenticatedAdmin'),null);assert(p.run('adminSessionVersion')>generation);
  assert.equal(p.document.getElementById('adminDashboard').classList.contains('visible'),false);
  assert.equal(p.document.getElementById('serviceLabelEn').value,'');
  assert.equal(p.document.getElementById('accountNewPassword').value,'');assert.equal(p.document.getElementById('accountNewPassword').type,'password');
  assert.equal(p.document.getElementById('accountTab').hidden,true);assert.equal(p.document.getElementById('accountIdentity').textContent,'');
  assert.equal(p.run('ownerClears'),1);assert.equal(p.run('identityReads'),1);
  assert.match(p.document.getElementById('adminMessage').textContent,/signed-in account changed/);
});

test('Identity refresh: events for the same account preserve private work and its verified identity',async()=>{
  const p=await fixture();const generation=p.run('adminSessionVersion');
  for(const event of ['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'])p.run(`authCallback(${JSON.stringify(event)},{user:{id:'fixture-owner'}})`);
  assert.equal(p.document.getElementById('serviceLabelEn').value,'Private old-account draft');
  assert.equal(p.run('authenticatedAdmin.id'),'fixture-owner');assert.equal(p.run('adminSessionVersion'),generation);
  assert.equal(p.run('ownerClears'),0);assert.equal(p.run('identityReads'),1);
});

test('Unverified identity: an Auth event alone cannot open the dashboard or grant content access',async()=>{
  const p=await fixture({signedIn:false});
  p.run(`authCallback('SIGNED_IN',{user:{id:'fixture-other-admin'}})`);
  assert.equal(p.run('authenticatedAdmin'),null);assert.equal(p.document.getElementById('adminDashboard').classList.contains('visible'),false);
  assert.equal(p.document.getElementById('accountTab').hidden,true);assert.equal(p.run('identityReads'),1);
});

test('Identity change: a late prior-account verification cannot restore the old dashboard',async()=>{
  const p=await fixture();
  p.run(`let finishIdentity,membershipChecks=0;supabaseClient.auth.getUser=()=>new Promise(resolve=>{finishIdentity=resolve});verifyAdmin=async()=>{membershipChecks++;return true};let restoring=restoreAuthenticatedAdmin();`);
  p.run(`authCallback('SIGNED_IN',{user:{id:'fixture-other-admin'}});finishIdentity({data:{user:{id:'fixture-owner'}},error:null});`);
  await p.run('restoring');
  assert.equal(p.run('authenticatedAdmin'),null);assert.equal(p.run('membershipChecks'),0);
  assert.equal(p.document.getElementById('adminDashboard').classList.contains('visible'),false);assert.equal(p.document.getElementById('serviceLabelEn').value,'');
});

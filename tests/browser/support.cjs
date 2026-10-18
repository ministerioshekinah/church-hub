const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const os = require('node:os');
const {execFileSync} = require('node:child_process');

const sdkURL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/dist/umd/supabase.js';
let sdkPromise;
async function sdk() {
  if (!sdkPromise) sdkPromise = (async () => {
    let body;
    if (process.env.SHEKINAH_TEST_SDK_PATH) body = fs.readFileSync(process.env.SHEKINAH_TEST_SDK_PATH);
    else {
      const response = await fetch(sdkURL, {signal:AbortSignal.timeout(20000)});
      if (!response.ok) throw Error(`Could not fetch pinned test SDK: ${response.status}`);
      body = Buffer.from(await response.arrayBuffer());
    }
    const integrity = 'sha384-' + crypto.createHash('sha384').update(body).digest('base64');
    if (integrity !== 'sha384-OUpie84zd1LdwNlK9uJJQRwab0BLqo3eKYKFh7hSVL58FSk7wPp2l0kfUMIIoaQd') throw Error('Test SDK integrity mismatch');
    return body;
  })();
  return sdkPromise;
}

async function startSite(root = path.resolve(__dirname, '../..')) {
  // Match production HTTPS: engines differ in how the real CSP upgrades
  // loopback requests. An HTTP-only fixture can leave site assets unloaded.
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'shekinah-test-tls-'));
  let tls;
  try {
    const key=path.join(temporary,'key.pem'),cert=path.join(temporary,'cert.pem');
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
    tls={key:fs.readFileSync(key),cert:fs.readFileSync(cert)};
  } finally {fs.rmSync(temporary,{recursive:true,force:true});}
  const server = https.createServer(tls,(req,res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405);res.end();return;}
    let pathname;
    try {pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
    catch {res.writeHead(400);res.end();return;}
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {res.writeHead(403);res.end();return;}
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!pathname.endsWith('/')) {res.writeHead(301,{Location:pathname+'/'+new URL(req.url,'http://localhost').search});res.end();return;}
      file = path.join(file,'index.html');
    }
    let status = 200;
    if (!fs.existsSync(file)) {status=404;file=path.join(root,'404.html');}
    const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
    res.writeHead(status,{'Content-Type':types[path.extname(file)]||'text/plain'});
    res.end(req.method==='HEAD'?undefined:fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:'https://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};
}

function contentFixture() {
  const data = {
    service_settings:[{id:1,day_en:'Sunday',day_es:'Domingo',service_label_en:'Sunday Service',service_label_es:'Servicio Dominical',service_time:'15:00:00',address:'2149 W Washington Blvd, Los Angeles, CA 90018'}],
    announcements:[{id:'test-announcement',active:true,title_en:'Community gathering',title_es:'Reunión comunitaria',description_en:'Everyone is welcome.',description_es:'Todos son bienvenidos.',tag_en:'News',tag_es:'Noticias',sort_order:10}],
    newsletters:Array.from({length:9},(_,i)=>({id:`test-issue-${i}`,issue_date:`2026-10-${String(18-i).padStart(2,'0')}`,status:'published',published_at:'2026-10-18T00:00:00Z',title_en:i===1?'Celebration':`Community issue ${i+1}`,title_es:i===1?'Celebración':`Boletín ${i+1}`,gathering_en:'Sunday worship.',gathering_es:'Adoración del domingo.',scripture_en:'Weekly scripture.',scripture_es:'Escritura semanal.',community_en:'Community news.',community_es:'Noticias de la comunidad.',optional_sections:[]})),
    admin_users:[{user_id:'11111111-1111-4111-8111-111111111111',role:'admin'}]
  };
  for (const table of ['service_settings','announcements','newsletters']) {
    for (const row of data[table]) row.updated_at = '2026-10-18T00:00:00.123456+00:00';
  }
  return data;
}

async function createPage(browser,site,options={}) {
  // This trust exception is only for the ephemeral loopback certificate.
  // All nonlocal browser requests are intercepted below; CSP stays intact.
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:options.viewport||{width:390,height:844},reducedMotion:options.motion?'no-preference':'reduce',colorScheme:options.theme||'light',javaScriptEnabled:options.javascript!==false});
  const state={data:contentFixture(),requests:[],errors:[],failedRequests:[],consoleErrors:[],offline:false,delay:0};
  const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'admin@example.test',app_metadata:{provider:'email'},user_metadata:{}};
  state.data.admin_users[0].role=options.owner?'owner':'admin';
  state.adminDirectory=[{id:user.id,email:user.email,role:options.owner?'owner':'admin'},
    {id:'22222222-2222-4222-8222-222222222222',email:'editor@example.test',role:'admin'}];
  const jwt=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test-signature';
  await context.addInitScript(({options})=>{
    if(options.blockStorage) {
      Storage.prototype.getItem=()=>{throw Error('Storage unavailable')};
      Storage.prototype.setItem=()=>{throw Error('Storage unavailable')};
    } else {
      // Respect changes made by the previous page in this context.
      if(!localStorage.getItem('ministerioLanguage'))localStorage.setItem('ministerioLanguage',options.lang||'en');
      if(!localStorage.getItem('ministerioTheme'))localStorage.setItem('ministerioTheme',options.theme||'light');
      localStorage.setItem('ministerioBackgroundMotion',options.motion?'running':'paused');
    }
    window.__testClipboard=[];window.__testPrints=0;
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{if(options.clipboardDenied)throw Error('Denied');window.__testClipboard.push(value)}}});
    window.print=()=>{window.__testPrints++};
  },{options});
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    state.requests.push({url:req.url(),method:req.method(),body:req.postData()});
    if(url.origin===site.url)return route.continue();
    if(req.url()===sdkURL)return route.fulfill({status:200,contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:await sdk()});
    // Every backend request is fulfilled locally. No church records or accounts
    // are read or changed by this browser suite, even during save/publish tests.
    if(url.hostname==='nhzxlsjwsvyimozubbho.supabase.co') {
      if(state.offline)return route.abort('failed');
      if(state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
      const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'};
      const reply=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
      if(req.method()==='OPTIONS')return reply({});
      if(url.pathname==='/auth/v1/token') {
        if(state.signInError)return reply({code:'invalid_credentials',message:'Invalid login credentials'},400);
        return reply({access_token:jwt,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user});
      }
      if(url.pathname==='/auth/v1/user')return reply(user);
      if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204,headers});
      if(url.pathname==='/functions/v1/admin-users') {
        const action=JSON.parse(req.postData()||'{}');
        if(state.data.admin_users[0]?.role!=='owner')return reply({error:'Owner access is required.'},403);
        if(action.action==='list'&&state.listError)return reply({error:state.listError},500);
        if(action.action==='list')return reply({admins:state.adminDirectory});
        if(state.functionError)return reply({error:state.functionError},500);
        // Only local fixture records change. This handler never sends mail or
        // forwards invitations, role changes, or removals to a real service.
        if(action.action==='invite') {
          const existing=state.adminDirectory.find(row=>row.email===action.email);
          if(existing)return reply({alreadyAuthorized:true,role:existing.role});
          state.adminDirectory.push({id:'33333333-3333-4333-8333-333333333333',email:action.email,role:'admin'});
          return reply({ok:true,invited:true});
        }
        if(action.userId===user.id)return reply({error:'Own access is protected.'},409);
        if(action.action==='set-role') {
          const row=state.adminDirectory.find(row=>row.id===action.userId);
          if(!row)return reply({error:'Administrator not found.'},404);
          row.role=action.role;return reply({ok:true,admin:row});
        }
        if(action.action==='remove') {
          if(!state.suppressRemoval)state.adminDirectory=state.adminDirectory.filter(row=>row.id!==action.userId);
          return reply({ok:true});
        }
        return reply({error:'Unsupported fixture action.'},400);
      }
      if(url.pathname.startsWith('/rest/v1/')) {
        const table=url.pathname.split('/').at(-1);
        let rows=state.data[table]||[];
        const id=url.searchParams.get('id')?.replace(/^eq\./,'');
        const version=url.searchParams.get('updated_at')?.replace(/^eq\./,'');
        const matches=row=>(!id||String(row.id)===id)&&(!version||row.updated_at===version);
        if(['POST','PATCH'].includes(req.method())) {
          const values=JSON.parse(req.postData()||'{}');
          const index=rows.findIndex(row=>row.id===(values.id||Number(id)||id)&&(req.method()!=='PATCH'||matches(row)));
          if(req.method()==='PATCH'&&index<0) {
            if(req.headers().accept?.includes('application/vnd.pgrst.object'))return reply({code:'PGRST116',message:'The selected row no longer exists.'},406);
            return reply([]);
          }
          if(req.method()==='POST'&&!req.headers().prefer?.includes('resolution=merge-duplicates')&&
            (index>=0||(table==='newsletters'&&rows.some(row=>row.issue_date===values.issue_date)))) {
            return reply({code:'23505',message:'Duplicate record.'},409);
          }
          const saved={...(rows[index]||{}),...values,updated_at:new Date(Date.now()+(state.revision=(state.revision||0)+1)).toISOString()};
          if(index<0)rows.push(saved);else rows[index]=saved;
          rows=[saved];
        } else if(req.method()==='DELETE') {
          const removed=rows.filter(matches);
          state.data[table]=rows.filter(row=>!matches(row));rows=removed;
        } else {
          rows=rows.filter(row=>(!id||String(row.id)===id)&&(!url.searchParams.has('active')||row.active)&&(!url.searchParams.has('status')||row.status==='published'));
          if(url.searchParams.has('limit'))rows=rows.slice(0,Number(url.searchParams.get('limit')));
        }
        if(req.headers().accept?.includes('application/vnd.pgrst.object'))return reply(rows[0]||null);
        return reply(rows);
      }
      return reply({message:'Unsupported test request'},400);
    }
    return route.abort();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(30000);
  page.on('pageerror',error=>state.errors.push(error.message));
  page.on('requestfailed',request=>state.failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
  page.on('console',message=>{if(message.type()==='error')state.consoleErrors.push(message.text());});
  page.on('dialog',dialog=>dialog.accept());
  return {page,state,context,close:()=>context.close(),async goto(route='/'){
    await page.goto(site.url+route,{waitUntil:'networkidle'});
    // A no-JavaScript journey must not depend on an evaluated promise (which
    // Firefox cannot settle in that context). Other journeys have a bounded wait.
    if(options.javascript!==false)await page.waitForFunction(()=>document.fonts.status==='loaded');
  }};
}
module.exports={startSite,createPage};

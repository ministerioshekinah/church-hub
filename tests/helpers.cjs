const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { parseHTML } = require('linkedom');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
async function page(name = 'index.html', options = {}) {
  const env = parseHTML(read(name));
  const {document, Element, Event} = env;
  Object.defineProperty(document, 'readyState', {value:'loading', configurable:true});
  const events = document.createElement('window-events');
  const reports = {errors:[], requests:[], animations:[], scrolls:[], focused:null};
  const storage = new Map(Object.entries(options.storage || {}));
  const location = new URL('https://mcshekinah.org/' + name.replace(/index\.html$/, ''));
  const media = new Map();
  const browser = {document, location, innerHeight:800, scrollY:0,
    addEventListener:events.addEventListener.bind(events), dispatchEvent:events.dispatchEvent.bind(events),
    requestAnimationFrame:cb=>setTimeout(cb,0), cancelAnimationFrame:clearTimeout,
    scrollTo:opts=>{reports.scrolls.push(opts);browser.scrollY=opts.top;},
    history:{pushState:(_,__,url)=>{location.href=url;}},
    matchMedia:query=>{
      if(!media.has(query)) { const target=document.createElement('media'); media.set(query,{matches:query.includes('reduced-motion')?Boolean(options.reduced):query.includes('color-scheme')?Boolean(options.dark):false,addEventListener:target.addEventListener.bind(target),dispatchEvent:target.dispatchEvent.bind(target)}); }
      return media.get(query);
    },
  };
  Object.defineProperty(env.HTMLAnchorElement.prototype,'href',{configurable:true,get(){return new URL(this.getAttribute('href'),location).href;}});
  Object.defineProperty(env.HTMLAnchorElement.prototype,'hash',{configurable:true,get(){return new URL(this.href).hash;}});
  Element.prototype.getBoundingClientRect=function(){return {top:200-browser.scrollY,left:0,width:400,height:400};};
  Element.prototype.focus=function(){reports.focused=this.id;};
  Element.prototype.scrollIntoView=function(opts){reports.scrolls.push(opts);};
  Element.prototype.animate=function(frames,opts){reports.animations.push({frames,opts});let cancel;let timer;const finished=new Promise((resolve,reject)=>{timer=setTimeout(resolve,1);cancel=()=>{clearTimeout(timer);reject(new Error('cancelled'));};});finished.catch(()=>{});return {finished,cancel};};
  const localStorage={getItem:k=>{if(options.blockedStorage)throw Error('blocked');return storage.get(k)||null;},setItem:(k,v)=>{if(options.blockedStorage)throw Error('blocked');storage.set(k,v);}};
  const fetch=async url=>{reports.requests.push(url);if(options.unavailable)throw Error('offline');return {ok:true,json:async()=>url.includes('newsletters')?(options.issues||[]):url.includes('service')?[{id:1,service_time:'15:00'}]:(options.announcements||[])};};
  const ctx=vm.createContext({window:browser,document,Element,localStorage,navigator:{clipboard:{writeText:async()=>{}}},fetch,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,console:{error:(...args)=>reports.errors.push(args),info(){}}});
  const run=code=>vm.runInContext(code,ctx);
  if(name==='admin/index.html') run(read('admin.js').replace(/initializeAuth\(\);\s*$/,''));
  else {run(read('theme.js'));run(read('supabase-config.js'));run(read('script.js'));if(name==='newsletter/index.html')run(read('newsletter-extensions.js'));}
  if(options.boot!==false) {document.dispatchEvent(new Event('DOMContentLoaded'));await new Promise(r=>setImmediate(r));}
  return {document,browser,location,reports,storage,media,Event,run};
}
function click(p,element,opts={}) {const event=new p.Event('click',{bubbles:true,cancelable:true});Object.assign(event,{button:0,...opts});element.dispatchEvent(event);return event;}
function safeMarkup(assert,element) {
  assert.equal(element.querySelectorAll('script,img,iframe,object,embed,svg,math,base').length,0);
  for(const el of element.querySelectorAll('*')) for(const attr of el.attributes) {
    assert(!/^on/i.test(attr.name),'no event-handler attributes');
    if(['href','src'].includes(attr.name)) assert(!/^\s*(javascript|data):/i.test(attr.value),'no executable URLs');
  }
}
module.exports={root,read,page,click,safeMarkup};

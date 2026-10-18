const test = require('node:test');
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { page, click, read, safeMarkup } = require('./helpers.cjs');
const settle = () => new Promise(resolve => setImmediate(resolve));
const issues = [
  { id: 'new', issue_date: '2026-10-11', title_en: 'Sunday gathering', title_es: 'Reunión dominical', optional_sections: [{type:'custom', title_en:'A note', body_en:'Everyone is welcome.'}] },
  { id: 'old', issue_date: '2026-10-04', title_en: 'Community', title_es: 'Comunidad' },
  { id: 'older', issue_date: '2026-09-27', title_en: 'Celebration', title_es: 'Celebración' }
];

test('Homepage: real latest issue is linked and translated without refetching', async () => {
  const p = await page('index.html', {issues, reduced:true});
  assert.equal(p.document.getElementById('homepageNewsletterTitle').textContent, issues[0].title_en);
  assert.equal(new URL(p.document.getElementById('homepageNewsletterLink').href).searchParams.get('issue'), 'new');
  const requests = p.reports.requests.length;
  click(p, p.document.querySelector('[data-lang="es"]'));
  assert.equal(p.document.getElementById('homepageNewsletterTitle').textContent, issues[0].title_es);
  assert.match(p.document.getElementById('homepageNewsletterDate').textContent, /octubre/);
  assert.equal(p.reports.requests.length, requests);
});

test('Homepage: no published issue and an outage are different states', async () => {
  const empty = await page();
  assert.match(empty.document.getElementById('homepageNewsletterTitle').textContent, /No published/);
  assert.notEqual(empty.document.getElementById('homepageNewsletterBadge').textContent, 'Latest Issue');
  const offline = await page('index.html', {unavailable:true});
  assert.match(offline.document.getElementById('homepageNewsletterDate').textContent, /Visit the newsletter/);
  assert.equal(offline.document.getElementById('heroServiceTime').textContent, '—');
});

test('Homepage: untrusted preview titles and IDs remain plain text and encoded links', async () => {
  const value = '<img src=x onerror=alert(1)>';
  const p = await page('index.html', {issues:[{...issues[0], id:'"><script>alert(1)</script>', title_en:value}]});
  const title = p.document.getElementById('homepageNewsletterTitle');
  safeMarkup(assert, title);
  assert.equal(title.textContent, value);
  const target = new URL(p.document.getElementById('homepageNewsletterLink').href);
  assert.equal(target.origin, 'https://mcshekinah.org');
  assert.equal(target.searchParams.get('issue'), '"><script>alert(1)</script>');
});

test('Newsletter: archive selection updates badge, heading, and document title', async () => {
  const p = await page('newsletter/index.html', {issues, reduced:true});
  click(p, p.document.querySelector('.archive-item'));
  assert.equal(p.document.querySelector('#latestNewsletter .tag').textContent, 'From the archive');
  assert.equal(p.document.getElementById('newsletterIssueLabel').textContent, 'From the archive');
  assert.equal(p.document.title, 'Community | Shekinah');
  click(p, p.document.querySelector('[data-lang="es"]'));
  assert.equal(p.document.querySelector('#latestNewsletter .tag').textContent, 'Del archivo');
  assert.equal(p.document.title, 'Comunidad | Shekinah');
});

test('Newsletter: archive search ignores accents and searches both languages', async () => {
  const p = await page('newsletter/index.html', {issues});
  const search = p.document.getElementById('archiveSearch');
  search.value = 'celebracion'; search.dispatchEvent(new p.Event('input'));
  assert.equal(p.document.querySelectorAll('.archive-item').length, 1);
  assert.match(p.document.querySelector('.archive-item').textContent, /Celebration/);
  assert.equal(p.document.getElementById('archiveCount').textContent, '1 issue to explore');
  search.value = ''; search.dispatchEvent(new p.Event('input'));
  assert.equal(p.document.querySelectorAll('.archive-item').length, 2);
  assert.equal(p.reports.requests.length, 1);
});

test('Newsletter: a search payload never becomes markup and can be cleared', async () => {
  const p = await page('newsletter/index.html', {issues});
  const search = p.document.getElementById('archiveSearch');
  search.value = '<img src=x onerror=alert(1)>'; search.dispatchEvent(new p.Event('input'));
  const archive = p.document.getElementById('newsletterArchive');
  safeMarkup(assert, archive);
  assert.match(archive.textContent, /No other issues match/);
  search.value = 'community'; search.dispatchEvent(new p.Event('input'));
  assert.equal(p.document.querySelectorAll('.archive-item').length, 1);
});

test('Newsletter: copy link uses the selected issue and excludes unrelated URL parameters', async () => {
  const p = await page('newsletter/index.html', {issues});
  p.location.search = '?issue=old&tracking=discard-me';
  p.run('renderNewsletterPage(cachedNewsletterIssues)');
  click(p, p.document.getElementById('copyNewsletterLink')); await settle();
  assert.equal(p.reports.clipboard[0], 'https://mcshekinah.org/newsletter/?issue=old');
  assert.equal(p.document.getElementById('newsletterToolStatus').textContent, 'Issue link copied.');
});

test('Newsletter: clipboard denial offers a useful fallback and print stays usable', async () => {
  const p = await page('newsletter/index.html', {issues, clipboardDenied:true});
  click(p, p.document.getElementById('copyNewsletterLink')); await settle();
  assert.match(p.document.getElementById('newsletterToolStatus').textContent, /address bar/);
  click(p, p.document.getElementById('printNewsletter'));
  assert.equal(p.reports.prints, 1);
});

test('Newsletter: a missing issue explains the fallback without echoing untrusted input', async () => {
  const p = await page('newsletter/index.html', {issues});
  p.location.search = '?issue=%3Cscript%3Ebad%3C/script%3E';
  p.run('renderNewsletterPage(cachedNewsletterIssues)');
  const notice = p.document.getElementById('newsletterSelectionNotice');
  assert.equal(notice.hidden, false);
  assert.match(notice.textContent, /latest published/);
  assert(!notice.textContent.includes('<script>'));
  assert.equal(p.document.getElementById('latestNewsletter').dataset.issueId, 'new');
});

test('Public loading: errors remain translated after a language switch', async () => {
  const home = await page('index.html', {unavailable:true, reduced:true});
  click(home, home.document.querySelector('[data-lang="es"]'));
  assert.match(home.document.getElementById('announcementList').textContent, /No pudimos/);
  assert.match(home.document.getElementById('specialServiceMessage').textContent, /temporalmente/);
  assert.equal(home.document.getElementById('heroServiceTime').textContent, '—');
  const newsletter = await page('newsletter/index.html', {unavailable:true, reduced:true});
  click(newsletter, newsletter.document.querySelector('[data-lang="es"]'));
  assert.match(newsletter.document.getElementById('latestNewsletter').textContent, /No pudimos/);
  assert.equal(newsletter.document.getElementById('newsletterTools').hidden, true);
});

test('Public loading: retry recovers without stale fallback content', async () => {
  let offline = true;
  const p = await page('newsletter/index.html', {fetch:async()=>{
    if(offline) throw Error('offline');
    return {ok:true, json:async()=>issues};
  }});
  assert.equal(p.document.getElementById('newsletterRetry').hidden, false);
  offline = false;
  click(p, p.document.getElementById('newsletterRetry')); await settle();
  assert.equal(p.document.getElementById('newsletterRetry').hidden, true);
  assert.equal(p.document.getElementById('latestNewsletter').getAttribute('aria-busy'), 'false');
  assert.match(p.document.getElementById('latestNewsletter').textContent, /Everyone is welcome/);
  assert.equal(p.reports.requests.length, 2);
});

test('Public loading: concurrent newsletter retries share the in-flight request', async () => {
  let release;
  const p = await page('newsletter/index.html', {boot:false, fetch:async()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>issues});})});
  p.run('loadNewsletters(); loadNewsletters();');
  assert.equal(p.reports.requests.length, 1);
  release(); await settle();
  assert.match(p.document.getElementById('latestNewsletter').textContent, /Sunday gathering/);
});

test('Service times: malformed values never produce impossible clock times', async () => {
  const p = await page();
  for(const value of ['25:00','12:99','-1:30','abc','1:2','12:00malicious']) {
    assert.equal(p.run(`formatPublicServiceTime(${JSON.stringify(value)})`), '');
  }
  assert.equal(p.run('formatPublicServiceTime("00:00:00")'), '12:00 AM');
  assert.equal(p.run('formatPublicServiceTime("23:59:00")'), '11:59 PM');
});

test('Information: jump links always point to headings in the visible translation', async () => {
  const p = await page('privacy/index.html', {reduced:true});
  for(const lang of ['en','es']) {
    click(p, p.document.querySelector(`[data-lang="${lang}"]`));
    const links = p.document.querySelectorAll('#informationContents a');
    assert(links.length > 3);
    for(const link of links) {
      const heading = p.document.getElementById(link.getAttribute('href').slice(1));
      assert.equal(heading.closest('[data-language-content]').dataset.languageContent, lang);
      assert.equal(heading.textContent, link.textContent);
    }
  }
});

test('Admin: theme works with blocked local storage and keeps password visibility accessible', async () => {
  const p = await page('admin/index.html', {blockedStorage:true});
  click(p, p.document.getElementById('themeToggle'));
  assert.equal(p.document.documentElement.dataset.theme, 'dark');
  const button = p.document.getElementById('passwordToggle');
  click(p, button);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(p.document.getElementById('adminPassword').type, 'text');
  click(p, button);
  assert.equal(button.getAttribute('aria-label'), 'Show password');
});

test('Admin: keyboard tabs maintain one selected tab and its corresponding panel', async () => {
  const p = await page('admin/index.html');
  const first = p.document.querySelector('.admin-content-tab');
  const e = new p.Event('keydown', {bubbles:true,cancelable:true}); e.key='ArrowRight'; first.dispatchEvent(e);
  const selected = p.document.querySelector('[role="tab"][aria-selected="true"]');
  assert.equal(selected.dataset.adminSection, 'announcements');
  assert.equal(p.document.querySelectorAll('[role="tab"][tabindex="0"]').length, 1);
  assert.equal(p.document.getElementById(selected.getAttribute('aria-controls')).classList.contains('active'), true);
  assert.equal(p.reports.focused, selected.id);
});

test('Admin: failed sign-out never claims success or strands a disabled button', async () => {
  const p = await page('admin/index.html');
  p.run('supabaseClient={auth:{signOut:async()=>({error:new Error("offline")})}}; dashboard.classList.add("visible");');
  click(p, p.document.getElementById('signOutButton')); await settle();
  assert.match(p.document.getElementById('dashboardStatus').textContent, /could not be completed/);
  assert.equal(p.document.getElementById('adminDashboard').classList.contains('visible'), true);
  assert.equal(p.document.getElementById('signOutButton').disabled, false);
  assert(!p.document.getElementById('adminMessage').textContent.includes('Signed out securely'));
});

test('Admin: successful sign-out clears and conceals the password', async () => {
  const p = await page('admin/index.html');
  p.run('supabaseClient={auth:{signOut:async()=>({error:null})}}; passwordInput.value="test-only"; passwordInput.type="text";');
  click(p, p.document.getElementById('signOutButton')); await settle();
  assert.equal(p.document.getElementById('adminPassword').value, '');
  assert.equal(p.document.getElementById('adminPassword').type, 'password');
  assert.equal(p.document.getElementById('adminDashboard').classList.contains('visible'), false);
  assert.equal(p.reports.focused, 'adminEmail');
});

test('CSP: pages use local original fonts, no inline styles or handlers, and no nested frames', () => {
  for(const file of ['index.html','newsletter/index.html','admin/index.html','privacy/index.html','terms/index.html','contact/index.html','404.html']) {
    const {document} = parseHTML(read(file));
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
    assert.match(csp, /style-src 'self';/);
    assert.match(csp, /font-src 'self';/);
    assert(!csp.includes("'unsafe-inline'"));
    assert.match(csp, /frame-src 'none';/);
    assert.match(csp, /script-src-attr 'none';/);
    assert.equal(document.querySelectorAll('style,[style]').length, 0);
    assert(document.querySelector('link[rel="stylesheet"][href^="/assets/fonts/fonts.css"]'));
    assert.equal(document.querySelectorAll('link[href^="https://fonts."]').length, 0);
  }
  assert(!read('administrators.js').includes('createElement("style")'));
});

test('CSP: no-script policy translations and owner styles are external resources', () => {
  assert.match(read('privacy/index.html'), /<noscript><link rel="stylesheet" href="\/no-script.css/);
  assert.match(read('no-script.css'), /\.information-content\[hidden\]/);
  assert.match(read('admin/index.html'), /href="\/administrators.css/);
  assert.match(read('administrators.css'), /\.owner-only-tab\[hidden\]/);
});

test('Archive: large collections progressively reveal issues without network requests', async () => {
  const many = Array.from({length:20}, (_,i)=>({...issues[0],id:`issue-${i}`,title_en:`Issue ${i}`}));
  const p = await page('newsletter/index.html', {issues:many});
  assert.equal(p.document.querySelectorAll('.archive-item').length, 6);
  assert.equal(p.document.getElementById('showMoreIssues').hidden, false);
  click(p,p.document.getElementById('showMoreIssues'));
  assert.equal(p.document.querySelectorAll('.archive-item').length, 12);
  assert.equal(p.reports.requests.length, 1);
});

test('404: recovery is bilingual, local, and independent of the content backend', async () => {
  const p = await page('404.html', {unavailable:true,reduced:true});
  click(p,p.document.querySelector('[data-lang="es"]'));
  assert.equal(p.document.querySelector('h1').textContent,'Volvamos al inicio.');
  assert.equal(p.document.querySelector('meta[name="robots"]').content,'noindex');
  assert.equal(p.reports.requests.length,0);
  assert.equal(new URL(p.document.querySelector('.not-found-card .button').href).pathname,'/');
});

test('Public loading: a successful cache cannot reappear after a later failed refresh', async () => {
  let offline=false;
  const p=await page('newsletter/index.html',{reduced:true,fetch:async()=>{
    if(offline)throw Error('offline');return {ok:true,json:async()=>issues};
  }});
  offline=true;
  await p.run('loadNewsletters()');
  click(p,p.document.querySelector('[data-lang="es"]'));
  assert.match(p.document.getElementById('latestNewsletter').textContent,/No pudimos/);
  assert.equal(p.document.getElementById('newsletterTools').hidden,true);
  assert.equal(p.document.getElementById('showMoreIssues').hidden,true);
});

test('Public loading: malformed API response fails closed with a recovery control', async () => {
  const p=await page('newsletter/index.html',{fetch:async()=>({ok:true,json:async()=>({error:'unexpected'})})});
  assert.match(p.document.getElementById('latestNewsletter').textContent,/could not load/);
  assert.equal(p.document.getElementById('newsletterRetry').hidden,false);
});

test('Archive: revealing the final items moves keyboard focus into the new content', async () => {
  const many=Array.from({length:8},(_,i)=>({...issues[0],id:'issue-'+i}));
  const p=await page('newsletter/index.html',{issues:many});
  p.run('Element.prototype.focus=function(options){window.archiveFocus=this;window.archiveFocusOptions=options;}');
  click(p,p.document.getElementById('showMoreIssues'));
  assert.equal(p.document.getElementById('showMoreIssues').hidden,true);
  assert.equal(p.browser.archiveFocus,p.document.querySelectorAll('.archive-item')[6]);
  assert.equal(p.browser.archiveFocusOptions.preventScroll,true);
  assert.equal(p.reports.scrolls.length,0);
});

test('Admin: content language buttons announce their selected state independently', async () => {
  const p=await page('admin/index.html');
  const announcementSpanish=p.document.querySelector('[data-announcement-lang="es"]');
  const newsletterSpanish=p.document.querySelector('[data-editor-lang="es"]');
  click(p,announcementSpanish);
  assert.equal(announcementSpanish.getAttribute('aria-pressed'),'true');
  assert.equal(newsletterSpanish.getAttribute('aria-pressed'),'false');
  click(p,newsletterSpanish);
  assert.equal(newsletterSpanish.getAttribute('aria-pressed'),'true');
  for(const group of p.document.querySelectorAll('.editor-language-tabs')) {
    assert.equal(group.getAttribute('role'),'group');
    assert.equal(group.querySelectorAll('[aria-pressed="true"]').length,1);
  }
});

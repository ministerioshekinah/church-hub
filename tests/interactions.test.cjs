const test=require('node:test');
const assert=require('node:assert/strict');
const {page,click,read}=require('./helpers.cjs');
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
test('Theme: first visit follows system dark appearance',async()=>{const p=await page('index.html',{dark:true});assert.equal(p.document.documentElement.dataset.theme,'dark');assert.equal(p.document.getElementById('themeToggle').getAttribute('aria-checked'),'true');});
test('Theme: saved preference overrides system appearance',async()=>{const p=await page('index.html',{dark:true,storage:{ministerioTheme:'light'}});assert.equal(p.document.documentElement.dataset.theme,'light');});
test('Theme: switch persists dark then light with accessible state',async()=>{const p=await page();const button=p.document.getElementById('themeToggle');click(p,button);assert.equal(p.storage.get('ministerioTheme'),'dark');assert.equal(button.getAttribute('aria-checked'),'true');click(p,button);assert.equal(p.storage.get('ministerioTheme'),'light');assert.equal(button.getAttribute('aria-checked'),'false');});
test('Theme: blocked browser storage leaves both switches functional',async()=>{const p=await page('index.html',{blockedStorage:true,reduced:true});click(p,p.document.getElementById('themeToggle'));click(p,p.document.querySelector('[data-lang="es"]'));assert.equal(p.document.documentElement.dataset.theme,'dark');assert.equal(p.document.documentElement.lang,'es');assert.equal(p.reports.errors.length,0);});
test('Theme: newsletter includes the same theme control',async()=>{const p=await page('newsletter/index.html');click(p,p.document.getElementById('themeToggle'));assert.equal(p.document.documentElement.dataset.theme,'dark');assert.equal(p.document.querySelector('meta[name="theme-color"]').content,'#121912');});
test('Language: English to Spanish uses a short fade without moving the reading surface',async()=>{const p=await page();click(p,p.document.querySelector('[data-lang="es"]'));await settle();assert.equal(p.document.documentElement.lang,'es');assert.equal(p.reports.animations.length,2);assert(p.reports.animations.every(animation=>animation.frames.every(frame=>!('transform' in frame))));assert.equal(p.document.getElementById('themeToggle').getAttribute('aria-label'),'Modo oscuro');});
test('Language: Spanish to English also animates',async()=>{const p=await page('index.html',{storage:{ministerioLanguage:'es'}});click(p,p.document.querySelector('[data-lang="en"]'));await settle();assert.equal(p.document.documentElement.lang,'en');assert.equal(p.reports.animations.length,2);});
test('Language: rapid changes always end on the latest choice',async()=>{const p=await page();click(p,p.document.querySelector('[data-lang="es"]'));click(p,p.document.querySelector('[data-lang="en"]'));click(p,p.document.querySelector('[data-lang="es"]'));await settle();assert.equal(p.document.documentElement.lang,'es');assert.equal(p.storage.get('ministerioLanguage'),'es');assert.equal(p.document.querySelector('[data-lang="es"]').getAttribute('aria-pressed'),'true');});
test('Language: reduced motion changes immediately without animation',async()=>{const p=await page('index.html',{reduced:true});click(p,p.document.querySelector('[data-lang="es"]'));assert.equal(p.document.documentElement.lang,'es');assert.equal(p.reports.animations.length,0);});
test('Language: no animation API still permits switching',async()=>{const p=await page();p.document.getElementById('main-content').animate=undefined;click(p,p.document.querySelector('[data-lang="es"]'));assert.equal(p.document.documentElement.lang,'es');});
test('Navigation: Escape closes mobile menu and restores focus',async()=>{const p=await page();click(p,p.document.getElementById('menuButton'));assert.equal(p.document.getElementById('menuButton').getAttribute('aria-expanded'),'true');const e=new p.Event('keydown');e.key='Escape';p.document.dispatchEvent(e);assert.equal(p.document.getElementById('menuButton').getAttribute('aria-expanded'),'false');assert.equal(p.reports.focused,'menuButton');});
const issues=[{id:'new',issue_date:'2026-10-10',title_en:'Newest',title_es:'Nuevo',optional_sections:[{type:'custom',title_en:'Extra',body_en:'Welcome',body_es:'Bienvenidos'}]},{id:'old',issue_date:'2026-10-03',title_en:'Older',title_es:'Anterior'}];
test('Newsletter: one initial request includes optional sections',async()=>{const p=await page('newsletter/index.html',{issues});assert.equal(p.reports.requests.length,1);assert(p.document.getElementById('latestNewsletter').textContent.includes('Welcome'));assert.equal(p.document.querySelectorAll('link[href^="/newsletter-extensions.css"]').length,1);});
test('Newsletter: selection and back navigation use cache without scroll jump',async()=>{const p=await page('newsletter/index.html',{issues});click(p,p.document.querySelector('.archive-item'));assert.equal(p.location.search,'?issue=old');assert.equal(p.reports.scrolls.length,0);assert(p.document.getElementById('latestNewsletter').textContent.includes('Older'));p.location.search='';p.browser.dispatchEvent(new p.Event('popstate'));assert(p.document.getElementById('latestNewsletter').textContent.includes('Newest'));assert.equal(p.reports.requests.length,1);});
test('Newsletter: Ctrl-click retains normal link behavior',async()=>{const p=await page('newsletter/index.html',{issues});const event=click(p,p.document.querySelector('.archive-item'),{ctrlKey:true});assert.equal(event.defaultPrevented,false);assert.equal(p.location.search,'');});
test('Newsletter: language changes translate optional sections without refetch',async()=>{const p=await page('newsletter/index.html',{issues,reduced:true});click(p,p.document.querySelector('[data-lang="es"]'));assert(p.document.getElementById('latestNewsletter').textContent.includes('Bienvenidos'));assert.equal(p.reports.requests.length,1);});

for (const slug of ['privacy', 'terms', 'contact']) {
  test(`Information: ${slug} restores preferences and switches the complete document in both directions`, async () => {
    const p = await page(`${slug}/index.html`, {storage:{ministerioLanguage:'es', ministerioTheme:'dark'}, unavailable:true});
    const en = p.document.querySelector('[data-language-content="en"]');
    const es = p.document.querySelector('[data-language-content="es"]');
    assert.equal(en.hidden, true);
    assert.equal(es.hidden, false);
    assert.equal(p.document.documentElement.dataset.theme, 'dark');
    assert.equal(p.document.querySelector('.footer-policy-links a').textContent, 'Política de privacidad');
    const spanishTitle = p.document.title;
    click(p, p.document.querySelector('[data-lang="en"]'));
    await settle();
    assert.equal(en.hidden, false);
    assert.equal(es.hidden, true);
    assert.notEqual(p.document.title, spanishTitle);
    assert.equal(p.reports.animations.length, 2);
    click(p, p.document.querySelector('[data-lang="es"]'));
    await settle();
    assert.equal(en.hidden, true);
    assert.equal(es.hidden, false);
    assert.equal(p.document.title, spanishTitle);
    assert.equal(p.reports.animations.length, 4);
    click(p, p.document.querySelector('[data-theme-toggle]'));
    assert.equal(p.storage.get('ministerioTheme'), 'light');
    assert.equal(p.reports.requests.length, 0, 'information stays available without the content backend');
    assert.equal(p.reports.errors.length, 0);
  });
}

test('Information: blocked storage and reduced motion keep help available in either language', async () => {
  const p = await page('contact/index.html', {blockedStorage:true, reduced:true, unavailable:true});
  click(p, p.document.querySelector('[data-lang="es"]'));
  assert.equal(p.document.querySelector('[data-language-content="es"]').hidden, false);
  assert.equal(p.document.querySelector('[data-language-content="en"]').hidden, true);
  assert.equal(p.reports.animations.length, 0);
  assert.equal(p.reports.requests.length, 0);
  assert.equal(p.reports.errors.length, 0);
});

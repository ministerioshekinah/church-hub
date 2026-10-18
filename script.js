window.SHEKINAH_PUBLIC_READY = true;

const translations = {
  en: {
    skip_to_content: "Skip to main content",
    language_selector: "Language selector",
    primary_navigation: "Primary navigation",
    open_navigation: "Open navigation",
    close_navigation: "Close navigation",
    back_to_top: "Back to top",
    background_motion: "Background motion",
    pause_background: "Pause background animation",
    resume_background: "Resume background animation",
    reduced_background: "Background animation is off to respect your device’s display preferences",
    footer_information: "Website information and help",
    privacy_policy: "Privacy Policy",
    terms_of_use: "Terms of Use",
    contact_accessibility: "Contact & Accessibility",
    information_eyebrow: "Information & support",
    privacy_title: "Your privacy matters.",
    privacy_intro: "How this website handles information, the services it uses, and the choices available to you.",
    privacy_document_title: "Privacy Policy | Ministerio Cristiano Shekinah",
    terms_title: "Using our website.",
    terms_intro: "A few clear guidelines for reading, sharing, and using our church website.",
    terms_document_title: "Terms of Use | Ministerio Cristiano Shekinah",
    contact_title: "We’re here to help.",
    contact_intro: "Questions about the church, your privacy, or accessing this website? Here’s how to reach us and get help.",
    contact_document_title: "Contact & Accessibility | Ministerio Cristiano Shekinah",
    information_updated: "Last updated: October 10, 2026",
    privacy_updated: "Last updated: October 18, 2026",
    get_directions: "Get directions ↗",
    copy_address: "Copy address",
    address_copied: "Address copied. See you soon!",
    copy_unavailable: "Select the address above to copy it.",
    newsletter_empty_title: "No published newsletter yet",
    newsletter_empty_copy: "Check back for the next Ministerio Cristiano Shekinah update.",
    retry: "Try again",
    loading: "Loading…",
    archived_issue: "From the archive",
    browse_issues: "Browse issues",
    search_issues: "Search issues",
    no_matching_issues: "No other issues match your search.",
    no_other_issues: "You’re reading the only published issue. More updates will appear here.",
    issue_count: "issues to explore",
    issue_count_singular: "issue to explore",
    show_more_issues: "Show more issues",
    showing_issues: "Showing {shown} of {total} issues",
    copy_issue_link: "Copy issue link",
    link_copied: "Issue link copied.",
    copy_link_unavailable: "Copy the link from your browser’s address bar.",
    print_issue: "Print newsletter",
    newsletter_tools: "Newsletter tools",
    on_this_page: "On this page",
    back_home: "Back to home",
    not_found_document_title: "Page not found | Ministerio Cristiano Shekinah",
    not_found_label: "Page not found",
    not_found_title: "Let’s get you home.",
    not_found_copy: "This page may have moved, or the link may be incomplete. You can find service information and church updates below.",
    home_location: "A church community in Los Angeles",
    announcement_empty_copy: "You’re all caught up. Come back here for the next church update.",
    newsletter_preview_unavailable: "Visit the newsletter to browse published church updates.",
    missing_issue: "That issue isn’t available. Here is the latest published newsletter.",
    nav_home: "Home",
    nav_services: "Services",
    nav_newsletter: "Newsletter",
    nav_announcements: "Announcements",
    nav_visit: "Visit",
    hero_title: "A place to worship, grow, and belong.",
    hero_copy: "Stay connected with Ministerio Cristiano Shekinah through service information, church announcements, and our community newsletter.",
    plan_visit: "Plan a Visit",
    read_newsletter: "Read Newsletter",
    sunday_service: "Sunday Service",
    join_us: "Join Us",
    everyone_welcome: "Everyone is welcome",
    worship_with_us: "Worship with us",
    service_time: "Service Time",
    stay_connected: "Stay connected",
    church_newsletter: "Church Newsletter",
    newsletter_preview_copy: "Read the latest church update and browse previous newsletter issues.",
    latest_issue: "Latest Issue",
    this_week_at: "This Week at Ministerio Cristiano Shekinah",
    newsletter_preview_details: "Sunday service, scripture, announcements, and community updates in one place.",
    open_newsletter: "Open Newsletter →",
    church_updates: "Church updates",
    announcements: "Announcements",
    loading_announcements: "Loading announcements…",
    no_announcements: "No announcements right now.",
    come_worship: "Come worship with us",
    visit_ministerio: "Visit Ministerio Cristiano Shekinah",
    sunday: "Sunday",
    service_begins: "Service begins at",
    welcome_message: "We look forward to welcoming you.",
    service_error: "Service information is temporarily unavailable.",
    newsletter_page_intro: "Read the latest issue and browse previous updates from Ministerio Cristiano Shekinah.",
    previous_issues: "Previous Issues",
    loading_newsletter: "Loading newsletter…",
    loading_archive: "Loading archive…",
    newsletter_error: "We could not load the newsletter right now.",
    announcement_error: "We could not load announcements right now."
  },
  es: {
    skip_to_content: "Saltar al contenido principal",
    language_selector: "Selector de idioma",
    primary_navigation: "Navegación principal",
    open_navigation: "Abrir navegación",
    close_navigation: "Cerrar navegación",
    back_to_top: "Volver arriba",
    background_motion: "Movimiento del fondo",
    pause_background: "Pausar la animación del fondo",
    resume_background: "Reanudar la animación del fondo",
    reduced_background: "La animación del fondo está desactivada para respetar las preferencias de pantalla de tu dispositivo",
    footer_information: "Información y ayuda del sitio web",
    privacy_policy: "Política de privacidad",
    terms_of_use: "Términos de uso",
    contact_accessibility: "Contacto y accesibilidad",
    information_eyebrow: "Información y apoyo",
    privacy_title: "Tu privacidad importa.",
    privacy_intro: "Cómo maneja la información este sitio web, qué servicios utiliza y qué opciones tienes.",
    privacy_document_title: "Política de privacidad | Ministerio Cristiano Shekinah",
    terms_title: "Uso de nuestro sitio web.",
    terms_intro: "Algunas pautas claras para leer, compartir y usar el sitio web de nuestra iglesia.",
    terms_document_title: "Términos de uso | Ministerio Cristiano Shekinah",
    contact_title: "Estamos para ayudarte.",
    contact_intro: "¿Tienes preguntas sobre la iglesia, tu privacidad o cómo acceder a este sitio? Aquí encontrarás cómo comunicarte con nosotros y recibir ayuda.",
    contact_document_title: "Contacto y accesibilidad | Ministerio Cristiano Shekinah",
    information_updated: "Última actualización: 10 de octubre de 2026",
    privacy_updated: "Última actualización: 18 de octubre de 2026",
    get_directions: "Cómo llegar ↗",
    copy_address: "Copiar dirección",
    address_copied: "Dirección copiada. ¡Nos vemos pronto!",
    copy_unavailable: "Selecciona la dirección de arriba para copiarla.",
    newsletter_empty_title: "Aún no hay un boletín publicado",
    newsletter_empty_copy: "Vuelve pronto para la próxima actualización de Ministerio Cristiano Shekinah.",
    retry: "Intentar de nuevo",
    loading: "Cargando…",
    archived_issue: "Del archivo",
    browse_issues: "Explora los boletines",
    search_issues: "Buscar boletines",
    no_matching_issues: "No hay otros boletines que coincidan con tu búsqueda.",
    no_other_issues: "Estás leyendo el único boletín publicado. Aquí aparecerán las próximas novedades.",
    issue_count: "boletines para explorar",
    issue_count_singular: "boletín para explorar",
    show_more_issues: "Ver más boletines",
    showing_issues: "Mostrando {shown} de {total} boletines",
    copy_issue_link: "Copiar enlace",
    link_copied: "Enlace del boletín copiado.",
    copy_link_unavailable: "Copia el enlace desde la barra de direcciones de tu navegador.",
    print_issue: "Imprimir boletín",
    newsletter_tools: "Herramientas del boletín",
    on_this_page: "En esta página",
    back_home: "Volver al inicio",
    not_found_document_title: "Página no encontrada | Ministerio Cristiano Shekinah",
    not_found_label: "Página no encontrada",
    not_found_title: "Volvamos al inicio.",
    not_found_copy: "Esta página puede haberse movido o el enlace puede estar incompleto. Encuentra la información de los servicios y las novedades de la iglesia a continuación.",
    home_location: "Una comunidad de fe en Los Ángeles",
    announcement_empty_copy: "Estás al día. Vuelve aquí para la próxima actualización de la iglesia.",
    newsletter_preview_unavailable: "Visita el boletín para consultar las novedades publicadas de la iglesia.",
    missing_issue: "Ese boletín no está disponible. Aquí está el boletín publicado más reciente.",
    nav_home: "Inicio",
    nav_services: "Servicios",
    nav_newsletter: "Boletín",
    nav_announcements: "Anuncios",
    nav_visit: "Visítanos",
    hero_title: "Un lugar para adorar, crecer y pertenecer.",
    hero_copy: "Mantente conectado con Ministerio Cristiano Shekinah por medio de la información de servicios, anuncios de la iglesia y nuestro boletín comunitario.",
    plan_visit: "Planifica tu Visita",
    read_newsletter: "Leer el Boletín",
    sunday_service: "Servicio Dominical",
    join_us: "Acompáñanos",
    everyone_welcome: "Todos son bienvenidos",
    worship_with_us: "Adora con nosotros",
    service_time: "Horario del Servicio",
    stay_connected: "Mantente conectado",
    church_newsletter: "Boletín de la Iglesia",
    newsletter_preview_copy: "Lee la actualización más reciente de la iglesia y consulta boletines anteriores.",
    latest_issue: "Boletín más reciente",
    this_week_at: "Esta Semana en Ministerio Cristiano Shekinah",
    newsletter_preview_details: "Servicio dominical, escritura, anuncios y actualizaciones de la comunidad en un solo lugar.",
    open_newsletter: "Abrir Boletín →",
    church_updates: "Actualizaciones de la iglesia",
    announcements: "Anuncios",
    loading_announcements: "Cargando anuncios…",
    no_announcements: "No hay anuncios en este momento.",
    come_worship: "Ven a adorar con nosotros",
    visit_ministerio: "Visita Ministerio Cristiano Shekinah",
    sunday: "Domingo",
    service_begins: "El servicio comienza a las",
    welcome_message: "Esperamos darte la bienvenida.",
    service_error: "La información del servicio no está disponible temporalmente.",
    newsletter_page_intro: "Lee el boletín más reciente y consulta actualizaciones anteriores de Ministerio Cristiano Shekinah.",
    previous_issues: "Boletines Anteriores",
    loading_newsletter: "Cargando boletín…",
    loading_archive: "Cargando archivo…",
    newsletter_error: "No pudimos cargar el boletín en este momento.",
    announcement_error: "No pudimos cargar los anuncios en este momento."
  }
};

// Private browsing and blocked storage must not prevent the page from loading.
let storedLanguage = null;
try { storedLanguage = localStorage.getItem("ministerioLanguage"); } catch { /* Use English. */ }
let currentLanguage = storedLanguage === "es" ? "es" : "en";

let cachedService = null;
let cachedAnnouncements = null;
let cachedNewsletterIssues = null;
let cachedHomepageIssue = null;
let archiveVisibleLimit = 6;
let previousArchiveQuery = "";
const publicLoadState = { service: "idle", announcements: "idle", newsletters: "idle", preview: "idle" };

function publicConfigReady() {
  const cfg = window.SHEKINAH_SUPABASE;
  return Boolean(
    cfg?.url &&
    cfg?.publishableKey &&
    !cfg.url.includes("PASTE_") &&
    !cfg.publishableKey.includes("PASTE_")
  );
}

async function publicSupabaseRequest(path, query = "") {
  if (!publicConfigReady()) {
    throw new Error("Supabase public configuration is unavailable.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `${window.SHEKINAH_SUPABASE.url}/rest/v1/${path}${query}`,
      {
        headers: {
          apikey: window.SHEKINAH_SUPABASE.publishableKey,
          Accept: "application/json"
        },
        signal: controller.signal,
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase request failed with ${response.status}.`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("The public content response was not a list.");
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function applyLanguage(language) {
  const safeLanguage = language === "es" ? "es" : "en";
  currentLanguage = safeLanguage;
  try { localStorage.setItem("ministerioLanguage", safeLanguage); } catch { /* Keep this session's selection. */ }
  document.documentElement.lang = safeLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const translated = translations[safeLanguage]?.[key];
    if (translated) element.textContent = translated;
  });

  // Keep complete policy text and its links available without HTML injection.
  document.querySelectorAll("[data-language-content]").forEach((element) => {
    element.hidden = element.dataset.languageContent !== safeLanguage;
  });

  document.querySelectorAll(".lang-button").forEach((button) => {
    const active = button.dataset.lang === safeLanguage;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const label = translations[safeLanguage][element.getAttribute("data-i18n-aria-label")];
    if (label) element.setAttribute("aria-label", label);
  });
  updateMenuLabel();
  window.SHEKINAH_THEME?.updateLabel();
  window.SHEKINAH_AMBIENT?.updateLabel();
  const copyStatus = document.getElementById("copyStatus");
  if (copyStatus) copyStatus.textContent = "";

  if (cachedService) renderServiceSettings(cachedService);
  if (cachedAnnouncements) renderAnnouncements(cachedAnnouncements);
  if (publicLoadState.service === "error") renderServiceUnavailable();
  if (publicLoadState.announcements === "error") renderAnnouncementError();
  if (publicLoadState.newsletters === "error") renderNewsletterError();
  renderHomepageNewsletter();
  renderInformationContents();

  if (cachedNewsletterIssues && document.body.dataset.page === "newsletter") {
    renderNewsletterPage(cachedNewsletterIssues);
  }
}

let languageChange = 0;
let pendingLanguage = currentLanguage;
let languageAnimation = null;
async function changeLanguage(language) {
  const next = language === "es" ? "es" : "en";
  if (next === pendingLanguage) return;
  pendingLanguage = next;
  const change = ++languageChange;
  languageAnimation?.cancel();
  const content = document.getElementById("main-content");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!content?.animate || reduced) { applyLanguage(next); return; }
  try {
    languageAnimation = content.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100, fill: "forwards" });
    await languageAnimation.finished;
    if (change !== languageChange) return;
    applyLanguage(next);
    languageAnimation.cancel();
    languageAnimation = content.animate(
      [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
    await languageAnimation.finished;
  } catch { /* A newer choice cancels the previous transition. */ }
  finally {
    if (change === languageChange) { languageAnimation?.cancel(); languageAnimation = null; if (currentLanguage !== pendingLanguage) applyLanguage(pendingLanguage); }
  }
}
document.querySelectorAll(".lang-button").forEach((button) => {
  button.addEventListener("click", () => changeLanguage(button.dataset.lang));
});
window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (event) => {
  if (event.matches) { ++languageChange; languageAnimation?.cancel(); languageAnimation = null; applyLanguage(pendingLanguage); }
});

const menuButton = document.getElementById("menuButton");
const navMenu = document.getElementById("navMenu");

function updateMenuLabel() {
  if (!menuButton) return;
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-label", translations[currentLanguage][open ? "close_navigation" : "open_navigation"]);
}

function closeMenu(returnFocus = false) {
  if (!navMenu || !menuButton) return;
  navMenu.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  updateMenuLabel();
  if (returnFocus) menuButton.focus();
}

if (menuButton && navMenu) {
  menuButton.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    updateMenuLabel();
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
      const href = link.getAttribute("href");
      if (href?.startsWith("#")) {
        const target = document.getElementById(href.slice(1));
        if (target) {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navMenu.classList.contains("open")) closeMenu(true);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  document.addEventListener("focusin", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  window.matchMedia("(min-width: 1101px)").addEventListener("change", () => closeMenu());
}

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// ------------------------------------------------------------
// Service settings
// Production fails closed rather than resurrecting stale JSON.
// Static JSON is used only when Supabase has not been configured.
// ------------------------------------------------------------
async function loadServiceSettings() {
  if (document.body.dataset.page !== "home") return;
  if (publicLoadState.service === "loading") return;
  publicLoadState.service = "loading";
  setPublicBusy("serviceRetry", true);

  try {
    if (publicConfigReady()) {
      const rows = await publicSupabaseRequest(
        "service_settings",
        "?select=id,day_en,day_es,service_label_en,service_label_es,service_time,time_display,special_message_en,special_message_es,address&id=eq.1&limit=1"
      );

      if (!rows?.[0]) throw new Error("The service settings row is missing.");
      cachedService = rows[0];
    } else {
      const response = await fetch("/service.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Static service fallback failed.");
      cachedService = await response.json();
    }

    publicLoadState.service = "ready";
    renderServiceSettings(cachedService);
  } catch (error) {
    console.error("Unable to load service settings:", error);
    cachedService = null;
    publicLoadState.service = "error";
    renderServiceUnavailable();
  } finally {
    setPublicBusy("serviceRetry", false);
  }
}

function formatPublicServiceTime(timeValue) {
  if (!timeValue) return "";

  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(String(timeValue))) return "";
  const normalized = String(timeValue).slice(0, 5);
  const [hoursString, minutesString] = normalized.split(":");
  const hours24 = Number(hoursString);
  const minutes = Number(minutesString || "0");

  if (Number.isNaN(hours24) || Number.isNaN(minutes)) return "";

  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function renderServiceSettings(service) {
  const retry = document.getElementById("serviceRetry");
  if (retry) retry.hidden = true;
  const isSpanish = currentLanguage === "es";
  const serviceLabel =
    service[isSpanish ? "service_label_es" : "service_label_en"] ||
    (isSpanish ? "Servicio Dominical" : "Sunday Service");
  const day =
    service[isSpanish ? "day_es" : "day_en"] ||
    (isSpanish ? "Domingo" : "Sunday");
  const specialMessage =
    service[isSpanish ? "special_message_es" : "special_message_en"];

  const displayTime =
    formatPublicServiceTime(service.service_time) ||
    service.time_display ||
    "—";

  const heroLabel = document.getElementById("heroServiceLabel");
  const heroTime = document.getElementById("heroServiceTime");
  const sectionLabel = document.getElementById("serviceSectionLabel");
  const sectionTime = document.getElementById("serviceSectionTime");
  const visitDay = document.getElementById("visitServiceDay");
  const visitTime = document.getElementById("visitServiceTime");
  const message = document.getElementById("specialServiceMessage");

  if (heroLabel) heroLabel.textContent = serviceLabel;
  if (heroTime) heroTime.textContent = displayTime;
  if (sectionLabel) sectionLabel.textContent = serviceLabel;
  if (sectionTime) sectionTime.textContent = displayTime;
  if (visitDay) visitDay.textContent = day;
  if (visitTime) visitTime.textContent = displayTime;

  if (message) {
    message.textContent =
      specialMessage || translations[currentLanguage].welcome_message;
  }
}

function renderServiceUnavailable() {
  const retry = document.getElementById("serviceRetry");
  if (retry) retry.hidden = false;
  ["heroServiceTime", "serviceSectionTime", "visitServiceTime"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = "—";
  });

  const message = document.getElementById("specialServiceMessage");
  if (message) message.textContent = translations[currentLanguage].service_error;
}

// ------------------------------------------------------------
// Announcements
// Fetch only public fields, cache them for language changes, and fail closed on
// production backend errors so hidden/deleted static content cannot reappear.
// ------------------------------------------------------------
async function loadAnnouncements() {
  const list = document.getElementById("announcementList");
  if (!list) return;
  if (publicLoadState.announcements === "loading") return;
  publicLoadState.announcements = "loading";
  list.setAttribute("aria-busy", "true");
  setPublicBusy("announcementsRetry", true);

  try {
    if (publicConfigReady()) {
      cachedAnnouncements = await publicSupabaseRequest(
        "announcements",
        "?select=id,tag_en,tag_es,title_en,title_es,description_en,description_es,sort_order&active=eq.true&order=sort_order.asc&limit=20"
      );
    } else {
      const response = await fetch("/announcements.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Static announcement fallback failed.");
      const rows = await response.json();
      cachedAnnouncements = rows.filter((item) => item.active !== false);
    }

    publicLoadState.announcements = "ready";
    renderAnnouncements(cachedAnnouncements || []);
  } catch (error) {
    console.error("Unable to load announcements:", error);
    cachedAnnouncements = null;
    publicLoadState.announcements = "error";
    renderAnnouncementError();
  } finally {
    list.setAttribute("aria-busy", "false");
    setPublicBusy("announcementsRetry", false);
  }
}

function setPublicBusy(id, busy) {
  const button = document.getElementById(id);
  if (!button) return;
  button.disabled = busy;
  button.textContent = translations[currentLanguage][busy ? "loading" : "retry"];
}

function renderAnnouncementError() {
  const list = document.getElementById("announcementList");
  if (list) list.innerHTML = `<article class="announcement-card public-empty"><p>${escapeHtml(translations[currentLanguage].announcement_error)}</p></article>`;
  const retry = document.getElementById("announcementsRetry");
  if (retry) retry.hidden = false;
}

function renderAnnouncements(announcements) {
  const list = document.getElementById("announcementList");
  if (!list) return;
  const retry = document.getElementById("announcementsRetry");
  if (retry) retry.hidden = true;

  if (!announcements.length) {
    list.innerHTML =
      `<article class="announcement-card public-empty"><span class="empty-mark" aria-hidden="true">✓</span><h3>${escapeHtml(translations[currentLanguage].no_announcements)}</h3><p>${escapeHtml(translations[currentLanguage].announcement_empty_copy)}</p></article>`;
    return;
  }

  list.innerHTML = announcements
    .map((announcement) => {
      const title =
        announcement[`title_${currentLanguage}`] || announcement.title_en;
      const description =
        announcement[`description_${currentLanguage}`] ||
        announcement.description_en;
      const tag =
        announcement[`tag_${currentLanguage}`] || announcement.tag_en;

      return `
        <article class="announcement-card">
          ${tag ? `<span class="tag">${escapeHtml(tag)}</span>` : ""}
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </article>
      `;
    })
    .join("");
}

// ------------------------------------------------------------
// Newsletter
// Production fails closed rather than reverting to repository JSON after an
// outage. Static JSON remains only for unconfigured/local development.
// ------------------------------------------------------------
async function loadNewsletters() {
  const latestContainer = document.getElementById("latestNewsletter");
  const archiveContainer = document.getElementById("newsletterArchive");
  if (!latestContainer || !archiveContainer) return;
  if (publicLoadState.newsletters === "loading") return;
  publicLoadState.newsletters = "loading";
  latestContainer.setAttribute("aria-busy", "true");
  setPublicBusy("newsletterRetry", true);

  try {
    let issues;

    if (publicConfigReady()) {
      const rows = await publicSupabaseRequest(
        "newsletters",
        "?select=id,issue_date,title_en,title_es,gathering_en,gathering_es,scripture_en,scripture_es,community_en,community_es,optional_sections,published_at&status=eq.published&published_at=not.is.null&order=issue_date.desc&limit=100"
      );
      issues = (rows || []).map(databaseNewsletterToDisplayIssue);
    } else {
      const response = await fetch("/newsletters.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Static newsletter fallback failed.");
      issues = await response.json();
    }

    cachedNewsletterIssues = issues;
    publicLoadState.newsletters = "ready";
    renderNewsletterPage(issues);
  } catch (error) {
    console.error("Unable to load newsletters:", error);
    cachedNewsletterIssues = null;
    publicLoadState.newsletters = "error";
    renderNewsletterError();
  } finally {
    latestContainer.setAttribute("aria-busy", "false");
    setPublicBusy("newsletterRetry", false);
  }
}

function renderNewsletterError() {
  const article = document.getElementById("latestNewsletter");
  if (article) article.innerHTML = `<div class="public-empty"><p>${escapeHtml(translations[currentLanguage].newsletter_error)}</p></div>`;
  const archive = document.getElementById("newsletterArchive");
  if (archive) archive.replaceChildren();
  const count = document.getElementById("archiveCount");
  if (count) count.textContent = "";
  const notice = document.getElementById("newsletterSelectionNotice");
  if (notice) notice.hidden = true;
  if (article) delete article.dataset.issueId;
  ["newsletterTools", "archiveSearchWrap", "showMoreIssues"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.hidden = true;
  });
  const retry = document.getElementById("newsletterRetry");
  if (retry) retry.hidden = false;
}

function renderNewsletterPage(issues) {
  const latestContainer = document.getElementById("latestNewsletter");
  const archiveContainer = document.getElementById("newsletterArchive");
  if (!latestContainer || !archiveContainer) return;

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("issue");
  const selectedIssue =
    issues.find((issue) => issue.id === requestedId) || issues[0];
  const selectionNotice = document.getElementById("newsletterSelectionNotice");
  if (selectionNotice) {
    selectionNotice.hidden = !requestedId || !selectedIssue || selectedIssue.id === requestedId;
    selectionNotice.textContent = selectionNotice.hidden ? "" : translations[currentLanguage].missing_issue;
  }
  const retry = document.getElementById("newsletterRetry");
  if (retry) retry.hidden = true;
  const tools = document.getElementById("newsletterTools");
  if (tools) tools.hidden = !selectedIssue;
  const searchWrap = document.getElementById("archiveSearchWrap");
  if (searchWrap) searchWrap.hidden = issues.length < 3;
  const toolStatus = document.getElementById("newsletterToolStatus");
  if (toolStatus) toolStatus.textContent = "";

  if (!selectedIssue) {
    delete latestContainer.dataset.issueId;
    const showMore = document.getElementById("showMoreIssues");
    if (showMore) showMore.hidden = true;
    latestContainer.innerHTML =
      `<div class="newsletter-empty-public"><h2>${escapeHtml(translations[currentLanguage].newsletter_empty_title)}</h2><p>${escapeHtml(translations[currentLanguage].newsletter_empty_copy)}</p></div>`;
    archiveContainer.innerHTML = "";
    const count = document.getElementById("archiveCount");
    if (count) count.textContent = "";
    return;
  }

  renderNewsletter(selectedIssue, latestContainer);
  latestContainer.dataset.issueId = selectedIssue.id;
  const issueLabel = translations[currentLanguage][selectedIssue.id === issues[0].id ? "latest_issue" : "archived_issue"];
  const badge = latestContainer.querySelector(".tag");
  if (badge) badge.textContent = issueLabel;
  const label = document.getElementById("newsletterIssueLabel");
  if (label) label.textContent = issueLabel;
  document.title = `${selectedIssue[`title_${currentLanguage}`] || selectedIssue.title_en} | Shekinah`;
  renderNewsletterArchive(issues, selectedIssue.id);
}

function renderNewsletterArchive(issues, selectedId) {
  const archiveContainer = document.getElementById("newsletterArchive");
  if (!archiveContainer) return;
  const search = document.getElementById("archiveSearch");
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const query = normalize(search?.value.trim());
  if (query !== previousArchiveQuery) { archiveVisibleLimit = 6; previousArchiveQuery = query; }
  const otherIssues = issues.filter(issue => issue.id !== selectedId);
  const matchingIssues = otherIssues.filter(issue => !query || normalize([issue.title_en, issue.title_es, issue.date_en, issue.date_es].join(" ")).includes(query));
  const visibleIssues = matchingIssues.slice(0, archiveVisibleLimit);
  const moreButton = document.getElementById("showMoreIssues");
  if (moreButton) moreButton.hidden = visibleIssues.length >= matchingIssues.length;
  const count = document.getElementById("archiveCount");
  if (count) count.textContent = matchingIssues.length > archiveVisibleLimit
    ? translations[currentLanguage].showing_issues.replace("{shown}", visibleIssues.length).replace("{total}", matchingIssues.length)
    : `${matchingIssues.length} ${translations[currentLanguage][matchingIssues.length === 1 ? "issue_count_singular" : "issue_count"]}`;

  archiveContainer.innerHTML =
    visibleIssues
      .map((issue) => {
        const title =
          issue[`title_${currentLanguage}`] || issue.title_en;
        const date =
          issue[`date_${currentLanguage}`] || issue.date_en;

        return `
          <a class="archive-item" href="/newsletter/?issue=${encodeURIComponent(issue.id)}">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(date)}</span>
          </a>
        `;
      })
      .join("") || `<p class="archive-empty">${escapeHtml(translations[currentLanguage][query ? "no_matching_issues" : "no_other_issues"])}</p>`;
}

async function loadHomepageNewsletter() {
  if (!document.getElementById("homepageNewsletterTitle")) return;
  publicLoadState.preview = "loading";
  try {
    let issues;
    if (publicConfigReady()) {
      issues = await publicSupabaseRequest("newsletters", "?select=id,issue_date,title_en,title_es&status=eq.published&published_at=not.is.null&order=issue_date.desc&limit=1");
    } else {
      const response = await fetch("/newsletters.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Static newsletter preview failed.");
      issues = await response.json();
    }
    cachedHomepageIssue = issues?.[0] || null;
    publicLoadState.preview = "ready";
  } catch (error) {
    console.error("Unable to load newsletter preview:", error);
    cachedHomepageIssue = null;
    publicLoadState.preview = "error";
  }
  renderHomepageNewsletter();
}

function renderHomepageNewsletter() {
  const title = document.getElementById("homepageNewsletterTitle");
  const date = document.getElementById("homepageNewsletterDate");
  const link = document.getElementById("homepageNewsletterLink");
  const badge = document.getElementById("homepageNewsletterBadge");
  if (!title || !date || !link) return;
  date.textContent = "";
  link.href = "/newsletter/";
  if (cachedHomepageIssue) {
    if (badge) badge.textContent = translations[currentLanguage].latest_issue;
    title.textContent = cachedHomepageIssue[`title_${currentLanguage}`] || cachedHomepageIssue.title_en;
    const issueDate = new Date(`${cachedHomepageIssue.issue_date}T12:00:00`);
    if (!Number.isNaN(issueDate.getTime())) date.textContent = new Intl.DateTimeFormat(currentLanguage === "es" ? "es-US" : "en-US", { month: "long", day: "numeric", year: "numeric" }).format(issueDate);
    link.href = `/newsletter/?issue=${encodeURIComponent(cachedHomepageIssue.id)}`;
  } else if (publicLoadState.preview === "ready") {
    if (badge) badge.textContent = translations[currentLanguage].church_newsletter;
    title.textContent = translations[currentLanguage].newsletter_empty_title;
  } else {
    if (badge) badge.textContent = translations[currentLanguage].church_newsletter;
    title.textContent = translations[currentLanguage].church_newsletter;
    date.textContent = translations[currentLanguage].newsletter_preview_unavailable;
  }
}

function renderInformationContents() {
  const contents = document.getElementById("informationContents");
  if (!contents) return;
  const active = document.querySelector(`[data-language-content="${currentLanguage}"]`);
  if (!active) return;
  const links = document.createDocumentFragment();
  active.querySelectorAll("section h2").forEach((heading, index) => {
    heading.id = `section-${currentLanguage}-${index + 1}`;
    heading.setAttribute("tabindex", "-1");
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    links.appendChild(link);
  });
  contents.replaceChildren(links);
  const wrap = document.getElementById("informationContentsWrap");
  if (wrap) wrap.hidden = false;
  // Shared policy links must still land on a visible heading when the visitor
  // has saved the other language or changes language while reading a section.
  const section = /^#section-(?:en|es)-(\d+)$/.exec(window.location.hash);
  if (section) {
    const heading = document.getElementById(`section-${currentLanguage}-${section[1]}`);
    if (heading && window.location.hash !== `#${heading.id}`) {
      try {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + `#${heading.id}`);
        heading.scrollIntoView({ block: "start", behavior: "auto" });
      } catch { /* The policy remains readable when history changes are blocked. */ }
    }
  }
}

function databaseNewsletterToDisplayIssue(row) {
  const date = new Date(`${row.issue_date}T12:00:00`);

  const dateEn = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);

  const dateEs = new Intl.DateTimeFormat("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);

  return {
    id: row.id,
    date_en: dateEn,
    date_es: dateEs,
    title_en: row.title_en,
    title_es: row.title_es,
    sections: [
      {
        heading_en: "Sunday Gathering",
        heading_es: "Reunión del Domingo",
        body_en: row.gathering_en || "",
        body_es: row.gathering_es || ""
      },
      {
        heading_en: "Weekly Scripture",
        heading_es: "Escritura de la Semana",
        body_en: row.scripture_en || "",
        body_es: row.scripture_es || ""
      },
      {
        heading_en: "Community Update",
        heading_es: "Actualización de la Comunidad",
        body_en: row.community_en || "",
        body_es: row.community_es || ""
      }
    ]
  };
}

function renderNewsletter(issue, container) {
  const title =
    issue[`title_${currentLanguage}`] || issue.title_en;
  const date =
    issue[`date_${currentLanguage}`] || issue.date_en;
  const sections = issue.sections || [];

  container.innerHTML = `
    <span class="tag">${escapeHtml(translations[currentLanguage].latest_issue)}</span>
    <h2>${escapeHtml(title)}</h2>
    <p class="issue-date">${escapeHtml(date)}</p>
    ${sections
      .map((section) => {
        const heading =
          section[`heading_${currentLanguage}`] || section.heading_en;
        const body =
          section[`body_${currentLanguage}`] || section.body_en;

        return `
          <section class="newsletter-section">
            <h3>${escapeHtml(heading)}</h3>
            <p>${escapeHtml(body)}</p>
          </section>
        `;
      })
      .join("")}
  `;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function initializePublicPage() {
  applyLanguage(currentLanguage);

  if (document.body.dataset.page === "home") {
    await Promise.all([loadAnnouncements(), loadServiceSettings(), loadHomepageNewsletter()]);
  }

  if (document.body.dataset.page === "newsletter") {
    await loadNewsletters();
  }
}

// Progressive enhancements: content and ordinary links still work without them.
function initializeAmbientBackground() {
  const button = document.getElementById("backgroundMotion");
  if (!button || !document.querySelector(".ambient-background")) return;
  const preferences = [
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    window.matchMedia("(prefers-reduced-transparency: reduce)"),
    window.matchMedia("(forced-colors: active)")
  ];
  let enabled = true;
  try { enabled = localStorage.getItem("ministerioBackgroundMotion") !== "paused"; } catch { /* Session-only preference. */ }
  const devicePrefersStill = () => preferences.some(preference => preference.matches);

  function updateLabel() {
    const reduced = devicePrefersStill();
    button.setAttribute("aria-checked", String(enabled && !reduced));
    button.disabled = reduced;
    button.title = translations[currentLanguage][reduced ? "reduced_background" : enabled ? "pause_background" : "resume_background"];
  }
  function syncMotion() {
    const running = enabled && !devicePrefersStill() && !document.hidden;
    document.documentElement.dataset.ambientMotion = running ? "running" : "paused";
    updateLabel();
  }
  button.addEventListener("click", () => {
    if (devicePrefersStill()) return;
    enabled = !enabled;
    try { localStorage.setItem("ministerioBackgroundMotion", enabled ? "running" : "paused"); } catch { /* Keep this session's choice. */ }
    syncMotion();
  });
  document.addEventListener("visibilitychange", syncMotion);
  window.addEventListener("pagehide", () => { document.documentElement.dataset.ambientMotion = "paused"; });
  window.addEventListener("pageshow", syncMotion);
  preferences.forEach(preference => preference.addEventListener("change", syncMotion));
  window.SHEKINAH_AMBIENT = { updateLabel };
  button.hidden = false;
  syncMotion();
}

function initializePublicInteractions() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.getElementById("serviceRetry")?.addEventListener("click", loadServiceSettings);
  document.getElementById("announcementsRetry")?.addEventListener("click", loadAnnouncements);
  document.getElementById("newsletterRetry")?.addEventListener("click", loadNewsletters);
  document.getElementById("archiveSearch")?.addEventListener("input", () => {
    if (cachedNewsletterIssues) renderNewsletterArchive(cachedNewsletterIssues, document.getElementById("latestNewsletter")?.dataset.issueId);
  });
  document.getElementById("showMoreIssues")?.addEventListener("click", () => {
    const firstNewIndex = document.querySelectorAll("#newsletterArchive .archive-item").length;
    archiveVisibleLimit += 6;
    if (cachedNewsletterIssues) renderNewsletterArchive(cachedNewsletterIssues, document.getElementById("latestNewsletter")?.dataset.issueId);
    // Keep keyboard focus in the newly revealed content, even when the button hides.
    document.querySelectorAll("#newsletterArchive .archive-item")[firstNewIndex]?.focus({ preventScroll: true });
  });
  document.getElementById("printNewsletter")?.addEventListener("click", () => window.print());
  document.getElementById("copyNewsletterLink")?.addEventListener("click", async () => {
    const id = document.getElementById("latestNewsletter")?.dataset.issueId;
    if (!id) return;
    const status = document.getElementById("newsletterToolStatus");
    const url = new URL("/newsletter/", window.location.href);
    url.searchParams.set("issue", id);
    try {
      await navigator.clipboard.writeText(url.href);
      if (status) status.textContent = translations[currentLanguage].link_copied;
    } catch {
      if (status) status.textContent = translations[currentLanguage].copy_link_unavailable;
    }
  });
  const header = document.querySelector(".site-header");
  const backToTop = document.getElementById("backToTop");
  const footer = document.querySelector(".footer");
  const sectionLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
  const sections = sectionLinks.map((link) => document.getElementById(link.hash.slice(1)));
  let scrollFrame = null;

  function updateScrollState() {
    scrollFrame = null;
    header?.classList.toggle("is-scrolled", window.scrollY > 20);
    // Keep the floating control clear of the footer links and Admin button.
    if (backToTop) backToTop.hidden = window.scrollY < 520 || Boolean(footer && footer.getBoundingClientRect().top < window.innerHeight);
    let activeIndex = 0;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= 180) activeIndex = index;
    });
    sectionLinks.forEach((link, index) => {
      if (index === activeIndex) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function scheduleScrollUpdate() {
    if (scrollFrame === null) scrollFrame = window.requestAnimationFrame(updateScrollState);
  }
  window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
  window.addEventListener("resize", scheduleScrollUpdate, { passive: true });
  updateScrollState();

  backToTop?.addEventListener("click", () => {
    document.querySelector(".brand")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
  });

  const copyButton = document.getElementById("copyAddress");
  const address = document.getElementById("visitAddress");
  const copyStatus = document.getElementById("copyStatus");
  if (copyButton && address && copyStatus) {
    copyButton.hidden = false;
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(address.textContent.replace(/\s+/g, " ").trim());
        copyStatus.textContent = translations[currentLanguage].address_copied;
      } catch {
        // Clipboard permissions vary on mobile; make the visible address selectable.
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(address);
        selection?.removeAllRanges();
        selection?.addRange(range);
        copyStatus.textContent = translations[currentLanguage].copy_unavailable;
      }
    });
  }

  const archive = document.getElementById("newsletterArchive");
  archive?.addEventListener("click", (event) => {
    const link = event.target.closest("a.archive-item");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const requestedId = new URL(link.href).searchParams.get("issue");
    if (!cachedNewsletterIssues?.some((issue) => issue.id === requestedId)) return;
    try {
      window.history.pushState(null, "", link.href);
    } catch {
      return; // Keep normal navigation if the browser blocks the History API.
    }
    event.preventDefault();
    renderNewsletterPage(cachedNewsletterIssues);
    const article = document.getElementById("latestNewsletter");
    article?.focus({ preventScroll: true });
    const top = article?.getBoundingClientRect().top;
    if (top < 100 || top > window.innerHeight * 0.7) {
      article?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
    }
  });
  window.addEventListener("popstate", () => {
    if (archive && cachedNewsletterIssues) renderNewsletterPage(cachedNewsletterIssues);
  });


  const heroCard = document.querySelector(".hero-card");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (heroCard) {
    let lightFrame = null;
    heroCard.addEventListener("pointermove", (event) => {
      if (reducedMotion.matches || !finePointer.matches) return;
      if (lightFrame !== null) window.cancelAnimationFrame(lightFrame);
      lightFrame = window.requestAnimationFrame(() => {
        const rect = heroCard.getBoundingClientRect();
        heroCard.style.setProperty("--light-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        heroCard.style.setProperty("--light-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        lightFrame = null;
      });
    });
    heroCard.addEventListener("pointerleave", () => {
      if (lightFrame !== null) window.cancelAnimationFrame(lightFrame);
      lightFrame = null;
      heroCard.style.removeProperty("--light-x");
      heroCard.style.removeProperty("--light-y");
    });
  }
}

let publicPageStarted = false;
function startPublicPage() {
  if (publicPageStarted) return;
  publicPageStarted = true;
  initializePublicPage();
  initializePublicInteractions();
  initializeAmbientBackground();
}
// All deferred extensions register before the single initial content request.
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startPublicPage, { once: true });
else startPublicPage();

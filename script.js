window.SHEKINAH_PUBLIC_READY = false;

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
    share_visit: "Share church details",
    visit_details_copied: "Church details copied. Paste them into a message to share.",
    address_unavailable: "The address is temporarily unavailable. Please try again.",
    next_scheduled_service: "Next scheduled service",
    los_angeles_time: "Los Angeles time",
    save_service_date: "Save the date",
    calendar_note: "Save one service to your calendar. Check announcements for schedule changes.",
    calendar_ready: "Calendar file ready. Open it to save this service.",
    calendar_unavailable: "We couldn’t prepare the calendar file. Use the service details above.",
    newsletter_empty_title: "No published newsletter yet",
    newsletter_empty_copy: "Check back for the next Ministerio Cristiano Shekinah update.",
    retry: "Try again",
    loading: "Loading…",
    archived_issue: "From the archive",
    browse_issues: "Browse issues",
    search_issues: "Search issues",
    search_issues_hint: "Find a title, date, or words from an issue.",
    clear_search: "Clear search",
    in_this_issue: "In this issue",
    more_newsletters: "More newsletters",
    newer_issue: "Newer issue",
    older_issue: "Older issue",
    newsletter_document_title: "Newsletter | Ministerio Cristiano Shekinah",
    planning_a_visit: "Planning a visit?",
    view_current_service: "See current service details",
    no_matching_issues: "No other issues match your search.",
    no_other_issues: "You’re reading the only published issue. More updates will appear here.",
    issue_count: "issues to explore",
    issue_count_singular: "issue to explore",
    show_more_issues: "Show more issues",
    showing_issues: "Showing {shown} of {total} issues",
    copy_issue_link: "Copy issue link",
    link_copied: "Issue link copied.",
    copy_link_unavailable: "Copy this link:",
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
    share_visit: "Compartir información de la iglesia",
    visit_details_copied: "Información copiada. Pégala en un mensaje para compartirla.",
    address_unavailable: "La dirección no está disponible por el momento. Inténtalo de nuevo.",
    next_scheduled_service: "Próximo servicio programado",
    los_angeles_time: "Hora de Los Ángeles",
    save_service_date: "Guardar la fecha",
    calendar_note: "Guarda un servicio en tu calendario. Consulta los anuncios por si hay cambios de horario.",
    calendar_ready: "Archivo de calendario listo. Ábrelo para guardar este servicio.",
    calendar_unavailable: "No pudimos preparar el archivo de calendario. Consulta la información del servicio arriba.",
    newsletter_empty_title: "Aún no hay un boletín publicado",
    newsletter_empty_copy: "Vuelve pronto para la próxima actualización de Ministerio Cristiano Shekinah.",
    retry: "Intentar de nuevo",
    loading: "Cargando…",
    archived_issue: "Del archivo",
    browse_issues: "Explora los boletines",
    search_issues: "Buscar boletines",
    search_issues_hint: "Busca un título, una fecha o palabras de un boletín.",
    clear_search: "Borrar búsqueda",
    in_this_issue: "En este boletín",
    more_newsletters: "Más boletines",
    newer_issue: "Boletín más reciente",
    older_issue: "Boletín anterior",
    newsletter_document_title: "Boletín | Ministerio Cristiano Shekinah",
    planning_a_visit: "¿Planeas visitarnos?",
    view_current_service: "Consulta los detalles actuales del servicio",
    no_matching_issues: "No hay otros boletines que coincidan con tu búsqueda.",
    no_other_issues: "Estás leyendo el único boletín publicado. Aquí aparecerán las próximas novedades.",
    issue_count: "boletines para explorar",
    issue_count_singular: "boletín para explorar",
    show_more_issues: "Ver más boletines",
    showing_issues: "Mostrando {shown} de {total} boletines",
    copy_issue_link: "Copiar enlace",
    link_copied: "Enlace del boletín copiado.",
    copy_link_unavailable: "Copia este enlace:",
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
let newsletterSelectionQuery = null;
let newsletterInitialAnchorHandled = false;
const publicLoadState = { service: "idle", announcements: "idle", newsletters: "idle", preview: "idle" };
const publicRetryFocus = new Map();
const publicRetryTargets = { serviceRetry: "services", announcementsRetry: "announcementList", newsletterRetry: "latestNewsletter" };

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
  Object.keys(publicRetryTargets).forEach((id) => {
    const button = document.getElementById(id);
    if (button?.disabled) button.textContent = translations[safeLanguage].loading;
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
  const content = document.getElementById("main-content");
  // Retarget an interrupted fade from its displayed opacity; cancelling first
  // would flash the entire page back to full brightness on rapid clicks.
  const fromOpacity = languageAnimation && content ? window.getComputedStyle(content).opacity : "1";
  languageAnimation?.cancel();
  languageAnimation = null;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!content?.animate || reduced) { applyLanguage(next); return; }
  try {
    languageAnimation = content.animate([{ opacity: fromOpacity }, { opacity: 0 }], { duration: 90, easing: "ease-out", fill: "forwards" });
    await languageAnimation.finished;
    if (change !== languageChange) return;
    applyLanguage(next);
    languageAnimation.cancel();
    languageAnimation = content.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 180, easing: "ease-out" }
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
const desktopNavigation = window.matchMedia("(min-width: 1101px)");

function updateMenuLabel() {
  if (!menuButton) return;
  const open = menuButton.getAttribute("aria-expanded") === "true";
  // The closing fade remains visible briefly, but its links must stop being
  // interactive immediately. Desktop navigation never becomes inert.
  if (navMenu) navMenu.inert = !desktopNavigation.matches && !open;
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
  desktopNavigation.addEventListener("change", () => closeMenu());
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

let currentVisitDetails = null;
let visitActionGeneration = 0;

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

  const address = typeof service.address === "string" ? service.address.trim() : "";
  currentVisitDetails = address && address.length <= 1000 ? { address, day, time: displayTime } : null;
  ++visitActionGeneration;
  const summary = document.getElementById("heroServiceSummary");
  if (summary) summary.hidden = false;
  const summaryDay = document.getElementById("heroServiceDay");
  const summaryTime = document.getElementById("heroSummaryTime");
  if (summaryDay) summaryDay.textContent = day;
  if (summaryTime) summaryTime.textContent = displayTime;
  renderVisitDirections();

  if (message) {
    message.textContent =
      specialMessage || translations[currentLanguage].welcome_message;
  }
  renderVisitCalendar(service);
}

function renderServiceUnavailable() {
  currentVisitDetails = null;
  ++visitActionGeneration;
  const summary = document.getElementById("heroServiceSummary");
  if (summary) summary.hidden = true;
  renderVisitCalendar(null);
  renderVisitDirections();
  const retry = document.getElementById("serviceRetry");
  if (retry) retry.hidden = false;
  ["heroServiceTime", "serviceSectionTime", "visitServiceTime"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = "—";
  });

  const message = document.getElementById("specialServiceMessage");
  if (message) message.textContent = translations[currentLanguage].service_error;
}

function renderVisitDirections() {
  const address = currentVisitDetails?.address;
  document.querySelectorAll("[data-service-address]").forEach((element) => {
    element.textContent = address || translations[currentLanguage].address_unavailable;
  });
  document.querySelectorAll("[data-map-provider]").forEach((link) => {
    if (!address) {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      return;
    }
    const destination = encodeURIComponent(address);
    link.href = link.dataset.mapProvider === "apple"
      ? `https://maps.apple.com/?daddr=${destination}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    link.removeAttribute("aria-disabled");
  });
  ["copyAddress", "shareVisit"].forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.hidden = !address;
  });
  const status = document.getElementById("copyStatus");
  if (status) status.textContent = "";
}

let calendarRefreshTimer = null;
function renderVisitCalendar(service) {
  clearTimeout(calendarRefreshTimer);
  calendarRefreshTimer = null;
  const wrap = document.getElementById("visitCalendar");
  const date = document.getElementById("nextServiceDate");
  const button = document.getElementById("downloadServiceCalendar");
  const status = document.getElementById("calendarStatus");
  if (!wrap || !date || !button) return;
  wrap.hidden = true;
  button.hidden = true;
  date.textContent = "";
  date.removeAttribute("datetime");
  if (status) status.textContent = "";
  const api = window.SHEKINAH_VISIT_CALENDAR;
  const start = api?.nextService(service);
  if (!start || !currentVisitDetails) return;
  try {
    date.textContent = new Intl.DateTimeFormat(currentLanguage === "es" ? "es-US" : "en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: api.timeZone
    }).format(start);
    date.setAttribute("datetime", start.toISOString());
    wrap.hidden = false;
    button.hidden = typeof Blob !== "function" || typeof URL.createObjectURL !== "function";
    if (!document.hidden) {
      calendarRefreshTimer = setTimeout(() => renderVisitCalendar(cachedService), Math.min(start.getTime() - Date.now() + 1000, 86400000));
    }
  } catch { /* The published service information remains usable without Intl. */ }
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
  if (busy) publicRetryFocus.set(id, document.activeElement === button);
  button.disabled = busy;
  button.textContent = translations[currentLanguage][busy ? "loading" : "retry"];
  if (!busy) {
    const hadFocus = publicRetryFocus.get(id);
    publicRetryFocus.delete(id);
    // A successful retry hides its control. Keep keyboard users at the
    // recovered content without moving focus away from another chosen control.
    if (hadFocus && (document.activeElement === document.body || document.activeElement === button)) {
      const target = button.hidden ? document.getElementById(publicRetryTargets[id]) : button;
      if (target && target !== button) target.setAttribute("tabindex", "-1");
      target?.focus({ preventScroll: true });
    }
  }
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
          ${tag ? `<span class="tag" lang="${localizedContentLanguage(announcement, "tag")}">${escapeHtml(tag)}</span>` : ""}
          <h3 lang="${localizedContentLanguage(announcement, "title")}">${escapeHtml(title)}</h3>
          <p lang="${localizedContentLanguage(announcement, "description")}">${escapeHtml(description)}</p>
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
    if (!newsletterInitialAnchorHandled) {
      newsletterInitialAnchorHandled = true;
      restoreNewsletterFragment();
    }
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
  renderNewsletterReadingTools([], null);
  document.title = translations[currentLanguage].newsletter_document_title;
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
  newsletterSelectionQuery = requestedId;
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
    renderNewsletterReadingTools([], null);
    document.title = translations[currentLanguage].newsletter_document_title;
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
  renderNewsletterReadingTools(issues, selectedIssue.id);
}

function renderNewsletterReadingTools(issues, selectedId) {
  const article = document.getElementById("latestNewsletter");
  const contents = document.getElementById("newsletterContents");
  const wrap = document.getElementById("newsletterContentsWrap");
  const pagination = document.getElementById("issuePagination");
  const browse = document.getElementById("browseNewsletterArchive");
  if (browse) browse.hidden = !selectedId || issues.length < 2;
  if (contents && wrap) {
    const links = document.createDocumentFragment();
    if (selectedId) article?.querySelectorAll("section h3").forEach((heading, index) => {
      heading.id = `newsletter-section-${index + 1}`;
      heading.setAttribute("tabindex", "-1");
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      if (heading.hasAttribute("lang")) link.setAttribute("lang", heading.getAttribute("lang"));
      links.appendChild(link);
    });
    contents.replaceChildren(links);
    wrap.hidden = contents.children.length < 2;
  }
  if (pagination) {
    const links = document.createDocumentFragment();
    const index = issues.findIndex(issue => issue.id === selectedId);
    if (index !== -1) for (const [offset, label] of [[-1, "newer_issue"], [1, "older_issue"]]) {
      const issue = issues[index + offset];
      if (!issue) continue;
      const link = document.createElement("a");
      link.className = "issue-neighbor";
      link.href = `/newsletter/?issue=${encodeURIComponent(issue.id)}`;
      link.dataset.newsletterIssue = "";
      const direction = document.createElement("span");
      direction.textContent = translations[currentLanguage][label];
      const title = document.createElement("strong");
      title.textContent = issue[`title_${currentLanguage}`] || issue.title_en;
      title.setAttribute("lang", localizedContentLanguage(issue, "title"));
      link.append(direction, title);
      links.appendChild(link);
    }
    pagination.replaceChildren(links);
    pagination.hidden = !pagination.children.length;
  }
}

function restoreNewsletterFragment() {
  if (!/^#newsletter-section-\d+$/.test(window.location.hash)) return;
  const heading = document.getElementById(window.location.hash.slice(1));
  if (!heading) return;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ behavior: "auto", block: "start" });
}

const newsletterSearchText = new WeakMap();
function normalizeArchiveText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function searchableNewsletterText(issue) {
  if (!newsletterSearchText.has(issue)) {
    const values = [issue.title_en, issue.title_es, issue.date_en, issue.date_es, issue.issue_date];
    for (const section of [...(issue.sections || []), ...(issue.optional_sections || [])]) {
      // Empty template headings are not content. Indexing them would make a
      // search for "community" match every issue, even an empty section.
      if (!String(section.body_en || section.body_es || "").trim()) continue;
      values.push(section.heading_en, section.heading_es, section.title_en, section.title_es, section.body_en, section.body_es);
    }
    newsletterSearchText.set(issue, normalizeArchiveText(values.join(" ")));
  }
  return newsletterSearchText.get(issue);
}

function renderNewsletterArchive(issues, selectedId) {
  const archiveContainer = document.getElementById("newsletterArchive");
  if (!archiveContainer) return;
  const search = document.getElementById("archiveSearch");
  const query = normalizeArchiveText(search?.value.trim());
  const clear = document.getElementById("clearArchiveSearch");
  if (clear) clear.hidden = !search?.value;
  if (query !== previousArchiveQuery) { archiveVisibleLimit = 6; previousArchiveQuery = query; }
  const otherIssues = issues.filter(issue => issue.id !== selectedId);
  const matchingIssues = otherIssues.filter(issue => !query || searchableNewsletterText(issue).includes(query));
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
            <strong lang="${localizedContentLanguage(issue, "title")}">${escapeHtml(title)}</strong>
            <span lang="${localizedContentLanguage(issue, "date")}">${escapeHtml(date)}</span>
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
  title.removeAttribute("lang");
  link.href = "/newsletter/";
  if (cachedHomepageIssue) {
    if (badge) badge.textContent = translations[currentLanguage].latest_issue;
    title.textContent = cachedHomepageIssue[`title_${currentLanguage}`] || cachedHomepageIssue.title_en;
    title.setAttribute("lang", localizedContentLanguage(cachedHomepageIssue, "title"));
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
    issue_date: row.issue_date,
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
    <h2 lang="${localizedContentLanguage(issue, "title")}">${escapeHtml(title)}</h2>
    <p class="issue-date" lang="${localizedContentLanguage(issue, "date")}">${escapeHtml(date)}</p>
    ${sections
      .map((section) => {
        const heading =
          section[`heading_${currentLanguage}`] || section.heading_en;
        const body =
          section[`body_${currentLanguage}`] || section.body_en;

        return `
          <section class="newsletter-section">
            <h3 lang="${localizedContentLanguage(section, "heading")}">${escapeHtml(heading)}</h3>
            <p lang="${localizedContentLanguage(section, "body")}">${escapeHtml(body)}</p>
          </section>
        `;
      })
      .join("")}
  `;
}

function localizedContentLanguage(item, field) {
  return currentLanguage === "es" && !item?.[`${field}_es`] ? "en" : currentLanguage;
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
  document.getElementById("downloadServiceCalendar")?.addEventListener("click", () => {
    const status = document.getElementById("calendarStatus");
    let url;
    let link;
    try {
      const calendar = window.SHEKINAH_VISIT_CALENDAR?.calendarFile(cachedService, currentLanguage);
      if (!calendar) {
        renderVisitCalendar(cachedService);
        return;
      }
      url = URL.createObjectURL(new Blob([calendar.content], { type: "text/calendar;charset=utf-8" }));
      link = document.createElement("a");
      link.href = url;
      link.download = calendar.filename;
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      if (status) status.textContent = translations[currentLanguage].calendar_ready;
    } catch {
      if (status) status.textContent = translations[currentLanguage].calendar_unavailable;
    } finally {
      link?.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  });
  if (document.getElementById("visitCalendar")) {
    document.addEventListener("visibilitychange", () => renderVisitCalendar(cachedService));
    window.addEventListener("pageshow", () => renderVisitCalendar(cachedService));
    window.addEventListener("pagehide", () => { clearTimeout(calendarRefreshTimer); calendarRefreshTimer = null; });
  }
  document.getElementById("archiveSearch")?.addEventListener("input", () => {
    if (cachedNewsletterIssues) renderNewsletterArchive(cachedNewsletterIssues, document.getElementById("latestNewsletter")?.dataset.issueId);
  });
  document.getElementById("clearArchiveSearch")?.addEventListener("click", () => {
    const input = document.getElementById("archiveSearch");
    if (!input) return;
    input.value = "";
    if (cachedNewsletterIssues) renderNewsletterArchive(cachedNewsletterIssues, document.getElementById("latestNewsletter")?.dataset.issueId);
    input.focus();
  });
  document.getElementById("newsletterContents")?.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#newsletter-section-"]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    document.getElementById(link.hash.slice(1))?.focus({ preventScroll: true });
  });
  document.getElementById("browseNewsletterArchive")?.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    document.getElementById("newsletterArchivePanel")?.focus({ preventScroll: true });
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
      if (status && document.getElementById("latestNewsletter")?.dataset.issueId === id) {
        status.textContent = translations[currentLanguage].link_copied;
      }
    } catch {
      // A missing deep link may display a different, available issue. Offer
      // that issue's exact URL instead of the stale browser address, and do
      // not attach an old clipboard result to a newly selected issue.
      if (status && document.getElementById("latestNewsletter")?.dataset.issueId === id) {
        const link = document.createElement("a");
        link.setAttribute("href", url.href);
        link.textContent = url.href;
        status.replaceChildren(document.createTextNode(translations[currentLanguage].copy_link_unavailable + " "), link);
      }
    }
  });
  const header = document.querySelector(".site-header");
  const backToTop = document.getElementById("backToTop");
  const footer = document.querySelector(".footer");
  const sectionLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
  const sections = sectionLinks.map((link) => document.getElementById(link.hash.slice(1)));
  let scrollFrame = null;
  let activeSectionIndex = -1;

  function updateScrollState() {
    scrollFrame = null;
    // Read all geometry before changing classes/visibility, avoiding forced
    // layout between individual section measurements during a scroll frame.
    const scrolled = window.scrollY > 20;
    const hideBackToTop = window.scrollY < 520 || Boolean(footer && footer.getBoundingClientRect().top < window.innerHeight);
    let activeIndex = 0;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= 180) activeIndex = index;
    });
    header?.classList.toggle("is-scrolled", scrolled);
    // Keep the floating control clear of the footer links and Admin button.
    if (backToTop && backToTop.hidden !== hideBackToTop) backToTop.hidden = hideBackToTop;
    if (activeSectionIndex !== activeIndex) {
      sectionLinks.forEach((link, index) => {
        if (index === activeIndex) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      activeSectionIndex = activeIndex;
    }
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
  const shareButton = document.getElementById("shareVisit");
  let visitActionBusy = false;
  async function shareOrCopyVisit(share) {
    if (!currentVisitDetails || visitActionBusy) return;
    const generation = visitActionGeneration;
    const details = currentVisitDetails;
    const text = `Ministerio Cristiano Shekinah\n${details.day} · ${details.time}\n${details.address}\nhttps://mcshekinah.org/`;
    visitActionBusy = true;
    [copyButton, shareButton].forEach((button) => { if (button) button.disabled = true; });
    if (copyStatus) copyStatus.textContent = "";
    try {
      if (share && typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "Ministerio Cristiano Shekinah", text: `Ministerio Cristiano Shekinah\n${details.day} · ${details.time}\n${details.address}`, url: "https://mcshekinah.org/" });
          return;
        } catch (error) {
          if (error?.name === "AbortError" || generation !== visitActionGeneration) return;
        }
      }
      try {
        await navigator.clipboard.writeText(share ? text : details.address);
        if (copyStatus && generation === visitActionGeneration) {
          copyStatus.textContent = translations[currentLanguage][share ? "visit_details_copied" : "address_copied"];
        }
      } catch {
        if (generation !== visitActionGeneration || !address || !copyStatus) return;
        // Clipboard permissions vary on mobile; make the visible address selectable.
        if (typeof document.createRange === "function") {
          const selection = window.getSelection?.();
          const range = document.createRange();
          range.selectNodeContents(address);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        copyStatus.textContent = translations[currentLanguage].copy_unavailable;
      }
    } finally {
      visitActionBusy = false;
      [copyButton, shareButton].forEach((button) => { if (button) button.disabled = false; });
    }
  }
  copyButton?.addEventListener("click", () => shareOrCopyVisit(false));
  shareButton?.addEventListener("click", () => shareOrCopyVisit(true));

  const archive = document.getElementById("newsletterArchive");
  document.getElementById("main-content")?.addEventListener("click", (event) => {
    const link = event.target.closest("a.archive-item, a[data-newsletter-issue]");
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
    // Moving between section anchors should not replace the focused article.
    if (archive && cachedNewsletterIssues && new URLSearchParams(window.location.search).get("issue") !== newsletterSelectionQuery) {
      renderNewsletterPage(cachedNewsletterIssues);
      restoreNewsletterFragment();
    }
  });
}

let publicPageStarted = false;
function startPublicPage() {
  if (publicPageStarted) return;
  publicPageStarted = true;
  initializePublicPage();
  initializePublicInteractions();
  initializeAmbientBackground();
  window.SHEKINAH_PUBLIC_READY = true;
}
// All deferred extensions register before the single initial content request.
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startPublicPage, { once: true });
else startPublicPage();

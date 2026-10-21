window.SHEKINAH_ADMIN_READY = true;

window.addEventListener("error", function (event) {
  var message = document.getElementById("adminMessage");
  if (message && !document.getElementById("adminLoginView").classList.contains("hidden")) {
    message.textContent = "The admin portal could not finish loading. Reload this page and try again.";
  }
});

const loginView = document.getElementById("adminLoginView");
const dashboard = document.getElementById("adminDashboard");
const loginForm = document.getElementById("adminLoginForm");
const adminMessage = document.getElementById("adminMessage");
const securityNote = document.getElementById("securityNote");
const passwordToggle = document.getElementById("passwordToggle");
const passwordInput = document.getElementById("adminPassword");
const emailInput = document.getElementById("adminEmail");
const signOutButton = document.getElementById("signOutButton");

let supabaseClient = null;
let authenticatedAdmin = null;
let adminSessionVersion = 0;
let loginOperation = null;
let adminAnnouncements = [];
let selectedAnnouncementIndex = null;
let selectedAnnouncementVersion = null;
let serviceVersion = null;
const editorOperations = new Map();
const editorBaselines = new Map();
let unloadGuardActive = false;

function editorKey(section) {
  if (!authenticatedAdmin) return null;
  if (section === "service") return "service";
  if (section === "announcements") return adminAnnouncements[selectedAnnouncementIndex]?.id || null;
  return selectedNewsletterId || (selectedNewsletterIsNew ? "new" : null);
}

function editorSnapshot(section) {
  const key = editorKey(section);
  if (!key) return null;
  const editor = document.querySelector(section === "service"
    ? '[data-admin-panel="service"] .editor-panel'
    : section === "announcements" ? "#announcementEditorForm" : "#newsletterEditorForm");
  return JSON.stringify([key, Array.from(editor.querySelectorAll("input, textarea, select"), field => [
    field.id || field.name || field.dataset.field || "",
    field.type === "checkbox" || field.type === "radio" ? field.checked : field.value
  ])]);
}

function hasUnsavedEditorChanges(section) {
  const snapshot = editorSnapshot(section);
  return snapshot !== null && editorBaselines.has(section) && snapshot !== editorBaselines.get(section);
}

function warnBeforeLeaving(event) {
  if (!["service", "announcements", "newsletter"].some(hasUnsavedEditorChanges)) return;
  event.preventDefault();
  event.returnValue = true;
}

function updateUnloadGuard() {
  const dirty = ["service", "announcements", "newsletter"].some(hasUnsavedEditorChanges);
  if (dirty === unloadGuardActive) return;
  unloadGuardActive = dirty;
  if (dirty) window.addEventListener("beforeunload", warnBeforeLeaving);
  else window.removeEventListener("beforeunload", warnBeforeLeaving);
}

function rememberEditorBaseline(section) {
  const generation = adminSessionVersion;
  const key = editorKey(section);
  // The optional newsletter extension finishes populating fields in the same
  // task. Snapshot them too, without persisting private drafts to storage.
  Promise.resolve().then(() => {
    if (generation !== adminSessionVersion || key !== editorKey(section)) return;
    editorBaselines.set(section, editorSnapshot(section));
    updateUnloadGuard();
  });
}

function confirmDiscardEditor(section) {
  return !hasUnsavedEditorChanges(section) || window.confirm("Discard your unsaved changes in this editor?");
}

function focusEditorHeading(section) {
  // Selecting a record rebuilds its list and removes the activated button.
  // Place focus at the opened editor so the next Tab reaches its controls.
  const heading = document.getElementById(section === "announcements" ? "announcementEditorHeading" : "newsletterEditorHeading");
  heading?.setAttribute("tabindex", "-1");
  heading?.focus();
}

["input", "change", "click"].forEach(type => document.addEventListener(type, updateUnloadGuard));

const contentConflictMessage = "This content changed or no longer exists. Your draft is still here. Copy your changes, then reload this page to review the latest version.";

function requireEditorVersion(version, status) {
  if (typeof version === "string" && version.length > 0) return true;
  status.textContent = "The saved version could not be verified. Copy your draft, then reload this page before trying again.";
  return false;
}

// A save/publish/delete is one operation per editor. Keep its inputs stable and
// always release controls, including when the network throws or the user signs out.
async function runEditorAction(section, button, status, busyText, action) {
  if (editorOperations.has(section) || !authenticatedAdmin) return;
  const generation = adminSessionVersion;
  const panel = document.querySelector(`[data-admin-panel="${section}"]`);
  const controls = new Map(Array.from(panel.querySelectorAll("button, input, select, textarea"), control => [control, control.disabled]));
  const label = button.textContent;
  const hadFocus = document.activeElement === button;
  const operation = {
    release() {
      if (editorOperations.get(section) !== operation) return;
      editorOperations.delete(section);
      controls.forEach((disabled, control) => { control.disabled = disabled; });
      panel.setAttribute("aria-busy", "false");
      button.textContent = label;
      if (section === "announcements" && selectedAnnouncementIndex !== null) {
        updateAnnouncementStatusUI(adminAnnouncements[selectedAnnouncementIndex]);
      } else if (section === "newsletter" && (selectedNewsletterId || selectedNewsletterIsNew)) {
        updateNewsletterStatusUI(document.getElementById("issueStatus").value);
      }
      // WebKit may retain focus on the button until the now-hidden editor is
      // laid out. Restore that focus too, without taking it from another control.
      if (generation === adminSessionVersion && hadFocus && (document.activeElement === document.body || document.activeElement === button) && panel.classList.contains("active") && dashboard.classList.contains("visible")) {
        let focusTarget = button;
        if (section !== "service") {
          const editor = document.getElementById(section === "announcements" ? "announcementEditorForm" : "newsletterEditorForm");
          const fallback = document.getElementById(section === "announcements" ? "addAnnouncementButton" : "newNewsletterButton");
          if (editor.classList.contains("hidden")) focusTarget = fallback;
        }
        focusTarget.focus({ preventScroll: true });
      }
    }
  };
  editorOperations.set(section, operation);
  controls.forEach((_, control) => { control.disabled = true; });
  panel.setAttribute("aria-busy", "true");
  button.textContent = busyText;
  status.textContent = "";
  try {
    await action();
  } catch (error) {
    if (generation === adminSessionVersion) {
      console.error("Content request failed:", error);
      status.textContent = "The request could not be completed. Check your connection and try again.";
    }
  } finally {
    operation.release();
  }
}

async function withAdminReadTimeout(request) {
  // Bound content reads so a stalled connection cannot lock an editor forever.
  // Writes deliberately keep their existing confirmation/error handling.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function configIsReady() {
  const cfg = window.SHEKINAH_SUPABASE;
  return Boolean(
    window.supabase &&
    cfg &&
    cfg.url &&
    cfg.publishableKey &&
    !cfg.url.includes("PASTE_") &&
    !cfg.publishableKey.includes("PASTE_")
  );
}

function showLogin() {
  ++adminSessionVersion;
  loginOperation = null;
  setLoginBusy(false);
  for (const operation of editorOperations.values()) operation.release();
  authenticatedAdmin = null;
  editorBaselines.clear();
  updateUnloadGuard();
  serviceVersion = null;
  window.SHEKINAH_OWNER?.clear();
  adminAnnouncements = [];
  adminNewsletters = [];
  selectedAnnouncementIndex = null;
  selectedNewsletterId = null;
  selectedNewsletterIsNew = false;
  dashboard.querySelectorAll("input, textarea").forEach(field => { field.value = ""; });
  resetAnnouncementEditor();
  resetNewsletterEditor();
  renderAdminAnnouncementList();
  window.SHEKINAH_NEWSLETTER_EDITOR?.clear();
  updateServicePreview();
  updateNewsletterPreview();
  ["serviceDraftStatus", "announcementDraftStatus", "draftStatus", "announcementIdLabel"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.textContent = "";
  });
  loginView.classList.remove("hidden");
  dashboard.classList.remove("visible");
}

async function showDashboard(user) {
  ++adminSessionVersion;
  authenticatedAdmin = user;
  rememberEditorBaseline("service");
  loginView.classList.add("hidden");
  dashboard.classList.add("visible");
  window.SHEKINAH_OWNER?.refresh();

  await Promise.all([
    loadServiceEditor(),
    loadAnnouncementEditor(),
    loadNewsletterEditor()
  ]);
}

function setLoginBusy(isBusy) {
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = isBusy;
  emailInput.disabled = isBusy;
  passwordInput.disabled = isBusy;
  submitButton.textContent = isBusy ? "Signing In…" : "Sign In";
}

function setButtonBusy(button, busy, busyText, normalText) {
  button.disabled = busy;
  button.textContent = busy ? busyText : normalText;
}

async function verifyAdmin(userId) {
  const { data, error } = await supabaseClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Admin verification failed:", error);
    return false;
  }

  return Boolean(data?.user_id);
}

async function restoreAuthenticatedAdmin() {
  if (!supabaseClient) return;
  const generation = adminSessionVersion;

  const { data, error } = await supabaseClient.auth.getUser();
  if (generation !== adminSessionVersion) return;

  if (error || !data?.user) {
    showLogin();
    return;
  }

  const allowed = await verifyAdmin(data.user.id);
  if (generation !== adminSessionVersion) return;

  if (!allowed) {
    await supabaseClient.auth.signOut();
    showLogin();
    adminMessage.textContent =
      "This account is not authorized for church administration.";
    return;
  }

  await showDashboard(data.user);
}

function clearHistorySessionView() {
  // A history cache can retain the entire document, including private drafts
  // and Owner controls, while authentication changes in a different tab.
  showLogin();
  passwordInput.value = "";
  passwordInput.type = "password";
  passwordToggle.textContent = "Show";
  passwordToggle.setAttribute("aria-pressed", "false");
  passwordToggle.setAttribute("aria-label", "Show password");
}

window.addEventListener("pagehide", (event) => {
  if (event.persisted) clearHistorySessionView();
});

window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  // Replace the frozen document before reusing authentication or editor state.
  // Normal startup then verifies identity and current membership with the server.
  clearHistorySessionView();
  window.location.reload();
});

async function initializeAuth() {
  if (!configIsReady()) {
    loginForm.querySelector('button[type="submit"]').disabled = true;
    emailInput.disabled = true;
    passwordInput.disabled = true;

    adminMessage.textContent =
      "Secure sign-in is unavailable. Reload this page or try again later.";

    return;
  }

  adminMessage.textContent = "";
  supabaseClient = window.supabase.createClient(
    window.SHEKINAH_SUPABASE.url,
    window.SHEKINAH_SUPABASE.publishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  // Subscribe before restoring content: a sign-out in another tab must
  // invalidate every pending private read during startup too.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") showLogin();
  });
  await restoreAuthenticatedAdmin();
}

passwordToggle.addEventListener("click", () => {
  const showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  passwordToggle.textContent = showing ? "Show" : "Hide";
  passwordToggle.setAttribute("aria-pressed", String(!showing));
  passwordToggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (loginOperation) return;

  if (!supabaseClient) {
    adminMessage.textContent = "Secure authentication is not available.";
    return;
  }

  const operation = {};
  const focusedControl = document.activeElement;
  const hadFormFocus = Boolean(focusedControl && loginForm.contains(focusedControl));
  loginOperation = operation;
  setLoginBusy(true);
  const generation = ++adminSessionVersion;
  adminMessage.textContent = "";

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });
    if (generation !== adminSessionVersion) return;

    passwordInput.value = "";

    if (error || !data?.user) {
      adminMessage.textContent =
        "Unable to sign in. Check the email and password.";
      return;
    }

    const { data: verified, error: verifyError } =
      await supabaseClient.auth.getUser();
    if (generation !== adminSessionVersion) return;

    if (verifyError || !verified?.user) {
      await supabaseClient.auth.signOut();
      adminMessage.textContent = "Unable to verify this session.";
      return;
    }

    const allowed = await verifyAdmin(verified.user.id);
    if (generation !== adminSessionVersion) return;

    if (!allowed) {
      await supabaseClient.auth.signOut();
      adminMessage.textContent =
        "This account is not authorized for church administration.";
      return;
    }

    await showDashboard(verified.user);
  } catch (error) {
    if (loginOperation !== operation) return;
    console.error(error);
    adminMessage.textContent =
      "A secure sign-in error occurred. Please try again.";
  } finally {
    if (loginOperation === operation) {
      loginOperation = null;
      setLoginBusy(false);
      if (hadFormFocus && !loginView.classList.contains("hidden") && (document.activeElement === document.body || document.activeElement === focusedControl)) {
        passwordInput.focus();
      }
    }
  }
});

signOutButton.addEventListener("click", async () => {
  setButtonBusy(signOutButton, true, "Signing out…", "Sign Out");
  const status = document.getElementById("dashboardStatus");
  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
    }
    showLogin();
    passwordInput.value = "";
    passwordInput.type = "password";
    passwordToggle.textContent = "Show";
    passwordToggle.setAttribute("aria-pressed", "false");
    passwordToggle.setAttribute("aria-label", "Show password");
    adminMessage.textContent = "Signed out securely.";
    if (status) status.textContent = "";
    emailInput.focus();
  } catch (error) {
    console.error("Sign-out failed:", error);
    if (status) status.textContent = "Sign-out could not be completed. Check your connection and try again.";
  } finally {
    setButtonBusy(signOutButton, false, "Signing out…", "Sign Out");
  }
});

// ------------------------------------------------------------
// Admin section tabs
// ------------------------------------------------------------
function syncAdminTabs() {
  const nav = document.querySelector(".admin-content-tabs");
  nav?.setAttribute("role", "tablist");
  document.querySelectorAll(".admin-content-tab").forEach(tab => {
    const section = tab.dataset.adminSection;
    const panel = document.querySelector(`[data-admin-panel="${section}"]`);
    if (!panel) return;
    tab.id ||= `admin-tab-${section}`;
    panel.id ||= `admin-panel-${section}`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panel.id);
    const active = tab.classList.contains("active") && !tab.hidden;
    tab.setAttribute("aria-selected", String(active));
    tab.setAttribute("tabindex", active ? "0" : "-1");
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
  });
}
function selectAdminSection(tab) {
  if (!tab || tab.hidden) return;
  document.querySelectorAll(".admin-content-tab").forEach(item => item.classList.toggle("active", item === tab));
  document.querySelectorAll(".admin-content-section").forEach(panel => panel.classList.toggle("active", panel.dataset.adminPanel === tab.dataset.adminSection));
  syncAdminTabs();
}
const adminTabList = document.querySelector(".admin-content-tabs");
adminTabList?.addEventListener("click", event => selectAdminSection(event.target.closest(".admin-content-tab")));
adminTabList?.addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = Array.from(adminTabList.querySelectorAll(".admin-content-tab")).filter(tab => !tab.hidden);
  const index = tabs.indexOf(event.target);
  if (index < 0) return;
  event.preventDefault();
  const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
});
syncAdminTabs();

function syncEditorLanguageControls() {
  document.querySelectorAll(".editor-language-tabs").forEach(group => {
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", group.querySelector(".announcement-lang-tab") ? "Announcement content language" : "Newsletter content language");
    group.querySelectorAll(".editor-tab").forEach(button => {
      button.setAttribute("aria-pressed", String(button.classList.contains("active")));
      button.setAttribute("lang", button.dataset.editorLang || button.dataset.announcementLang);
    });
  });
}
syncEditorLanguageControls();

// ------------------------------------------------------------
// SERVICE — save directly to live service_settings row
// ------------------------------------------------------------
const serviceFieldIds = [
  "serviceTimeInput",
  "serviceDayEn",
  "serviceDayEs",
  "serviceLabelEn",
  "serviceLabelEs",
  "serviceMessageEn",
  "serviceMessageEs"
];

serviceFieldIds.forEach((id) => {
  const element = document.getElementById(id);
  element.addEventListener("input", updateServicePreview);
  element.addEventListener("change", updateServicePreview);
});

function serviceFormData() {
  const time = document.getElementById("serviceTimeInput").value;
  return {
    time,
    time_display: formatServiceTime(time),
    day_en: document.getElementById("serviceDayEn").value.trim(),
    day_es: document.getElementById("serviceDayEs").value.trim(),
    service_label_en:
      document.getElementById("serviceLabelEn").value.trim(),
    service_label_es:
      document.getElementById("serviceLabelEs").value.trim(),
    special_message_en:
      document.getElementById("serviceMessageEn").value.trim(),
    special_message_es:
      document.getElementById("serviceMessageEs").value.trim()
  };
}

function formatServiceTime(timeValue) {
  if (!timeValue) return "3:00 PM";

  const [hoursString, minutesString] = timeValue.split(":");
  const hours24 = Number(hoursString);
  const minutes = Number(minutesString || "0");

  if (Number.isNaN(hours24) || Number.isNaN(minutes)) {
    return timeValue;
  }

  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function updateServicePreview() {
  const data = serviceFormData();

  document.getElementById("servicePreviewDay").textContent =
    data.day_en || "Sunday";
  document.getElementById("servicePreviewLabel").textContent =
    data.service_label_en || "Sunday Service";
  document.getElementById("servicePreviewTime").textContent =
    data.time_display || "3:00 PM";
  document.getElementById("servicePreviewMessage").textContent =
    data.special_message_en ||
    "We look forward to welcoming you.";
}

async function loadServiceEditor() {
  await runEditorAction("service", document.getElementById("saveServiceButton"), document.getElementById("serviceDraftStatus"), "Loading…", fetchServiceEditor);
}

async function fetchServiceEditor() {
  const generation = adminSessionVersion;
  serviceVersion = null;
  const { data, error } = await withAdminReadTimeout(signal => supabaseClient
    .from("service_settings")
    .select("id,day_en,day_es,service_label_en,service_label_es,service_time,time_display,special_message_en,special_message_es,address,updated_at")
    .abortSignal(signal)
    .eq("id", 1)
    .maybeSingle());
  if (generation !== adminSessionVersion) return;

  if (error) {
    console.error(error);
    document.getElementById("serviceDraftStatus").textContent =
      "Could not load live service settings. Reload this page to try again.";
    return;
  }

  if (!data) return;
  serviceVersion = data.updated_at;

  document.getElementById("serviceTimeInput").value =
    String(data.service_time || "15:00").slice(0, 5);
  document.getElementById("serviceDayEn").value =
    data.day_en || "Sunday";
  document.getElementById("serviceDayEs").value =
    data.day_es || "Domingo";
  document.getElementById("serviceLabelEn").value =
    data.service_label_en || "Sunday Service";
  document.getElementById("serviceLabelEs").value =
    data.service_label_es || "Servicio Dominical";
  document.getElementById("serviceMessageEn").value =
    data.special_message_en || "";
  document.getElementById("serviceMessageEs").value =
    data.special_message_es || "";

  updateServicePreview();
  rememberEditorBaseline("service");
}

// Verification belongs in the primary bundle so a failed optional extension
// cannot fall back to reporting a zero-row update as a successful publication.
async function saveServiceChanges() {
  const generation = adminSessionVersion;
  const button = document.getElementById("saveServiceButton");
  const status = document.getElementById("serviceDraftStatus");
  await runEditorAction("service", button, status, "Saving…", async () => {
    try {
      const form = serviceFormData();
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)) {
        throw new Error("Choose a valid service time before publishing.");
      }
      if (!requireEditorVersion(serviceVersion, status)) return;
      const version = serviceVersion;
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (generation !== adminSessionVersion) return;
      if (userError || !userData?.user || authenticatedAdmin?.id !== userData.user.id) {
        throw new Error("Your admin session could not be verified. Please sign in again.");
      }
      const { data, error } = await supabaseClient.from("service_settings").update({
        day_en: form.day_en,
        day_es: form.day_es,
        service_label_en: form.service_label_en,
        service_label_es: form.service_label_es,
        service_time: form.time,
        time_display: form.time_display,
        special_message_en: form.special_message_en,
        special_message_es: form.special_message_es
      }).eq("id", 1).eq("updated_at", version).select("id,updated_at").maybeSingle();
      if (generation !== adminSessionVersion) return;
      if (error) throw error;
      if (data?.id !== 1) {
        status.textContent = contentConflictMessage;
        return;
      }
      serviceVersion = data.updated_at;
      rememberEditorBaseline("service");
      status.textContent = "Published. The live website now uses these service settings.";
    } catch (error) {
      if (generation !== adminSessionVersion) return;
      console.error("Service publish verification failed:", error);
      status.textContent = `Could not publish service changes: ${error.message || "Check your connection and try again."}`;
    }
  });
}
document.getElementById("saveServiceButton").addEventListener("click", saveServiceChanges);

// ------------------------------------------------------------
// ANNOUNCEMENT MANAGEMENT
// ------------------------------------------------------------
let announcementFilter = "all";

async function loadAnnouncementEditor() {
  await runEditorAction("announcements", document.getElementById("addAnnouncementButton"), document.getElementById("announcementDraftStatus"), "Loading…", fetchAnnouncementEditor);
}

async function fetchAnnouncementEditor() {
  const generation = adminSessionVersion;
  const { data, error } = await withAdminReadTimeout(signal => supabaseClient
    .from("announcements")
    .select("id,active,tag_en,tag_es,title_en,title_es,description_en,description_es,sort_order,created_at,updated_at")
    .abortSignal(signal)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false }));
  if (generation !== adminSessionVersion) return;

  if (error) {
    console.error(error);
    adminAnnouncements = [];
    renderAdminAnnouncementList();
    document.getElementById("adminAnnouncementList").textContent = "Announcements could not be loaded. Reload this page to try again.";
    return;
  }

  adminAnnouncements = data || [];
  renderAdminAnnouncementList();

  if (
    selectedAnnouncementIndex !== null &&
    !adminAnnouncements[selectedAnnouncementIndex]
  ) {
    resetAnnouncementEditor();
  }
}

document.getElementById("announcementFilter").addEventListener("change", (event) => {
  announcementFilter = event.target.value;
  renderAdminAnnouncementList();
});

function filteredAnnouncements() {
  return adminAnnouncements.filter((item) => {
    if (announcementFilter === "active") return item.active === true;
    if (announcementFilter === "hidden") return item.active === false;
    return true;
  });
}

function renderAdminAnnouncementList() {
  const list = document.getElementById("adminAnnouncementList");
  const items = filteredAnnouncements();
  const count = document.getElementById("announcementCount");

  count.textContent = `${items.length} ${items.length === 1 ? "announcement" : "announcements"}`;

  if (!items.length) {
    list.innerHTML = `<div class="empty-management-list">No announcements match this filter.</div>`;
    return;
  }

  list.innerHTML = items.map((item) => {
    const actualIndex = adminAnnouncements.findIndex((candidate) => candidate.id === item.id);
    const status = item.active ? "active" : "hidden";

    return `
      <button
        class="management-list-item ${selectedAnnouncementIndex === actualIndex ? "selected" : ""}"
        type="button"
        data-announcement-index="${actualIndex}">
        <div class="management-list-item-top">
          <span class="status-pill" data-status="${status}">
            ${item.active ? "Live" : "Hidden"}
          </span>
          <span class="tag">${escapeAdminHtml(item.tag_en || "Update")}</span>
        </div>
        <h3>${escapeAdminHtml(item.title_en || "Untitled announcement")}</h3>
        <p>${escapeAdminHtml(item.description_en || "No description")}</p>
      </button>
    `;
  }).join("");

  list.querySelectorAll("[data-announcement-index]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!confirmDiscardEditor("announcements")) return;
      selectAnnouncement(Number(button.dataset.announcementIndex));
      focusEditorHeading("announcements");
    });
  });
}

function selectAnnouncement(index) {
  selectedAnnouncementIndex = index;
  const item = adminAnnouncements[index];
  if (!item) return;
  selectedAnnouncementVersion = item.updated_at;

  document.getElementById("announcementEmptyState").style.display = "none";
  document.getElementById("announcementEditorForm").classList.remove("hidden");

  document.getElementById("announcementId").value = item.id || "";
  document.getElementById("announcementIdLabel").textContent = item.isNew ? "Unsaved" : item.id;
  document.getElementById("announcementTagEn").value = item.tag_en || "";
  document.getElementById("announcementTagEs").value = item.tag_es || "";
  document.getElementById("announcementTitleEn").value = item.title_en || "";
  document.getElementById("announcementTitleEs").value = item.title_es || "";
  document.getElementById("announcementDescriptionEn").value = item.description_en || "";
  document.getElementById("announcementDescriptionEs").value = item.description_es || "";
  document.getElementById("announcementEditorHeading").textContent =
    item.isNew ? "New Announcement" : "Edit Announcement";

  updateAnnouncementStatusUI(item);
  document.getElementById("announcementDraftStatus").textContent = "";
  renderAdminAnnouncementList();
  rememberEditorBaseline("announcements");
}

function updateAnnouncementStatusUI(item) {
  const badge = document.getElementById("announcementStatusBadge");
  const toggleButton = document.getElementById("toggleAnnouncementVisibilityButton");

  const status = item.active ? "active" : "hidden";
  badge.dataset.status = status;
  badge.textContent = item.active ? "Live" : "Hidden";
  toggleButton.textContent = item.active ? "Hide Announcement" : "Publish Announcement";
}

document.getElementById("addAnnouncementButton").addEventListener("click", (event) => {
  if (!confirmDiscardEditor("announcements")) {
    event.stopImmediatePropagation();
    return;
  }
  const newAnnouncement = {
    id: `announcement-${Date.now()}`,
    active: false,
    tag_en: "Update",
    tag_es: "Actualización",
    title_en: "New Announcement",
    title_es: "Nuevo Anuncio",
    description_en: "",
    description_es: "",
    sort_order:
      adminAnnouncements.length > 0
        ? Math.max(...adminAnnouncements.map((item) => Number(item.sort_order) || 0)) + 10
        : 10,
    isNew: true
  };

  adminAnnouncements.unshift(newAnnouncement);
  announcementFilter = "all";
  document.getElementById("announcementFilter").value = "all";
  selectAnnouncement(0);
  focusEditorHeading("announcements");
});

document.querySelectorAll(".announcement-lang-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const lang = tab.dataset.announcementLang;

    document.querySelectorAll(".announcement-lang-tab").forEach((item) => {
      item.classList.toggle("active", item === tab);
    });

    document.querySelectorAll(".announcement-lang-panel").forEach((panel) => {
      panel.classList.toggle(
        "active",
        panel.dataset.announcementPanel === lang
      );
    });
    syncEditorLanguageControls();
  });
});

function announcementFormPayload(activeOverride = null) {
  const existing = adminAnnouncements[selectedAnnouncementIndex];

  return {
    id:
      document.getElementById("announcementId").value ||
      `announcement-${Date.now()}`,
    active:
      activeOverride !== null
        ? activeOverride
        : Boolean(existing?.active),
    tag_en: document.getElementById("announcementTagEn").value.trim(),
    tag_es: document.getElementById("announcementTagEs").value.trim(),
    title_en: document.getElementById("announcementTitleEn").value.trim(),
    title_es: document.getElementById("announcementTitleEs").value.trim(),
    description_en: document
      .getElementById("announcementDescriptionEn")
      .value.trim(),
    description_es: document
      .getElementById("announcementDescriptionEs")
      .value.trim(),
    sort_order: Number(existing?.sort_order) || 10,

  };
}

async function saveAnnouncement(activeOverride = null) {
  if (!authenticatedAdmin || selectedAnnouncementIndex === null) return null;
  const generation = adminSessionVersion;

  const status = document.getElementById("announcementDraftStatus");
  const payload = announcementFormPayload(activeOverride);

  if (!payload.title_en || !payload.title_es) {
    status.textContent = "Add both the English and Spanish titles before saving.";
    return null;
  }

  // Creating and editing have different conflict semantics. A stale editor
  // must never recreate a row that another administrator has deleted.
  const isNew = adminAnnouncements[selectedAnnouncementIndex]?.isNew;
  if (!isNew && !requireEditorVersion(selectedAnnouncementVersion, status)) return null;
  const table = supabaseClient.from("announcements");
  const write = isNew
    ? table.insert(payload)
    : table.update(payload).eq("id", payload.id).eq("updated_at", selectedAnnouncementVersion);
  const { data, error } = await write
    .select("id,active,updated_at")
    .single();
  if (generation !== adminSessionVersion) return null;

  if (error) {
    console.error(error);
    status.textContent = !isNew && error.code === "PGRST116"
      ? `Could not save announcement. ${contentConflictMessage}`
      : error.code === "23505"
      ? "An announcement with this ID already exists. Reload the list before saving again."
      : `Could not save announcement: ${error.message}`;
    return null;
  }

  const currentId = adminAnnouncements[selectedAnnouncementIndex]?.id;
  const savedIndex = adminAnnouncements.findIndex(item => item.id === payload.id);
  if (savedIndex < 0) return null;
  const saved = { ...payload, ...data };
  adminAnnouncements[savedIndex] = saved;
  if (currentId === payload.id) selectAnnouncement(savedIndex);
  else {
    selectedAnnouncementIndex = adminAnnouncements.findIndex(item => item.id === currentId);
    if (selectedAnnouncementIndex < 0) selectedAnnouncementIndex = null;
    renderAdminAnnouncementList();
  }
  // A late response must never claim that a different open draft was saved.
  return currentId === payload.id ? saved : null;
}

document.getElementById("saveAnnouncementButton").addEventListener("click", async () => {
  const button = document.getElementById("saveAnnouncementButton");
  const status = document.getElementById("announcementDraftStatus");
  await runEditorAction("announcements", button, status, "Saving…", async () => {
    const saved = await saveAnnouncement();
    if (saved) status.textContent = saved.active
      ? "Saved. Changes are live on the website."
      : "Saved as hidden. Visitors cannot see this announcement.";
  });
});

document
  .getElementById("toggleAnnouncementVisibilityButton")
  .addEventListener("click", async () => {
    if (selectedAnnouncementIndex === null) return;

    const item = adminAnnouncements[selectedAnnouncementIndex];
    const button = document.getElementById("toggleAnnouncementVisibilityButton");
    const nextActive = !item.active;

    const status = document.getElementById("announcementDraftStatus");
    await runEditorAction("announcements", button, status, nextActive ? "Publishing…" : "Hiding…", async () => {
      const saved = await saveAnnouncement(nextActive);
      if (saved) {
        announcementFilter = "all";
        document.getElementById("announcementFilter").value = "all";
        renderAdminAnnouncementList();
        status.textContent = saved.active
          ? "Published. This announcement is now live."
          : "Hidden. This announcement is no longer public.";
      }
    });
  });

document.getElementById("deleteAnnouncementButton").addEventListener("click", async () => {
  if (!authenticatedAdmin || selectedAnnouncementIndex === null) return;
  const generation = adminSessionVersion;

  const item = adminAnnouncements[selectedAnnouncementIndex];

  if (item.isNew) {
    adminAnnouncements.splice(selectedAnnouncementIndex, 1);
    resetAnnouncementEditor();
    renderAdminAnnouncementList();
    return;
  }

  const confirmed = window.confirm(
    `Delete "${item.title_en}" permanently?`
  );

  if (!confirmed) return;

  const button = document.getElementById("deleteAnnouncementButton");
  const status = document.getElementById("announcementDraftStatus");
  const version = selectedAnnouncementVersion;
  if (!requireEditorVersion(version, status)) return;
  await runEditorAction("announcements", button, status, "Deleting…", async () => {
    const { data, error } = await supabaseClient.from("announcements")
      .delete().eq("id", item.id).eq("updated_at", version).select("id").maybeSingle();
    if (generation !== adminSessionVersion) return;
    if (error || data?.id !== item.id) {
      status.textContent = error
        ? "The announcement was not deleted. Check your connection and try again."
        : `The announcement was not deleted. ${contentConflictMessage}`;
      return;
    }
    const currentId = adminAnnouncements[selectedAnnouncementIndex]?.id;
    adminAnnouncements = adminAnnouncements.filter(announcement => announcement.id !== item.id);
    if (currentId === item.id) resetAnnouncementEditor();
    else {
      selectedAnnouncementIndex = adminAnnouncements.findIndex(announcement => announcement.id === currentId);
      if (selectedAnnouncementIndex < 0) selectedAnnouncementIndex = null;
    }
    renderAdminAnnouncementList();
  });
});

function resetAnnouncementEditor() {
  selectedAnnouncementIndex = null;
  selectedAnnouncementVersion = null;
  editorBaselines.delete("announcements");
  updateUnloadGuard();
  document.getElementById("announcementEditorForm").classList.add("hidden");
  document.getElementById("announcementEmptyState").style.display = "grid";
}

// ------------------------------------------------------------
// NEWSLETTER MANAGEMENT
// ------------------------------------------------------------
let adminNewsletters = [];
let selectedNewsletterId = null;
let selectedNewsletterIsNew = false;
let selectedNewsletterVersion = null;
let newsletterFilter = "all";
let newsletterSelectionVersion = 0;

async function loadNewsletterEditor() {
  await runEditorAction("newsletter", document.getElementById("newNewsletterButton"), document.getElementById("draftStatus"), "Loading…", fetchNewsletterEditor);
}

async function fetchNewsletterEditor() {
  const generation = adminSessionVersion;
  const { data, error } = await withAdminReadTimeout(signal => supabaseClient
    .from("newsletters")
    .select("id,issue_date,status,title_en,title_es,gathering_en,gathering_es,scripture_en,scripture_es,community_en,community_es,optional_sections,published_at,created_at,updated_at")
    .abortSignal(signal)
    .order("issue_date", { ascending: false }));
  if (generation !== adminSessionVersion) return;

  if (error) {
    console.error(error);
    adminNewsletters = [];
    renderAdminNewsletterList();
    document.getElementById("adminNewsletterList").textContent = "Newsletters could not be loaded. Reload this page to try again.";
    return;
  }

  adminNewsletters = data || [];
  renderAdminNewsletterList();

  if (selectedNewsletterId) {
    const stillExists = adminNewsletters.some((item) => item.id === selectedNewsletterId);
    if (!stillExists) resetNewsletterEditor();
  }
}

document.getElementById("newsletterFilter").addEventListener("change", (event) => {
  newsletterFilter = event.target.value;
  renderAdminNewsletterList();
});

function filteredNewsletters() {
  if (newsletterFilter === "all") return adminNewsletters;
  return adminNewsletters.filter((item) => item.status === newsletterFilter);
}

function renderAdminNewsletterList() {
  const list = document.getElementById("adminNewsletterList");
  const items = filteredNewsletters();
  const count = document.getElementById("newsletterCount");

  count.textContent = `${items.length} ${items.length === 1 ? "newsletter" : "newsletters"}`;

  if (!items.length) {
    list.innerHTML = `<div class="empty-management-list">No newsletters match this filter.</div>`;
    return;
  }

  list.innerHTML = items.map((item) => `
    <button
      class="management-list-item ${selectedNewsletterId === item.id ? "selected" : ""}"
      type="button"
      data-newsletter-id="${escapeAdminHtml(item.id)}">
      <div class="management-list-item-top">
        <span class="status-pill" data-status="${escapeAdminHtml(item.status)}">
          ${newsletterStatusLabel(item.status)}
        </span>
        <span class="management-list-date">${formatDate(item.issue_date, "en")}</span>
      </div>
      <h3>${escapeAdminHtml(item.title_en || "Untitled newsletter")}</h3>
      <p>${item.status === "published" ? "Visible on the public newsletter page" : "Private in the admin portal"}</p>
    </button>
  `).join("");

  list.querySelectorAll("[data-newsletter-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!confirmDiscardEditor("newsletter")) return;
      selectNewsletter(button.dataset.newsletterId);
      focusEditorHeading("newsletter");
    });
  });
}

function newsletterStatusLabel(status) {
  if (status === "published") return "Published";
  if (status === "ready") return "Ready";
  return "Draft";
}

function selectNewsletter(id) {
  const item = adminNewsletters.find((newsletter) => newsletter.id === id);
  if (!item) return;
  ++newsletterSelectionVersion;

  selectedNewsletterId = item.id;
  selectedNewsletterIsNew = false;
  selectedNewsletterVersion = item.updated_at;

  document.getElementById("newsletterEmptyState").style.display = "none";
  document.getElementById("newsletterEditorForm").classList.remove("hidden");

  document.getElementById("issueDate").value = item.issue_date;
  document.getElementById("issueDate").readOnly = true;
  document.getElementById("issueDateHelper").textContent =
    "The issue date is locked after the first save.";
  document.getElementById("issueStatus").value = item.status;
  document.getElementById("titleEn").value = item.title_en || "";
  document.getElementById("titleEs").value = item.title_es || "";
  document.getElementById("gatheringEn").value = item.gathering_en || "";
  document.getElementById("gatheringEs").value = item.gathering_es || "";
  document.getElementById("scriptureEn").value = item.scripture_en || "";
  document.getElementById("scriptureEs").value = item.scripture_es || "";
  document.getElementById("communityEn").value = item.community_en || "";
  document.getElementById("communityEs").value = item.community_es || "";

  updateNewsletterStatusUI(item.status);
  updateNewsletterPreview();
  document.getElementById("draftStatus").textContent = "";
  renderAdminNewsletterList();
  rememberEditorBaseline("newsletter");
}

document.getElementById("newNewsletterButton").addEventListener("click", (event) => {
  if (!confirmDiscardEditor("newsletter")) {
    event.stopImmediatePropagation();
    return;
  }
  ++newsletterSelectionVersion;
  selectedNewsletterId = null;
  selectedNewsletterIsNew = true;
  selectedNewsletterVersion = null;

  document.getElementById("newsletterEmptyState").style.display = "none";
  document.getElementById("newsletterEditorForm").classList.remove("hidden");
  document.getElementById("issueDate").readOnly = false;
  document.getElementById("issueDate").value = "";
  document.getElementById("issueDateHelper").textContent =
    "Choose the issue date. It becomes the permanent ID after the first save.";
  document.getElementById("issueStatus").value = "draft";
  document.getElementById("titleEn").value = "This Week at Ministerio Cristiano Shekinah";
  document.getElementById("titleEs").value = "Esta Semana en Ministerio Cristiano Shekinah";
  document.getElementById("gatheringEn").value =
    "Join us this Sunday at 3:00 PM for worship and fellowship.";
  document.getElementById("gatheringEs").value =
    "Acompáñanos este domingo a las 3:00 PM para un tiempo de adoración y comunión.";
  document.getElementById("scriptureEn").value = "";
  document.getElementById("scriptureEs").value = "";
  document.getElementById("communityEn").value = "";
  document.getElementById("communityEs").value = "";

  updateNewsletterStatusUI("draft");
  updateNewsletterPreview();
  document.getElementById("draftStatus").textContent = "New unsaved draft.";
  renderAdminNewsletterList();
  rememberEditorBaseline("newsletter");
  focusEditorHeading("newsletter");
});

document.querySelectorAll("[data-editor-lang]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const lang = tab.dataset.editorLang;

    document.querySelectorAll("[data-editor-lang]").forEach((item) => {
      item.classList.toggle("active", item === tab);
    });

    document.querySelectorAll(".editor-language-panel").forEach((panel) => {
      panel.classList.toggle(
        "active",
        panel.dataset.editorPanel === lang
      );
    });

    syncEditorLanguageControls();
    updateNewsletterPreview();
  });
});

[
  "issueDate",
  "titleEn",
  "gatheringEn",
  "scriptureEn",
  "communityEn",
  "titleEs",
  "gatheringEs",
  "scriptureEs",
  "communityEs"
].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateNewsletterPreview);
  document.getElementById(id).addEventListener("change", updateNewsletterPreview);
});

function activeEditorLanguage() {
  return (
    document.querySelector("[data-editor-lang].active")
      ?.dataset.editorLang || "en"
  );
}

function newsletterFormData() {
  return {
    issue_date: document.getElementById("issueDate").value,
    title_en: document.getElementById("titleEn").value.trim(),
    title_es: document.getElementById("titleEs").value.trim(),
    gathering_en: document.getElementById("gatheringEn").value.trim(),
    gathering_es: document.getElementById("gatheringEs").value.trim(),
    scripture_en: document.getElementById("scriptureEn").value.trim(),
    scripture_es: document.getElementById("scriptureEs").value.trim(),
    community_en: document.getElementById("communityEn").value.trim(),
    community_es: document.getElementById("communityEs").value.trim()
  };
}

function updateNewsletterStatusUI(status) {
  document.getElementById("issueStatus").value = status;

  const badge = document.getElementById("newsletterStatusBadge");
  badge.dataset.status = status;
  badge.textContent = newsletterStatusLabel(status);

  const publishButton = document.getElementById("publishButton");
  const unpublishButton = document.getElementById("unpublishNewsletterButton");
  const saveButton = document.getElementById("saveNewsletterButton");

  publishButton.textContent =
    status === "published" ? "Update Published Newsletter" : "Publish Newsletter";
  unpublishButton.style.display = status === "published" ? "" : "none";
  saveButton.textContent =
    status === "published" ? "Save Live Changes" : "Save Changes";
}

function updateNewsletterPreview() {
  const lang = activeEditorLanguage();
  document.querySelector(".preview-newsletter")?.setAttribute("lang", lang);
  const isSpanish = lang === "es";
  const data = newsletterFormData();

  document.getElementById("previewTitle").textContent =
    (isSpanish ? data.title_es : data.title_en) ||
    (isSpanish ? "Boletín de Ministerio Cristiano Shekinah" : "Ministerio Cristiano Shekinah Newsletter");

  document.getElementById("previewGatheringHeading").textContent =
    isSpanish ? "Reunión del Domingo" : "Sunday Gathering";
  document.getElementById("previewScriptureHeading").textContent =
    isSpanish ? "Escritura de la Semana" : "Weekly Scripture";
  document.getElementById("previewCommunityHeading").textContent =
    isSpanish ? "Actualización de la Comunidad" : "Community Update";

  document.getElementById("previewGathering").textContent =
    (isSpanish ? data.gathering_es : data.gathering_en) ||
    (isSpanish ? "El contenido aparecerá aquí." : "Your content will appear here.");
  document.getElementById("previewScripture").textContent =
    (isSpanish ? data.scripture_es : data.scripture_en) ||
    (isSpanish ? "La escritura aparecerá aquí." : "Your scripture will appear here.");
  document.getElementById("previewCommunity").textContent =
    (isSpanish ? data.community_es : data.community_en) ||
    (isSpanish ? "La actualización aparecerá aquí." : "Your community update will appear here.");

  document.getElementById("previewDate").textContent =
    data.issue_date
      ? formatDate(data.issue_date, lang)
      : isSpanish
      ? "Boletín en borrador"
      : "Draft issue";
}

function formatDate(dateString, language) {
  if (!dateString) return "No date";

  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat(
    language === "es" ? "es-US" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  ).format(date);
}

function validateNewsletterForm() {
  const data = newsletterFormData();
  const status = document.getElementById("draftStatus");

  if (!data.issue_date) {
    status.textContent = "Choose an issue date first.";
    return null;
  }

  if (!data.title_en || !data.title_es) {
    status.textContent = "Add both the English and Spanish newsletter titles.";
    return null;
  }

  return data;
}

async function persistNewsletter(targetStatus = null) {
  if (!authenticatedAdmin || (!selectedNewsletterId && !selectedNewsletterIsNew)) return null;
  const generation = adminSessionVersion;
  const selectionVersion = newsletterSelectionVersion;

  const data = validateNewsletterForm();
  if (!data) return null;

  const currentStatus = document.getElementById("issueStatus").value || "draft";
  const status = targetStatus || currentStatus;
  const id = selectedNewsletterId || data.issue_date;

  if (selectedNewsletterIsNew) {
    const dateConflict = adminNewsletters.some((item) => item.issue_date === data.issue_date);
    if (dateConflict) {
      document.getElementById("draftStatus").textContent =
        "A newsletter already exists for that issue date.";
      return null;
    }
  }

  const existing = adminNewsletters.find((item) => item.id === selectedNewsletterId);

  const payload = {
    id,
    issue_date: data.issue_date,
    status,
    title_en: data.title_en,
    title_es: data.title_es,
    gathering_en: data.gathering_en,
    gathering_es: data.gathering_es,
    scripture_en: data.scripture_en,
    scripture_es: data.scripture_es,
    community_en: data.community_en,
    community_es: data.community_es,
    // The optional-section editor supplies data, not a second save implementation.
    optional_sections: window.SHEKINAH_NEWSLETTER_EDITOR?.collect() ?? existing?.optional_sections ?? [],
    published_at:
      status === "published"
        ? existing?.published_at || new Date().toISOString()
        : null
  };

  // An insert lets the database reject a concurrently created issue; an
  // update requires the selected issue to still exist. Do not upsert here.
  const isNew = selectedNewsletterIsNew;
  if (!isNew && !requireEditorVersion(selectedNewsletterVersion, document.getElementById("draftStatus"))) return null;
  const table = supabaseClient.from("newsletters");
  const write = isNew
    ? table.insert(payload)
    : table.update(payload).eq("id", id).eq("updated_at", selectedNewsletterVersion);
  const { data: saved, error } = await write
    .select("id,status,updated_at")
    .single();
  if (generation !== adminSessionVersion) return null;

  if (error) {
    console.error(error);
    document.getElementById("draftStatus").textContent = !isNew && error.code === "PGRST116"
      ? `Could not save newsletter. ${contentConflictMessage}`
      : error.code === "23505"
      ? "A newsletter already exists for that issue date. Reload the list to edit it."
      : `Could not save newsletter: ${error.message}`;
    return null;
  }

  // Keep the exact server timestamp. Parsing it as a JavaScript Date would
  // discard PostgreSQL's microseconds and weaken the next conflict check.
  const index = adminNewsletters.findIndex(item => item.id === saved.id);
  const savedItem = { ...existing, ...payload, ...saved, updated_at: saved.updated_at };
  if (index >= 0) adminNewsletters[index] = savedItem;
  else adminNewsletters.push(savedItem);
  adminNewsletters.sort((a, b) => b.issue_date.localeCompare(a.issue_date));
  if (selectionVersion !== newsletterSelectionVersion) {
    renderAdminNewsletterList();
    return null;
  }
  selectNewsletter(saved.id);
  return saved;
}

document.getElementById("saveNewsletterButton").addEventListener("click", async () => {
  const button = document.getElementById("saveNewsletterButton");
  const status = document.getElementById("draftStatus");
  await runEditorAction("newsletter", button, status, "Saving…", async () => {
    const saved = await persistNewsletter();
    if (saved) status.textContent = saved.status === "published"
      ? "Saved. Your changes are live."
      : "Saved privately in Supabase.";
  });
});

document.getElementById("publishButton").addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Publish this newsletter to the public website?"
  );

  if (!confirmed) return;

  const button = document.getElementById("publishButton");
  const status = document.getElementById("draftStatus");
  await runEditorAction("newsletter", button, status, "Publishing…", async () => {
    const saved = await persistNewsletter("published");
    if (saved) status.textContent = "Published. This newsletter is now public.";
  });
});

document
  .getElementById("unpublishNewsletterButton")
  .addEventListener("click", async () => {
    if (!selectedNewsletterId) return;

    const confirmed = window.confirm(
      "Unpublish this newsletter? It will disappear from the public website but remain saved in the admin portal."
    );

    if (!confirmed) return;

    const button = document.getElementById("unpublishNewsletterButton");
    const status = document.getElementById("draftStatus");
    await runEditorAction("newsletter", button, status, "Unpublishing…", async () => {
      const saved = await persistNewsletter("ready");
      if (saved) status.textContent = "Unpublished. The issue is now private and marked Ready.";
    });
  });

document.getElementById("deleteNewsletterButton").addEventListener("click", async () => {
  if (!authenticatedAdmin) return;
  const generation = adminSessionVersion;
  if (selectedNewsletterIsNew) {
    resetNewsletterEditor();
    return;
  }

  if (!selectedNewsletterId) return;
  const deletedId = selectedNewsletterId;
  const selectionVersion = newsletterSelectionVersion;

  const item = adminNewsletters.find((newsletter) => newsletter.id === selectedNewsletterId);
  const confirmed = window.confirm(
    `Delete "${item?.title_en || "this newsletter"}" permanently?`
  );

  if (!confirmed) return;

  const button = document.getElementById("deleteNewsletterButton");
  const status = document.getElementById("draftStatus");
  const version = selectedNewsletterVersion;
  if (!requireEditorVersion(version, status)) return;
  await runEditorAction("newsletter", button, status, "Deleting…", async () => {
    const { data, error } = await supabaseClient.from("newsletters")
      .delete().eq("id", deletedId).eq("updated_at", version).select("id").maybeSingle();
    if (generation !== adminSessionVersion) return;
    if (error || data?.id !== deletedId) {
      status.textContent = error
        ? "The newsletter was not deleted. Check your connection and try again."
        : `The newsletter was not deleted. ${contentConflictMessage}`;
      return;
    }
    adminNewsletters = adminNewsletters.filter(newsletter => newsletter.id !== deletedId);
    if (selectionVersion === newsletterSelectionVersion) resetNewsletterEditor();
    else renderAdminNewsletterList();
  });
});

function resetNewsletterEditor() {
  ++newsletterSelectionVersion;
  selectedNewsletterId = null;
  selectedNewsletterIsNew = false;
  selectedNewsletterVersion = null;
  document.getElementById("newsletterEditorForm").classList.add("hidden");
  editorBaselines.delete("newsletter");
  updateUnloadGuard();
  document.getElementById("newsletterEmptyState").style.display = "grid";
  renderAdminNewsletterList();
}

function escapeAdminHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

initializeAuth();

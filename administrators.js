/* Owner-only administrator management for Ministerio Cristiano Shekinah. */
(function () {
  const FUNCTION_NAME = "admin-users";
  let ownerClient = null;
  let currentUser = null;
  let adminRows = [];
  let ownerGeneration = 0;
  let listVersion = 0;
  let invitationOperation = null;

  function injectInterface() {
    const nav = document.querySelector(".admin-content-tabs");
    const dashboard = document.getElementById("adminDashboard");
    const backendNote = dashboard?.querySelector(".admin-backend-note");
    if (!nav || !dashboard || document.getElementById("administratorsTab")) return;

    const tab = document.createElement("button");
    tab.className = "admin-content-tab owner-only-tab";
    tab.id = "administratorsTab";
    tab.type = "button";
    tab.dataset.adminSection = "administrators";
    tab.hidden = true;
    tab.textContent = "Administrators";
    nav.appendChild(tab);

    const panel = document.createElement("section");
    panel.className = "admin-content-section owner-only-panel";
    panel.id = "administratorsPanel";
    panel.dataset.adminPanel = "administrators";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="section-admin-heading">
        <div>
          <p class="eyebrow">Owner controls</p>
          <h2>Administrators</h2>
          <p>Manage who can sign in to the Ministerio Cristiano Shekinah admin portal.</p>
        </div>
        <button class="button admin-button-secondary" id="refreshAdministratorsButton" type="button">Refresh</button>
      </div>

      <div class="administrator-layout">
        <div class="administrator-card">
          <h3>Add Administrator</h3>
          <p>Invite someone by email. New people are added as content administrators by default.</p>
          <form class="administrator-form" id="inviteAdministratorForm">
            <label>
              Email address
              <input id="newAdministratorEmail" type="email" autocomplete="email" placeholder="name@example.com" required />
            </label>
            <button class="button button-primary" type="submit">Send Invitation</button>
          </form>
          <p class="administrator-status" id="administratorInviteStatus" role="status" aria-live="polite"></p>
          <div class="administrator-warning">
            Owner controls run through a protected Supabase Edge Function. Secret database credentials are never stored in this website.
          </div>
        </div>

        <div class="administrator-card">
          <h3>Administrator Access</h3>
          <p>Owners can manage access. Admins can edit church content but cannot manage administrators.</p>
          <p class="administrator-status" id="administratorListStatus" role="status" aria-live="polite"></p>
          <div class="administrator-list" id="administratorList"></div>
        </div>
      </div>
    `;

    if (backendNote) dashboard.insertBefore(panel, backendNote);
    else dashboard.appendChild(panel);

    tab.addEventListener("click", loadAdministrators);
    if (typeof syncAdminTabs === "function") syncAdminTabs();

    document.getElementById("refreshAdministratorsButton").addEventListener("click", loadAdministrators);
    document.getElementById("inviteAdministratorForm").addEventListener("submit", inviteAdministrator);
  }

  async function invokeAdminFunction(body) {
    if (!ownerClient || !currentUser || authenticatedAdmin?.id !== currentUser.id) throw new Error("Please verify your Owner session again.");
    const { data, error } = await ownerClient.functions.invoke(FUNCTION_NAME, { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function loadAdministrators() {
    const list = document.getElementById("administratorList");
    const status = document.getElementById("administratorListStatus");
    if (!list || !status) return;
    if (!ownerClient || !currentUser || authenticatedAdmin?.id !== currentUser.id) {
      clearOwnerInterface();
      return;
    }
    const generation = ownerGeneration;
    const version = ++listVersion;

    status.textContent = "Loading administrators…";
    try {
      const data = await invokeAdminFunction({ action: "list" });
      if (generation !== ownerGeneration || version !== listVersion) return;
      adminRows = data?.admins || [];
      status.textContent = `${adminRows.length} ${adminRows.length === 1 ? "administrator" : "administrators"}`;
      renderAdministrators();
    } catch (error) {
      if (generation !== ownerGeneration || version !== listVersion) return;
      console.error("Administrator list failed:", error);
      list.innerHTML = "";
      status.textContent = "Administrator management is not available yet. Deploy the admin-users Edge Function after applying the role migration.";
    }
  }

  function renderAdministrators() {
    const list = document.getElementById("administratorList");
    if (!list) return;

    if (!adminRows.length) {
      list.innerHTML = '<div class="administrator-empty">No administrators found.</div>';
      return;
    }

    list.innerHTML = "";
    adminRows.forEach((admin) => {
      const isCurrentUser = admin.id === currentUser?.id;
      const item = document.createElement("div");
      item.className = "administrator-item";
      item.dataset.administratorId = admin.id;

      const identity = document.createElement("div");
      identity.className = "administrator-identity";
      const email = document.createElement("strong");
      email.textContent = admin.email || admin.id;
      const meta = document.createElement("div");
      meta.className = "administrator-meta";
      meta.textContent = isCurrentUser ? "You · Full portal access" : "Authorized portal account";
      const role = document.createElement("span");
      role.className = `administrator-role ${admin.role === "owner" ? "owner" : ""}`;
      role.textContent = admin.role === "owner" ? "Owner" : "Admin";
      identity.append(email, meta, role);

      const actions = document.createElement("div");
      actions.className = "administrator-actions";

      const select = document.createElement("select");
      select.setAttribute("aria-label", `Role for ${admin.email || admin.id}`);
      ["admin", "owner"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value === "owner" ? "Owner" : "Admin";
        option.selected = admin.role === value;
        select.appendChild(option);
      });
      select.disabled = isCurrentUser;
      select.title = isCurrentUser
        ? "Your own Owner role cannot be changed from this page."
        : "Change administrator role";
      select.addEventListener("change", async () => {
        const generation = ownerGeneration;
        const previousRole = admin.role;
        const hadFocus = document.activeElement === select;
        select.disabled = true;
        try {
          await invokeAdminFunction({ action: "set-role", userId: admin.id, role: select.value });
          if (generation !== ownerGeneration) return;
          await loadAdministrators();
          restoreAdministratorFocus(admin.id, "select", hadFocus, generation);
        } catch (error) {
          if (generation !== ownerGeneration) return;
          console.error(error);
          select.value = previousRole;
          window.alert(error.message || "Could not change this administrator's role.");
        } finally {
          select.disabled = isCurrentUser;
        }
      });

      const remove = document.createElement("button");
      remove.className = "button danger-button";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.disabled = isCurrentUser;
      remove.title = isCurrentUser ? "You cannot remove your own Owner access here." : "Remove administrator access";
      remove.addEventListener("click", async () => {
        const generation = ownerGeneration;
        const hadFocus = document.activeElement === remove;
        if (!window.confirm(`Remove administrator access for ${admin.email || "this account"}?`)) return;
        remove.disabled = true;
        try {
          await invokeAdminFunction({ action: "remove", userId: admin.id });
          if (generation !== ownerGeneration) return;
          await loadAdministrators();
          restoreAdministratorFocus(admin.id, "button", hadFocus, generation);
        } catch (error) {
          if (generation !== ownerGeneration) return;
          console.error(error);
          window.alert(error.message || "Could not remove this administrator.");
          remove.disabled = false;
        }
      });

      actions.append(select, remove);
      item.append(identity, actions);
      list.appendChild(item);
    });
  }

  function restoreAdministratorFocus(userId, selector, hadFocus, generation) {
    const panel = document.getElementById("administratorsPanel");
    if (!hadFocus || generation !== ownerGeneration || !panel?.classList.contains("active") || document.activeElement !== document.body) return;
    const row = Array.from(panel.querySelectorAll(".administrator-item")).find(item => item.dataset.administratorId === userId);
    const target = row?.querySelector(selector) || document.getElementById("refreshAdministratorsButton");
    target?.focus({ preventScroll: true });
  }

  async function inviteAdministrator(event) {
    event.preventDefault();
    if (invitationOperation) return;
    const generation = ownerGeneration;
    const emailInput = document.getElementById("newAdministratorEmail");
    const status = document.getElementById("administratorInviteStatus");
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const email = emailInput.value.trim().toLowerCase();
    if (!email) return;

    const form = event.currentTarget;
    const hadFocus = document.activeElement === button || document.activeElement === emailInput;
    const operation = {
      release() {
        if (invitationOperation !== operation) return;
        invitationOperation = null;
        emailInput.disabled = false;
        button.disabled = false;
        button.textContent = "Send Invitation";
        form.setAttribute("aria-busy", "false");
        if (generation === ownerGeneration && hadFocus && document.activeElement === document.body && document.getElementById("administratorsPanel").classList.contains("active")) {
          emailInput.focus({ preventScroll: true });
        }
      }
    };
    invitationOperation = operation;
    emailInput.disabled = true;
    button.disabled = true;
    button.textContent = "Sending…";
    form.setAttribute("aria-busy", "true");
    status.textContent = "";

    try {
      const result = await invokeAdminFunction({ action: "invite", email });
      if (generation !== ownerGeneration) return;
      emailInput.value = "";
      if (result?.alreadyAuthorized) {
        status.textContent = `That account already has ${result.role === "owner" ? "Owner" : "Admin"} access.`;
      } else if (result?.invited) {
        status.textContent = "Invitation sent. The account has been added as an Admin.";
      } else {
        status.textContent = "Existing Supabase account authorized as an Admin.";
      }
      await loadAdministrators();
    } catch (error) {
      if (generation !== ownerGeneration) return;
      console.error(error);
      status.textContent = error.message || "Could not add this administrator.";
    } finally {
      operation.release();
    }
  }

  function clearOwnerInterface() {
    ++ownerGeneration;
    ++listVersion;
    invitationOperation?.release();
    currentUser = null;
    ownerClient = null;
    adminRows = [];
    const tab = document.getElementById("administratorsTab");
    const panel = document.getElementById("administratorsPanel");
    if (tab) tab.hidden = true;
    if (panel) panel.hidden = true;
    document.getElementById("administratorList")?.replaceChildren();
    ["administratorListStatus", "administratorInviteStatus"].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = "";
    });
    const email = document.getElementById("newAdministratorEmail");
    if (email) email.value = "";
    if (tab?.classList.contains("active") && typeof selectAdminSection === "function") {
      selectAdminSection(document.querySelector('[data-admin-section="service"]'));
    }
    if (typeof syncAdminTabs === "function") syncAdminTabs();
  }

  async function refreshOwnerAccess() {
    clearOwnerInterface();
    const generation = ownerGeneration;
    if (typeof supabaseClient === "undefined" || !supabaseClient || !authenticatedAdmin) return;
    ownerClient = supabaseClient;
    try {
      const { data, error: userError } = await ownerClient.auth.getUser();
      if (generation !== ownerGeneration || userError || !data?.user || authenticatedAdmin?.id !== data.user.id) return;
      const verifiedUser = data.user;
      const { data: membership, error } = await ownerClient
        .from("admin_users")
        .select("user_id, role")
        .eq("user_id", verifiedUser.id)
        .maybeSingle();
      if (generation !== ownerGeneration || error || membership?.role !== "owner" || authenticatedAdmin?.id !== verifiedUser.id) return;
      currentUser = verifiedUser;
      document.getElementById("administratorsTab").hidden = false;
      document.getElementById("administratorsPanel").hidden = false;
      if (typeof syncAdminTabs === "function") syncAdminTabs();
    } catch (error) {
      // The owner interface stays hidden if verification is unavailable.
      console.error("Owner verification failed:", error);
    }
  }

  function initializeOwnerManagement() {
    injectInterface();
    window.SHEKINAH_OWNER = { clear: clearOwnerInterface, refresh: refreshOwnerAccess };
    refreshOwnerAccess();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeOwnerManagement, { once: true });
  } else {
    initializeOwnerManagement();
  }
})();

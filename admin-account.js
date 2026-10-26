/* Password setup uses the portal's existing verified identity and Auth client.
 * No administrator permissions, auth settings, or other accounts are changed. */
(() => {
  "use strict";
  const tab = document.getElementById("accountTab");
  const form = document.getElementById("accountPasswordForm");
  if (!tab || !form) return;
  const current = document.getElementById("accountCurrentPassword");
  const password = document.getElementById("accountNewPassword");
  const confirm = document.getElementById("accountConfirmPassword");
  const reveal = document.getElementById("accountShowPasswords");
  const status = document.getElementById("accountPasswordStatus");
  const submit = document.getElementById("accountSavePassword");
  const reauth = document.getElementById("accountReauthentication");
  const nonce = document.getElementById("accountVerificationCode");
  const sendCode = document.getElementById("accountSendCode");
  let host = null;
  let userId = null;
  let revision = 0;
  let pending = null;
  // A link type only selects a screen after server identity and membership
  // verification. It never grants access or submits a password automatically.
  const linkFlags = (() => {
    const parameters = new URLSearchParams(window.location.hash.slice(1));
    return { intent: ["invite", "recovery"].includes(parameters.get("type")), error: parameters.has("error") || parameters.has("error_code") };
  })();
  let linkIntent = linkFlags.intent;
  let linkError = linkFlags.error;
  let linkUserId = null;

  function clearFields() {
    for (const field of [current, password, confirm]) {
      field.value = "";
      field.type = "password";
      field.removeAttribute("aria-invalid");
    }
    reveal.checked = false;
    nonce.value = "";
    reauth.hidden = true;
    status.textContent = "";
  }

  function busy(value) {
    form.setAttribute("aria-busy", String(value));
    form.querySelectorAll("input, button").forEach(control => { control.disabled = value || !userId; });
    submit.textContent = value ? "Please wait…" : "Save password";
  }

  function clear() {
    ++revision;
    userId = null;
    pending = null;
    linkIntent = false;
    linkError = false;
    linkUserId = null;
    clearFields();
    tab.hidden = true;
    document.getElementById("accountIdentity").textContent = "";
    document.getElementById("accountSetupNotice").hidden = true;
    busy(false);
    if (tab.classList.contains("active")) document.querySelector('[data-admin-section="service"]')?.click();
  }

  function showSetup() {
    if (!host || !userId || host.identity()?.id !== userId || (linkUserId && linkUserId !== userId)) return;
    document.getElementById("accountSetupNotice").hidden = false;
    host.open();
    password.focus();
    linkIntent = false;
    linkUserId = null;
  }

  function authenticated(user) {
    if (!host || !user?.id || host.identity()?.id !== user.id) return;
    ++revision;
    pending = null;
    clearFields();
    userId = user.id;
    tab.hidden = false;
    document.getElementById("accountIdentity").textContent = user.email || "Your administrator account";
    busy(false);
    if (linkIntent) showSetup();
  }

  function authEvent(event, session) {
    if (event !== "PASSWORD_RECOVERY") return;
    linkIntent = true;
    linkUserId = session?.user?.id || null;
    // Auth callbacks must return synchronously; never call Supabase from here.
    if (userId && userId === linkUserId) showSetup();
  }

  function isCurrent(operation) {
    return pending === operation && revision === operation.revision && host.generation() === operation.generation && userId === operation.userId && host.identity()?.id === operation.userId;
  }

  async function verified(operation) {
    const { data, error } = await host.client.auth.getUser();
    if (!isCurrent(operation)) return false;
    if (error || !data?.user) {
      status.textContent = "Your session could not be verified. Check your connection or sign in again.";
      return false;
    }
    if (data.user.id !== operation.userId) {
      host.invalidate("Your account changed. Sign in again before changing a password.");
      return false;
    }
    const allowed = await host.verify(data.user.id);
    if (!isCurrent(operation)) return false;
    if (!allowed) {
      host.invalidate("This account is not authorized for church administration.");
      return false;
    }
    return true;
  }

  async function action(work) {
    if (pending || !host || !userId || host.identity()?.id !== userId) return;
    const operation = { revision, userId, generation: host.generation() };
    pending = operation;
    busy(true);
    status.textContent = "";
    try {
      if (await verified(operation)) await work(operation);
    } catch {
      if (isCurrent(operation)) status.textContent = "The request could not be completed. Check your connection and try again.";
    } finally {
      if (isCurrent(operation)) {
        pending = null;
        busy(false);
      }
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (pending || !userId) return;
    password.removeAttribute("aria-invalid");
    confirm.removeAttribute("aria-invalid");
    if (Array.from(password.value).length < 12) {
      status.textContent = "Choose a password with at least 12 characters.";
      password.setAttribute("aria-invalid", "true");
      password.focus();
      return;
    }
    if (password.value !== confirm.value) {
      status.textContent = "The new passwords do not match.";
      confirm.setAttribute("aria-invalid", "true");
      confirm.focus();
      return;
    }
    const attributes = { password: password.value };
    if (current.value) attributes.current_password = current.value;
    if (!reauth.hidden && nonce.value.trim()) attributes.nonce = nonce.value.trim();
    action(async operation => {
      const { data, error } = await host.client.auth.updateUser(attributes);
      if (!isCurrent(operation)) return;
      if (error) {
        if (["reauthentication_needed", "reauthentication_not_valid"].includes(error.code)) {
          reauth.hidden = false;
          nonce.value = "";
          status.textContent = error.code === "reauthentication_needed"
            ? "Confirm your identity to finish. Request a verification code, then enter it and save again."
            : "That verification code is invalid or expired. Check the code or request a new one.";
        } else {
          status.textContent = error.code === "same_password" ? "Choose a different password from the one you currently use."
            : error.code === "weak_password" ? "That password does not meet the account requirements. Use a longer, unique password with uppercase and lowercase letters, a number, and a symbol."
            : "The password could not be changed. Check your current password if required, or sign in again and retry.";
        }
        return;
      }
      if (data?.user?.id !== operation.userId) {
        status.textContent = "The password change could not be verified. Sign in again before retrying.";
        return;
      }
      clearFields();
      document.getElementById("accountSetupNotice").hidden = true;
      status.textContent = "Password saved. Use your new password the next time you sign in.";
    });
  });

  sendCode.addEventListener("click", () => action(async operation => {
    const { error } = await host.client.auth.reauthenticate();
    if (!isCurrent(operation)) return;
    status.textContent = error ? "The verification code could not be sent. Wait a moment and try again."
      : "Check your account email for the verification code. Enter it below, then save your password.";
  }));
  reveal.addEventListener("change", () => {
    for (const field of [current, password, confirm]) field.type = reveal.checked ? "text" : "password";
  });
  document.getElementById("accountClearPassword").addEventListener("click", () => {
    if (pending) return;
    clearFields();
    password.focus();
  });
  function linkUnavailableMessage() {
    return linkIntent || linkError ? "This sign-in link could not be verified. It may have expired or already been used. Ask a church owner for a new link, or sign in with your password." : "";
  }
  window.SHEKINAH_ACCOUNT = Object.freeze({ connect(context) { host = context; }, authenticated, authEvent, clear, linkUnavailableMessage });
})();

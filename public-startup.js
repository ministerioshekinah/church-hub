// Independent recovery for a missing or interrupted public application bundle.
// This stays small and does not depend on the CMS, preferences, or main script.
(() => {
  function recoverIfNeeded() {
    if (window.SHEKINAH_PUBLIC_READY) return;
    const notice = document.getElementById("publicStartupNotice");
    if (!notice) return;
    notice.hidden = false;
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/no-script.css?v=1.1";
    document.head.appendChild(stylesheet);
    // A partially initialized menu may still be inert, and its old document
    // listeners may close it again. Fresh ordinary links remain usable even
    // when those incomplete handlers retain a reference to the original nav.
    const navigation = document.getElementById("navMenu");
    if (navigation) {
      const recoveredNavigation = navigation.cloneNode(true);
      recoveredNavigation.inert = false;
      recoveredNavigation.removeAttribute("inert");
      navigation.replaceWith(recoveredNavigation);
    }
    document.querySelectorAll('[aria-busy="true"]').forEach(element => element.setAttribute("aria-busy", "false"));
    ["heroServiceTime", "serviceSectionTime", "visitServiceTime"].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = "—";
    });
    const summary = document.getElementById("heroServiceSummary");
    if (summary) summary.hidden = true;
    document.getElementById("reloadPublicPage")?.addEventListener("click", () => window.location.reload());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", recoverIfNeeded, {once:true});
  else recoverIfNeeded();
})();

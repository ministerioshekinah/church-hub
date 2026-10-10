/* Run before stylesheets so a saved dark theme never flashes a light page. */
(() => {
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = null;
  try { preference = localStorage.getItem("ministerioTheme"); } catch { /* Use system appearance. */ }
  if (preference !== "light" && preference !== "dark") preference = null;

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#121912" : "#f7f6f0");
    updateLabel();
  }
  function updateLabel() {
    const buttons = document.querySelectorAll("[data-theme-toggle]");
    const dark = document.documentElement.dataset.theme === "dark";
    const spanish = document.documentElement.lang === "es";
    const label = spanish ? "Modo oscuro" : "Dark mode";
    buttons.forEach((button) => {
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-checked", String(dark));
      button.title = spanish ? (dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro") : (dark ? "Switch to light mode" : "Switch to dark mode");
    });
  }
  applyTheme(preference || (systemTheme.matches ? "dark" : "light"));
  window.SHEKINAH_THEME = { updateLabel };
  document.addEventListener("DOMContentLoaded", () => {
    updateLabel();
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => button.addEventListener("click", () => {
      preference = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("ministerioTheme", preference); } catch { /* Keep session choice. */ }
      applyTheme(preference);
    }));
  }, { once: true });
  systemTheme.addEventListener("change", () => {
    if (!preference) applyTheme(systemTheme.matches ? "dark" : "light");
  });
})();

/* GitHub Pages serves directory indexes without showing their .html filenames. */
(() => {
  const location = window.location;
  const legacy = new Map([
    ["/newsletter.html", "/newsletter/"],
    ["/admin.html", "/admin/"]
  ]);
  const indexes = new Map([
    ["/index.html", "/"],
    ["/newsletter/index.html", "/newsletter/"],
    ["/admin/index.html", "/admin/"]
  ]);
  const suffix = location.search + location.hash;
  const destination = legacy.get(location.pathname);
  if (destination) {
    // Constant destinations prevent open redirects and preserve issue/auth links.
    location.replace(destination + suffix);
    return;
  }
  const canonical = indexes.get(location.pathname);
  if (canonical) {
    // The correct page is already loaded; normalize it without another request.
    try { window.history.replaceState(window.history.state, "", canonical + suffix); }
    catch { location.replace(canonical + suffix); }
  }
})();

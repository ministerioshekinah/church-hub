// Compatibility for a cached copy of the former /admin/ redirect page.
// The full index page normalizes its address to /admin/ without another request.
window.location.replace("/admin/index.html" + window.location.search + window.location.hash);

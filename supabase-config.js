/*
  Supabase browser configuration for Ministerio Cristiano Shekinah.

  This file contains only the public Project URL and publishable key.
  Never place a Supabase secret key or service_role key in this file.
*/
window.SHEKINAH_SUPABASE = {
  url: "https://nhzxlsjwsvyimozubbho.supabase.co",
  publishableKey: "sb_publishable_afp59GoL5-3i0t_0h-0NwQ_Pl3FmZtT"
};

/* Admin-only extensions. They contain no secret credentials. */
if (/\/admin(?:\/|\.html)?$/.test(window.location.pathname)) {
  [
    "/admin-service-validation.js?v=3.1",
    "/administrators.js?v=1.4"
  ].forEach((src) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  });
}

/*
  Newsletter optional-section support is loaded after the page's primary
  script has initialized. This keeps the existing newsletter system intact
  while adding optional Ministry Spotlight, celebrations, important notice,
  and custom sections.
*/
if (/\/admin(?:\/|\.html)?$/.test(window.location.pathname)) {
  window.addEventListener("DOMContentLoaded", () => {
    const script = document.createElement("script");
    script.src = "/newsletter-extensions.js?v=4.4";
    script.async = false;
    document.body.appendChild(script);
  });
}

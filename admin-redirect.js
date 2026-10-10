// Preserve Supabase invitation/recovery parameters on this same-origin redirect.
// The destination is constant; never accept a redirect destination from the URL.
window.location.replace("/admin.html" + window.location.search + window.location.hash);

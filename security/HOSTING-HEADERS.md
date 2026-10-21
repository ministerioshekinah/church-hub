# Hosting firewall and security headers — prepared, not activated

Status on October 10, 2026: **the live site still lacks these headers**. The configuration in this change has not been deployed to Cloudflare. Committing or merging these files does not change GitHub Pages response headers. Findings F04–F06 in the security recheck remain open until live verification passes.

October 13 maintenance: brought this draft forward to the published Liquid Glass release and expanded asset coverage for the four new stylesheets. The local coverage test checks current page references so future styles/scripts cannot silently be omitted. No Cloudflare/DNS changes were made, and production headers were not rechecked because live website access was declined in this session.

October 21 maintenance: added disabled WAF proposals for unsupported website methods and known repository/environment-file paths; added referrer and device-permission response headers. All templates now use `enabled: false` so importing them cannot accidentally activate the proposal. The browser-facing font, content and animations are unchanged by this hosting branch. No provider configuration was changed.

## Current hosting and required access

The website is served by GitHub Pages, with `CNAME` set to `mcshekinah.org`. GitHub Pages does not expose custom HTTP response-header configuration. An HTML meta tag or a repository `_headers` file cannot supply these missing protections on this host.

The observed authoritative nameservers are `ns1051.ui-dns.org`, `ns1112.ui-dns.com`, `ns1037.ui-dns.biz`, and `ns1066.ui-dns.de` (IONOS). The existing `www` CNAME points to `ministerioshekinah.github.io`.

The proposed deployment keeps the repository and website on GitHub Pages and adds Cloudflare's proxy in front of the two existing website hostnames. Activation needs an accessible Cloudflare account and access to the domain's nameserver/DNS settings at IONOS. Neither account is connected for this task. No DNS records, hosting settings, or account settings have been changed.

## Exact response-header rule

Use [hosting/cloudflare-response-headers.json](hosting/cloudflare-response-headers.json) as one rule in the zone-level `http_response_headers_transform` phase. It is a rule object, not a replacement for the entire ruleset. Preserve other rules when adding it through the API.

In Cloudflare's dashboard, open the `mcshekinah.org` zone, then **Rules → Overview → Create rule → Response Header Transform Rule**. Use this custom filter:

```text
http.host in {"mcshekinah.org" "www.mcshekinah.org"}
```

After approval, enable the rule and apply these six operations:

| Header | Operation | Initial value | Purpose |
| --- | --- | --- | --- |
| `Strict-Transport-Security` | Set static | `max-age=300` | Browsers remember to require HTTPS for five minutes during the initial rollout |
| `X-Content-Type-Options` | Set static | `nosniff` | Prevent MIME-type guessing |
| `X-Frame-Options` | Set static | `DENY` | Framing restriction for older clients |
| `Content-Security-Policy` | Add static | `frame-ancestors 'none';` | Prevent embedding the site in frames, including the administrator portal |
| `Referrer-Policy` | Set static | `strict-origin-when-cross-origin` | Avoid sending page paths/query strings to other origins; administrator pages retain their stronger `no-referrer` meta policy |
| `Permissions-Policy` | Set static | `camera=(), microphone=(), geolocation=()` | Disable unused device permissions; preserve clipboard copying and external map links |

The additional HTTP CSP preserves any other HTTP CSP and works alongside the existing per-page meta CSP. It does not replace the script, font, style, or backend allowances in the pages. No other hostnames are matched, and no HSTS `includeSubDomains` or `preload` directive is enabled.

## Narrow website firewall rules

[hosting/cloudflare-waf-rules.json](hosting/cloudflare-waf-rules.json) is an array of **two rule objects**, each disabled. Add them individually to the zone's existing `http_request_firewall_custom` phase entry point ruleset; do not replace its current rules. Each rule has a stable `ref` to make later review and updates identifiable. No account IDs, tokens, or plan-specific bot scores are embedded.

| Rule | When enabled | Preserved behavior |
| --- | --- | --- |
| `shekinah_static_methods` | Block methods other than GET, HEAD and OPTIONS on the exact apex/www hosts | Page/asset reads, ordinary navigation and preflights; CMS writes go directly to Supabase |
| `shekinah_sensitive_paths` | Block root `.git` and its descendants, root `.env`/`.env.*`, and `/supabase/.env`/`.env.*`, case-insensitively | `/.well-known/` certificate/security paths, public JavaScript configuration, ordinary assets and similar names such as `.environment` |

These are low-risk filters for a static host, not a comprehensive exploit-detection ruleset. Review any provider-managed protections already available on the account before enabling additional managed rules. No country blocks, broad bot challenges or guessed rate limits are proposed; those need real traffic evidence and plan review.

The path expression uses Cloudflare's request-path field. Before activation, verify the zone's URL-normalization settings and test encoded/dot-segment variants with Cloudflare Trace and the provider's validation tools. The local test interpreter checks the explicit expression subset and allow/block boundaries; it does **not** emulate Cloudflare normalization, validate an account's plan, or prove live enforcement. A public repository must never contain secrets even if a proxy blocks familiar secret filenames.

### Important protection boundaries

- The browser calls `nhzxlsjwsvyimozubbho.supabase.co` directly for Auth, REST and Edge Functions. Rules scoped to `mcshekinah.org` cannot protect those API requests. A rate limit on the static `/admin/` HTML page would not rate-limit password attempts. Supabase Auth abuse controls, MFA, database authorization/RLS and server-side Owner checks remain separate requirements.
- Supabase database network restrictions cover direct database/pooler connections, not its public HTTPS APIs. Do not impose guessed IP allowlists that can lock out management or application access.
- GitHub Pages remains a publicly reachable origin. A proxy cannot be treated as an exclusive authentication boundary while clients can reach that origin directly. Host the site behind an origin-access control mechanism if exclusive WAF enforcement becomes a requirement; that is a separate hosting decision.
- Response-header transform rules may not run on every provider-generated challenge/error response. Verify normal origin pages, assets, redirects and 404s with the existing checker; inspect WAF-generated responses separately without assuming the transform covered them.

## Activation sequence

1. Export the **complete** current IONOS DNS zone before changing nameservers. Copy and verify all existing records in Cloudflare, including any email, SPF/DKIM/DMARC, verification, CAA, and non-website records. A public DNS lookup or automatic import is not a complete inventory. Handle any existing DNSSEC delegation during the transition so it cannot leave a stale DS record.
2. Keep the existing GitHub Pages custom domain and origin records. Configure Cloudflare SSL/TLS as **Full (strict)** and verify that GitHub's origin certificate and Cloudflare's edge certificate cover both website hostnames. Preserve HTTP-to-HTTPS and `www`-to-apex redirects, including paths and query strings. Do not use Flexible SSL.
3. Activate the Cloudflare zone using the nameservers actually assigned to that account. Proxy the existing apex and `www` website records. Keep mail and unrelated service records DNS-only. Response-header rules only take effect when traffic passes through the proxy.
4. Import the header rule and two WAF rule objects **disabled**. Preserve existing rules and inspect phase order. Validate expressions with Cloudflare, confirm the account supports the requested rules without a paid upgrade, and record their IDs. After explicit activation approval, enable the response-header rule, then the two WAF rules one at a time. Confirm that later rules or managed transforms do not overwrite headers, and use a single source of HSTS configuration to avoid conflicting headers.
5. Run the verification below. Use Cloudflare Trace/provider validation to confirm the methods/paths in the table above would match. After approved activation, make a single GET to each known absent `/.git/config` and `/.env` path and confirm a provider block, while `/.well-known/security.txt` is allowed through to the origin (its own 404 is acceptable). Confirm unrelated hostnames and direct Supabase requests are untouched. Check the homepage, newsletter, language/theme controls, and administrator sign-in in a browser. Confirm that email and any other domain services still work. Update the English and Spanish privacy descriptions to include Cloudflare once it actually serves visitors.
6. After the initial checks pass, increase the rule's HSTS value to `max-age=86400`. After a day of healthy operation, increase it to `max-age=31536000` and run the long-term check. Keep `includeSubDomains` and `preload` off unless a separate inventory and review establish they are appropriate.

## Verify delivery, not just configuration files

```sh
npm run security:headers
# After the staged HSTS increase:
npm run security:headers -- --long-term
```

This command performs read-only GET requests, checks all eight page/legacy entry URLs and all eighteen first-party JavaScript/CSS resources, checks a 404 response, and verifies the `www` and HTTP redirects. On HTTPS responses it requires all six configured headers (including individual camera, microphone and geolocation restrictions). It also checks MIME types so `nosniff` does not silently break scripts or styles. It exits nonzero when any requested protection is missing or any request fails; it does not treat meta or Report-Only CSP as enforcement.

Detailed results are written to the ignored `security/local-results/hosting-headers.json`. The standard local test suite includes negative cases for the verifier. Passing the local unit tests does **not** mean the live headers or firewall are active. Run the focused offline contract checks with:

```sh
node --test tests/hosting-headers.test.cjs tests/hosting-waf.test.cjs
```

The deployment checker makes no login attempt, sign-up, account change or write request. WAF method rejection can be validated through provider tooling without sending a mutation request to production.

## Rollback

Disable either WAF rule by its recorded ID if it blocks legitimate requests; do not remove unrelated rules or turn off all provider protection. Restore its previous reviewed configuration if necessary. Keep HTTPS working throughout a rollback. To remove HSTS, serve `Strict-Transport-Security: max-age=0` over valid HTTPS and account for browsers that have not revisited: they retain their previous policy until its prior max-age expires. Disabling the rule alone does not clear an already stored HSTS policy. Disable or edit the other header operations if needed, then rerun the live checks. Restore exported DNS records if a DNS rollback is required; keep the GitHub origin certificate valid.

## Provider references

- [GitHub response on custom Pages headers](https://github.com/orgs/community/discussions/54257)
- [Cloudflare response-header rules](https://developers.cloudflare.com/rules/transform/response-header-modification/)
- [Cloudflare dashboard procedure](https://developers.cloudflare.com/rules/transform/response-header-modification/create-dashboard/)
- [Cloudflare API rule format](https://developers.cloudflare.com/rules/transform/response-header-modification/reference/parameters/)
- [Cloudflare HSTS requirements and rollback](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/)

- [Cloudflare custom rules API and phase](https://developers.cloudflare.com/waf/custom-rules/create-api/)
- [Cloudflare expression functions](https://developers.cloudflare.com/ruleset-engine/rules-language/functions/)
- [Cloudflare URL normalization](https://developers.cloudflare.com/rules/normalization/)
- [Supabase network-restriction scope](https://supabase.com/docs/guides/platform/network-restrictions)
- [Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy)
- [Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)

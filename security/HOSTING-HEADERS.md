# Hosting security headers — prepared, not activated

Status on October 10, 2026: **the live site still lacks these headers**. The configuration in this change has not been deployed to Cloudflare. Committing or merging these files does not change GitHub Pages response headers. Findings F04–F06 in the security recheck remain open until live verification passes.

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

Apply these four operations:

| Header | Operation | Initial value | Purpose |
| --- | --- | --- | --- |
| `Strict-Transport-Security` | Set static | `max-age=300` | Browsers remember to require HTTPS for five minutes during the initial rollout |
| `X-Content-Type-Options` | Set static | `nosniff` | Prevent MIME-type guessing |
| `X-Frame-Options` | Set static | `DENY` | Framing restriction for older clients |
| `Content-Security-Policy` | Add static | `frame-ancestors 'none';` | Prevent embedding the site in frames, including the administrator portal |

The additional HTTP CSP preserves any other HTTP CSP and works alongside the existing per-page meta CSP. It does not replace the script, font, style, or backend allowances in the pages. No other hostnames are matched, and no HSTS `includeSubDomains` or `preload` directive is enabled.

## Activation sequence

1. Export the **complete** current IONOS DNS zone before changing nameservers. Copy and verify all existing records in Cloudflare, including any email, SPF/DKIM/DMARC, verification, CAA, and non-website records. A public DNS lookup or automatic import is not a complete inventory. Handle any existing DNSSEC delegation during the transition so it cannot leave a stale DS record.
2. Keep the existing GitHub Pages custom domain and origin records. Configure Cloudflare SSL/TLS as **Full (strict)** and verify that GitHub's origin certificate and Cloudflare's edge certificate cover both website hostnames. Preserve HTTP-to-HTTPS and `www`-to-apex redirects, including paths and query strings. Do not use Flexible SSL.
3. Activate the Cloudflare zone using the nameservers actually assigned to that account. Proxy the existing apex and `www` website records. Keep mail and unrelated service records DNS-only. Response-header rules only take effect when traffic passes through the proxy.
4. Deploy the rule above. Confirm that later rules or managed transforms do not overwrite it, and use a single source of HSTS configuration to avoid conflicting headers.
5. Run the verification below. Check the homepage, newsletter, language/theme controls, and administrator sign-in in a browser. Confirm that email and any other domain services still work. Update the English and Spanish privacy descriptions to include Cloudflare once it actually serves visitors.
6. After the initial checks pass, increase the rule's HSTS value to `max-age=86400`. After a day of healthy operation, increase it to `max-age=31536000` and run the long-term check. Keep `includeSubDomains` and `preload` off unless a separate inventory and review establish they are appropriate.

## Verify delivery, not just configuration files

```sh
npm run security:headers
# After the staged HSTS increase:
npm run security:headers -- --long-term
```

This command performs read-only GET requests, checks all eight page/legacy entry URLs and all fourteen first-party JavaScript/CSS resources, checks a 404 response, and verifies the `www` and HTTP redirects. On HTTPS responses it requires all four configured headers. It also checks MIME types so `nosniff` does not silently break scripts or styles. It exits nonzero when any requested protection is missing or any request fails; it does not treat meta or Report-Only CSP as enforcement.

Detailed results are written to the ignored `security/local-results/hosting-headers.json`. The standard local test suite includes negative cases for the verifier. Passing the local unit tests does **not** mean the live headers are active.

## Rollback

Keep HTTPS working throughout a rollback. To remove HSTS, serve `Strict-Transport-Security: max-age=0` over valid HTTPS and account for browsers that have not revisited: they retain their previous policy until its prior max-age expires. Disabling the rule alone does not clear an already stored HSTS policy. Disable or edit the other header operations if needed, then rerun the live checks. Restore exported DNS records if a DNS rollback is required; keep the GitHub origin certificate valid.

## Provider references

- [GitHub response on custom Pages headers](https://github.com/orgs/community/discussions/54257)
- [Cloudflare response-header rules](https://developers.cloudflare.com/rules/transform/response-header-modification/)
- [Cloudflare dashboard procedure](https://developers.cloudflare.com/rules/transform/response-header-modification/create-dashboard/)
- [Cloudflare API rule format](https://developers.cloudflare.com/rules/transform/response-header-modification/reference/parameters/)
- [Cloudflare HSTS requirements and rollback](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/)

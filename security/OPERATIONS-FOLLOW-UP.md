# Operational follow-up after the engineering sprint

Prepared from the October 18, 2026 inspection. This is a review plan, not an activated configuration or migration. PR #21 contains frontend improvements and a proposed administrator-removal database/Edge repair. Production accounts, data, database configuration, hosting, DNS and paid services remain unchanged.

## High priority: administrator removal can silently fail

The live catalog confirms that `protect_last_owner` uses `private.prevent_last_owner_loss()` with the same body as migration `202608090003_security_hardening.sql`. For a DELETE of an ordinary content administrator, the function reaches `RETURN NEW`. PostgreSQL supplies NULL for NEW during DELETE, so this BEFORE trigger suppresses the deletion without a database error. The existing Edge handler checks only the error and can return `{ok:true}` even though membership remains. This is a verified code-level revocation defect, not evidence that an account has been compromised. No production removal was attempted.

The exact catalog-read function reproduced zero deleted rows and a retained content administrator in an isolated PostgreSQL WASM database. The proposed `20261018202726_fix_admin_removal_trigger.sql` returns OLD for that DELETE path while preserving the existing Owner checks, advisory transaction lock, empty search path and restricted function privileges. The Edge handler also requires the requested user ID in DELETE RETURNING; a suppressed deletion produces HTTP 409 instead of success.

The browser additionally checks the refreshed access list and visibly warns if a legacy backend reports success while the account remains listed. This improves detection before a backend release; it does not itself revoke access.

Seven more isolated tests apply all nine repository migrations and execute the real RLS policies under anon, authenticated and service_role fixtures. Auth account deletion cascades also remove membership, while the final Owner remains protected. The same authenticated identity loses private reads and writes after membership deletion; nonmembers remain denied, author UUIDs stay private and the service role retains its restricted table privileges.

Ten database tests execute real trigger semantics, including removal, final-Owner protection, multirow atomicity, repeat application and integration with the actual Edge handler. They run on PGlite 0.5.10 / PostgreSQL 18.6, with fictional IDs and no network. Production is PostgreSQL 17.6; native staging concurrency and the complete deployed middleware remain separate acceptance gates. The original trigger's DELETE semantics are also documented in [PostgreSQL 17 trigger guidance](https://www.postgresql.org/docs/17/plpgsql-trigger.html).

Apply only after explicit release approval: back up and review the trigger, run the migration and handler in an approved staging environment, verify that an ordinary administrator can be removed and that the last Owner cannot be removed or demoted, then coordinate the production migration and Edge Function deployment. Confirm that revoked membership is absent and protected content requests are denied. Deploying the handler guard first is safe: it surfaces the existing failed removal until the migration is applied. Merging this website PR does not deploy the database or Edge Function. Do not remove real accounts merely to test this repair.

## Decisions and acceptance evidence

| Priority | Decision | Evidence needed before activation | Acceptance after an approved change |
| --- | --- | --- | --- |
| High | Upgrade the database from the observed PostgreSQL 17.6 release to a currently supported patched Supabase release. | Confirm the available upgrade target, backup/restore capability, maintenance window and extension compatibility. The announced 17.11 rollup establishes a patch gap; individual CVE exploitability was not demonstrated. | Verify the new version, run the read-only RLS checks, and exercise sign-in, all three publishers and Owner controls in an approved environment. Confirm public reads still exclude private content. |
| High | Add administrator MFA with a tested recovery path. | Inventory approved administrators without publishing their identities; establish recovery access; complete enrollment and challenge screens in staging before requiring AAL2. | Password-only sessions cannot perform protected writes or Owner actions; valid second-factor sessions can. Failed/cancelled challenges, expiry, sign-out and recovery remain usable. |
| Medium | Enable leaked-password protection and restrict public registration if compatible with church requirements. | Confirm plan availability, invitation behavior and password policies. Do not purchase or upgrade services without approval. | Approved invitations work; unsolicited signup is rejected; existing sign-in and recovery still work. Membership checks continue to deny nonmembers. |
| Medium | Introduce HTTP framing restrictions through a reviewed hosting/proxy change. | Review the separate draft PR #14, exact origins, redirects, rollback route and whether any legitimate embedding is required. Repository meta tags cannot supply `frame-ancestors`. | Inspect real response headers on public, admin, redirect and error paths; a separate-origin frame cannot display the portal. All scripts, fonts, content reads and authentication still work. |
| Medium | Require review/checks on `main` and reconcile the heartbeat workflow. | Decide whether to retire, redesign or narrowly authorize the existing scheduled write to `main`. Confirm the required check names from a successful PR. | An ordinary unreviewed/unchecked update cannot land; authorized maintenance and recovery remain possible. No blanket bypass is introduced merely to keep the heartbeat working. |
| Low / unconfirmed | Review domain verification, CAA, DNSSEC and missing response headers. | Check GitHub account-level verification and authoritative registrar configuration. The observed missing TXT/CAA/DS answers do not prove takeover or compromise. | Verify DNS resolution and certificate issuance/renewal after approved changes. Introduce HSTS conservatively; evaluate subdomains before `includeSubDomains` or preload. |

## Authentication work should be one coordinated release

The portal currently has password sign-in and invitation sending, but no in-portal password-setting or forgotten-password interface. Source inspection found no `auth.updateUser` password call, `resetPasswordForEmail` call or `PASSWORD_RECOVERY` handling. Local mocked invite/recovery landings both opened the dashboard with no visible new-password control; fragments were cleared and no password-change request occurred. An invitation can establish an authenticated session through the SDK; this does not establish that an invited administrator has completed a reusable password setup. Actual email delivery, invitation acceptance and recovery were not exercised against production.

Treat this as an onboarding/recovery gap to complete alongside MFA, not as evidence of an authentication bypass. A follow-up should cover a new invite, an existing approved account, expired/reused links, cancellation, a fresh password sign-in after signing out, and recovery. Do not send test invitations or password-reset messages without explicit authorization. Use fictitious accounts in an approved staging environment first.

For MFA, preserve the existing membership boundary and public read policies. Review every relevant INSERT/UPDATE/DELETE policy and the Owner Edge Function together; an additional permissive policy must not accidentally leave an alternate password-only write path. Enforce assurance from verified server-side claims, not a form value or a frontend-only toggle. Build and verify enrollment, challenge and recovery before enforcement so the current owner is not locked out. A separately reviewed MFA backend change and deployment are required; the administrator-removal proposal in this PR does not add MFA.

The Owner function currently reads only the first 1,000 Auth users when mapping membership to email addresses and locating an existing invitee. With the presently small authorized group this was not an observed production failure. If public registration remains available and the Auth population grows, add bounded pagination or a purpose-specific lookup before that limit is reached. Do not treat the fixture directory as a production user inventory.

## Additional read-only upgrade review

A follow-up catalog check on October 18 still reports PostgreSQL 17.6. `pgcrypto` 1.3 is installed; `ltree` and `btree_gist` are absent. No non-extension custom operator with a non-built-in selectivity estimator was found. The public application schema has no `bytea` columns or custom function source references to PGP encryption/decryption; the checked repository migrations and Edge Function also contain none. These observations narrow the compatibility review, but do not establish that legacy PGP encryption was never used through an external client or another schema. No encrypted values were read or decrypted.

The `anon` and `authenticated` database roles have no login, superuser, replication, role-creation, RLS-bypass, database-CREATE or public-schema-CREATE capability. The only non-extension function in `public` is an event trigger, and neither role has EXECUTE permission on it. The reviewed HTTP application therefore exposes no direct arbitrary-SQL or custom public RPC path to the PostgreSQL issues; this is an exposure observation, not proof that an unpatched server is safe. Keep the upgrade as a high-priority provider-coordinated task.

Upstream PostgreSQL 17.11 also describes security fixes beyond the extension compatibility warnings. Review the provider's supported upgrade target, backup/restore path and any external SQL/replication clients. Do not attempt exploit payloads, broad cipher scans or production compatibility mutations as a substitute for patching. See the [upstream 17.11 release notes](https://www.postgresql.org/docs/release/17.11/).

The public archive currently requests the newest 100 published issues. Before that collection grows beyond the limit, add bounded server pagination or a direct fetch for an older requested issue; otherwise a published issue outside the loaded window can be treated as unavailable. The current small collection did not demonstrate this failure.

## Editing and browser limitations

- Exact `updated_at` filters protect cooperating versions of the three editors from silent overwrites/deletions. Older clients and direct authorized API callers can omit those filters. Fully enforced collaborative locking/versioning needs a separate server design.
- The server audit triggers supply versions; clients preserve their full strings, including microseconds. Do not convert them through JavaScript `Date` before comparison.
- Navigation warnings are a convenience, not autosave. Mobile app termination can bypass `beforeunload`. Private drafts are not newly persisted to local storage by this PR.
- Back-navigation privacy probes passed with fresh documents (`pageshow.persisted=false`). A second instrumented Chromium probe removed the automation launch flag that disables the back/forward cache, but DevTools still reported `BackForwardCacheDisabledForDelegate` and `BrowsingInstanceNotSwapped`. It therefore does not establish native cache restoration behavior. Verify stale-session handling on actual Apple devices; consider clearing/revalidating sensitive UI on persisted page-lifecycle events in a separately tested follow-up. This is a coverage limitation, not a demonstrated additional privacy vulnerability.
- Physical iPhone/iPad, Safari on Apple hardware and human screen-reader review remain outstanding. Linux WebKit CI is useful coverage, not a substitute for those checks.

## Release and rollback

1. Review PR #21, its audit report, latest head and all required checks. No merge or deployment is authorized by this document.
2. After explicit approval, deploy the reviewed static branch using the normal process. The proposed administrator-removal migration and Edge Function guard require their own approved staging and backend release; publishing the static website does not activate them.
3. Verify English/Spanish navigation, light/dark appearance, clean URLs, local fonts/SDK, sign-in, publication, version conflicts and cross-tab sign-out. Check the site from a fresh browser context to avoid old asset caches.
4. Repeat the bounded direct TLS probe from a suitable environment: `npm run security:transport`. It makes six serial handshakes against the apex/www hosts. It does not scan ports, enumerate all ciphers or validate all worldwide edges.
5. Roll back frontend changes through a reviewed revert. Coordinate any separately approved database/Edge rollback; do not automatically restore the defective revocation trigger. Database upgrades and authentication enforcement also need their own recovery plans; reverting frontend files cannot undo those operations.

## References

- [Full sprint findings and measurements](SPRINT-2026-10-18.md)
- [Supabase PostgreSQL release guidance](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Supabase authenticated user updates](https://supabase.com/docs/reference/javascript/auth-updateuser)
- [GitHub custom-domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [MDN framing policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [MDN navigation-warning limitations](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)

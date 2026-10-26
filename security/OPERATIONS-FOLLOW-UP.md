# Operational follow-up — October 26, 2026

This is the current handoff for the existing GitHub Pages and Supabase deployment. The [October 18 sprint](SPRINT-2026-10-18.md) remains a historical snapshot. Current deployment evidence is in the [October 26 release record](RELEASE-2026-10-26.md).

## Completed repairs

The administrator-removal defect is repaired in production. The original BEFORE DELETE trigger returned `NEW` for an ordinary Admin; `NEW` is null on DELETE, so PostgreSQL silently retained the row. The repaired function returns `OLD`, retains final-Owner checks and the advisory transaction lock, and keeps its empty search path and restricted privileges.

Supabase records the applied repair as `20261026205057_fix_admin_removal_trigger`. Its function body matches repository migration `20261018202726_fix_admin_removal_trigger.sql`. The October 26 catalog recheck confirmed that body, and the `admin-users` Edge Function is active at version 5. The handler also requires the requested ID in DELETE RETURNING; a suppressed deletion produces a conflict instead of false success. No real administrator was removed as a test. The isolated PostgreSQL suite exercises revocation, cascades, last-Owner protection, RLS and the real handler.

The website now supplies password setup after verified invitation/recovery links, an Account password form, and explicit forgotten-password requests. Server identity and current membership are rechecked before password changes or verification-code requests. API error handling uses fixed messages, password fields clear after success/sign-out, and the UI never stores a new password. Auth session locking prevents an in-flight password response from restoring a signed-out session. This completes the interface gap; it does not enable MFA or change Supabase password/signup policy.

The newsletter editor now displays unsaved state and advisory review messages for known starter copy, missing translations and duplicate announcement banners. These messages never alter church text or block an otherwise valid save. A published-issue link and Spanish fallback previews help compare the editor with the public result.

The account-change guard in PR #27 clears private editor fields and Owner controls when the SDK identifies a different user. Older identity/membership responses cannot reopen the prior dashboard, including during initial verification. Ordinary refreshes for the same user preserve work. An Auth event can invalidate old state; it cannot authorize the new account without server identity and membership verification. Consult the release record for final deployment status.

## Remaining decisions and verification

| Priority | Remaining work | Current evidence and acceptance |
| --- | --- | --- |
| High | Plan the Supabase PostgreSQL upgrade. | A read-only October 26 query still reports 17.6. Confirm the provider's current patched target, recoverable backup, extension compatibility and maintenance window. Verify version, RLS, public reads and authorized publishing after the upgrade. No upgrade, downtime or paid plan change was performed. |
| High | Add MFA with a tested recovery route and server enforcement. | Password setup is available, but no second-factor enrollment/challenge interface or AAL2 policy has been activated. Complete both client flows and all relevant RLS/Owner-handler enforcement together. Verify recovery and an enrolled Owner before requiring MFA. |
| Medium | Finish a real administrator onboarding/recovery smoke check. | Fixture tests cover invitation/recovery landing, password changes, fresh password sign-in, expired identity, provider errors and sign-out races. They do not prove email delivery. An authorized administrator should use their own inbox/account to verify the exact live redirect, a fresh password sign-in and expired-link recovery. Do not send speculative test invitations or resets to other people. |
| Medium | Review leaked-password protection and registration settings. | Supabase's security advisor reports leaked-password protection disabled. The project is on the Free plan; the documented feature requires Pro or above. No paid upgrade was made. Check existing signup/invitation requirements before changing registration policy. A 12-character browser minimum does not replace the server policy. |
| Medium | Protect changes to `main` and reconcile scheduled writes. | Review current GitHub branch/ruleset permissions, the heartbeat workflow and required check names before enforcement. Verify ordinary unchecked updates are rejected while authorized maintenance remains possible. Do not add a blanket bypass for the heartbeat. |
| Medium | Record GitHub Pages response-header limitations. | The existing static host cannot activate arbitrary response headers from a repository `_headers` file, and `frame-ancestors` does not work in a CSP meta tag. No Cloudflare, extra connector, proxy or hosting migration is planned in this release. Any future hosting decision needs a concrete benefit and live response-header verification. |
| Low / unconfirmed | Confirm registrar/domain controls. | Earlier missing CAA, DS or verification TXT answers were observations, not proof of takeover or compromise. Check authoritative DNS and account-level domain verification before changing records. Preserve certificate issuance and redirects. |
| Content | Replace published starter text with church-approved material. | Existing published content includes starter copy. The new editor checklist can identify the known template phrases; it cannot establish that a sermon, date or translation is accurate. An authorized editor should supply and verify the actual bilingual church content. |

## Provider and database boundaries

The deployment uses only existing GitHub and Supabase connections. No new paid service, connector, DNS provider, SMTP provider or hosting proxy was added. Frontend publishing does not apply SQL migrations or deploy Edge Functions automatically.

`public.admin_users` remains the authorization allowlist. RLS and grants enforce content access, while the Edge Function's verified user middleware and Owner lookup enforce administrator management. A recovery link does not grant CMS membership. Removing membership leaves the Auth account in place but removes CMS authorization. JWTs can remain valid until expiry after sign-out; membership checks remain necessary.

For a new project, apply all nine migrations in the [README bootstrap sequence](../README.md#canonical-supabase-setup). For an existing project, inspect its migration history and catalog first. Preserve the October 18 repository filename and the October 26 production deployment version; do not rename applied history or replay the bootstrap to align numbers.

The earlier read-only upgrade review found `pgcrypto` 1.3, no `ltree`/`btree_gist`, no non-extension custom selectivity estimator and no application `bytea`/PGP usage in the checked public schema/source. The application API roles lack direct SQL login, superuser and RLS-bypass capability. These observations narrow compatibility/exposure review, but do not prove an unpatched server is safe or that no external SQL client exists.

## Coverage and operational limits

- Automated browser tests run Chromium, Firefox and WebKit against local HTTPS and fictional Supabase responses. Every backend request is intercepted. Production content, account credentials, role membership and email delivery are not changed by these tests.
- Native Web Locks coordinate SDK session operations across tabs where supported; the SDK process lock supplies same-page serialization when Web Locks are unavailable. Cross-tab guarantees on older browsers without Web Locks have not been established.
- Auth mutations are not automatically retried. If a network result is uncertain, use a fresh verified sign-in/recovery flow instead of assuming a password did or did not change.
- Identity and membership reads stop after ten seconds and provide a retry path. An unavailable membership response is distinct from a confirmed denial. Read deadlines do not automatically cancel password, token, email or sign-out mutations.
- Exact `updated_at` filters protect cooperating editor versions from silent overwrites. Older/direct authorized clients can omit those filters. Server-enforced collaborative versioning would be a separate design.
- Unsaved-navigation warnings are not autosave. Mobile termination can bypass them; private drafts are not newly persisted to browser storage.
- Synthetic persisted page-lifecycle tests clear private UI and reload through server identity/membership verification. Actual back/forward-cache behavior on physical Apple hardware remains unverified.
- Automated axe results and Linux WebKit coverage do not establish full WCAG conformance or replace human screen-reader and physical iPhone/iPad checks.
- The archive currently loads the newest 100 published issues. Add bounded pagination/direct older-issue loading before the collection grows beyond that window. The current small collection did not demonstrate lost access.
- The Owner list reads only administrator profiles, with four reads at a time. Invitation lookup checks up to ten pages of 1,000 Auth users and fails without inviting or granting membership if that budget cannot establish whether an address exists. Plan a targeted email lookup before 10,000 Auth accounts. The fixture directory is not a production user inventory; consult the release record for Edge deployment status.
- The two-hour public-site check exercises long-lived visitor sessions and bounded memory/listener behavior. It is not 120 minutes of penetration testing, a load test, or a count of distinct security vulnerabilities. Its completion must be verified from the final workflow log.

## Release and rollback

1. Review the exact PR head, changed files and checks. All implementation changes must pass the existing Node/security and three-browser suites. A documentation-only correction needs a diff/link review; it does not justify replaying backend migrations.
2. Merge using the expected PR head, preserving other contributors' changes. Verify that the public GitHub Pages assets match the reviewed bytes after deployment; merging alone is not proof of rollout.
3. From a fresh browser, inspect public English/Spanish pages and the logged-out admin controls. Test real account/email operations only with an authorized administrator using their own credentials.
4. Roll back frontend changes with a reviewed revert if necessary. Do not automatically restore the defective administrator-removal trigger. Database upgrades, Auth policy changes and Edge deployments require their own recovery plans.
5. For transport rechecks, `npm run security:transport` performs six serial TLS handshakes to the public apex/www hosts. It does not enumerate ports/ciphers or establish every worldwide edge's behavior.

## References

- [Current website releases and evidence](RELEASE-2026-10-26.md)
- [Administrator setup and recovery runbook](../ADMINISTRATORS_SETUP.md)
- [Historical October 18 sprint](SPRINT-2026-10-18.md)
- [Supabase PostgreSQL release guidance](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)
- [Supabase password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Supabase authenticated user updates](https://supabase.com/docs/reference/javascript/auth-updateuser)
- [Supabase sign-out scopes and token lifetime](https://supabase.com/docs/guides/auth/signout)
- [GitHub custom-domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [MDN framing policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)

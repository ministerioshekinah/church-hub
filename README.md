# Ministerio Cristiano Shekinah Church Hub

A mobile-first bilingual church website and lightweight CMS for Ministerio Cristiano Shekinah in Los Angeles.

## Live site

GitHub Pages serves the website from the `main` branch.

The public site reads current service information, active announcements, and published newsletters from Supabase. The admin portal uses Supabase Auth and an allow-list stored in `public.admin_users`.

## Current production features

- English / Spanish public website with reduced-motion-aware language transitions
- Light / dark appearance, saved per browser, with a system-theme default
- Slow lava-lamp background in matching light/dark colors, with a saved footer motion switch
- Live service day and time
- Apple Maps and Google Maps directions
- Public announcements
- Newsletter archive
- Searchable bilingual archive, issue sharing, printable newsletters, and content retry controls
- Bilingual privacy policy, terms of use, and contact/accessibility help
- Footer information links opposite the Admin button
- Private admin portal
- Coordinated light/dark admin workspace with keyboard tabs and sign-out cleanup
- Announcement create / edit / publish / hide / delete
- Newsletter draft / edit / publish / unpublish / delete
- Owner / Admin roles
- Owner-only administrator management
- Protected Supabase Edge Function for administrator invitations and role changes
- Bilingual recovery page, Inter and Playfair Display typography, favicon, and public sitemap

See [the October 18 engineering and security sprint](security/SPRINT-2026-10-18.md) for the latest change map, browser evidence, and remaining security work. The [October 13 review](security/REVIEW-2026-10-13.md) records the preceding refinement.

## Security model

- Only a Supabase **publishable** key is present in browser code.
- Never commit a Supabase secret key or legacy `service_role` key.
- Supabase Auth verifies administrator identities.
- `public.admin_users` is the authorization allow-list.
- Row Level Security and PostgreSQL grants are the server-side authorization boundary.
- Anonymous visitors can read only the singleton public service row, active announcements, and published newsletters.
- Authenticated users who are not allow-listed do not receive CMS write access.
- Allow-listed Admins can manage church content but cannot manage administrators.
- Owners have content access plus administrator management.
- The final Owner cannot be removed or demoted.
- Browser clients cannot directly insert, update, or delete `admin_users` rows.
- Administrator changes are performed by the protected `admin-users` Edge Function.
- Public CMS pages fail closed when the configured Supabase backend is unavailable rather than displaying stale JSON content.
- Editable public content is HTML-escaped before rendering.

## Canonical Supabase setup

For a new project, apply the committed migrations **in order**:

1. `supabase/migrations/202608090001_complete_production_schema.sql`
2. `supabase/migrations/202608090002_admin_roles.sql`
3. `supabase/migrations/202608090003_security_hardening.sql`
4. `supabase/migrations/202608090004_service_role_least_privilege.sql`
5. `supabase/migrations/202608090005_public_content_query_indexes.sql`
6. `supabase/migrations/20260817225828_add_newsletter_optional_sections.sql`
7. `supabase/migrations/20261010195851_secure_content_audit_fields.sql`
8. `supabase/migrations/20261010200704_restrict_content_author_columns.sql`

Then:

1. Create the initial administrator in Supabase Authentication.
2. Add that user's UUID to `public.admin_users` if the allow-list is empty.
3. Ensure at least one row in `public.admin_users` has `role = 'owner'`.
4. Deploy `supabase/functions/admin-users/index.ts` as the `admin-users` Edge Function.
5. Disable public signups because the website has no public registration flow.
6. Verify the RLS and role behavior described in `ADMINISTRATORS_SETUP.md` before inviting additional administrators.

`supabase-admin-setup.sql` is historical reference only. It is **not** the canonical production setup.

Do not automatically apply repository migrations to production. Review and apply database changes deliberately through a controlled Supabase deployment process.

## Public content behavior

### Service settings

The homepage reads `public.service_settings` row `id = 1`. The service time is entered once in Admin and formatted for public display automatically.

### Announcements

The public homepage reads active Supabase announcements only. The committed `announcements.json` file is intentionally empty so a backend outage cannot resurrect an announcement that was hidden or deleted in the CMS.

### Newsletters

The public newsletter page reads only rows where:

- `status = 'published'`
- `published_at` is not null

Older published issues remain available in the archive. Draft and Ready issues remain private. The committed `newsletters.json` file is intentionally empty so a backend outage cannot resurrect an unpublished issue.

### Local development fallback

`service.json` remains as a harmless local/unconfigured fallback for service information. Once the production Supabase configuration is present, public CMS failures display an error instead of reverting to stale repository content.

## Administrator roles

### Owner

- Manage service settings
- Manage announcements
- Manage newsletters
- View the Administrators tab
- Invite administrators
- Promote or demote other administrators
- Remove administrator access

### Admin

- Manage service settings
- Manage announcements
- Manage newsletters
- Cannot manage administrator access

See `ADMINISTRATORS_SETUP.md` for the production administrator-management runbook.

## Main files

- `index.html` — homepage
- `newsletter/index.html` — newsletter and archive at `/newsletter/`
- `privacy/index.html`, `terms/index.html`, `contact/index.html` — bilingual website information
- `footer.css`, `information.css` — shared footer and information-page styling
- `style.css` — shared styling
- `script.js` — public language and Supabase content loading
- `admin/index.html` — admin portal at `/admin/`
- `admin.js` — authentication, CMS behavior, and verified publishing
- `admin-service-validation.js` — compatibility validation for older cached administrator bundles
- `administrators.js` — Owner-only administrator-management UI
- `supabase-config.js` — public Supabase URL and publishable key only
- `supabase/functions/admin-users/index.ts` — protected administrator-management Edge Function
- `supabase/migrations/` — canonical database migrations

## Public URLs

Use `/` for the homepage, `/newsletter/` for the newsletter/archive, and `/admin/` for the admin portal. Website information is at `/privacy/`, `/terms/`, and `/contact/`. Local assets use paths from the site root so refreshing or directly opening these routes works on GitHub Pages.

Old `/newsletter.html` and `/admin.html` bookmarks forward to the clean routes with their query strings and fragments preserved. Direct `index.html` URLs are normalized in the address bar. The legacy HTML files are compatibility redirects, not page sources.

## Verification and staged updates

Use Node 24 or newer: `npm ci --ignore-scripts`, then `npm test`. The automated checks cover security, clean-URL routing, and public interactions. GitHub Actions runs them for pull requests and pushes to main, and audits both the development dependencies and the pinned browser/Edge Function packages in `security/runtime-dependencies/`.

For rendered browser checks, run `npx playwright install --with-deps chromium` once, then `npm run test:browser`. The suite serves a local copy, intercepts **every** Supabase request, and uses fake content and authentication sessions. Saves, publication, deletion, invitations, and role changes never reach the production backend. It verifies the pinned SDK's integrity before serving it to the browser. CI runs the same suite with Playwright's Chromium, Firefox, and WebKit builds. To run another engine locally, install it with Playwright and set `BROWSER_ENGINE=firefox` or `BROWSER_ENGINE=webkit`.

`CHROMIUM_EXECUTABLE_PATH` can select an existing Chromium binary. `SHEKINAH_TEST_SDK_PATH` can supply an offline copy of the exact pinned SDK; its SHA-384 must still match. The JSON report defaults to the ignored `security/local-results/browser-regression.json`; `BROWSER_REPORT_PATH` changes that destination.

The browser fixture also requires OpenSSL. It generates an ephemeral localhost certificate, removes the temporary key files, and serves HTTPS so the production CSP's upgrade rules behave consistently across engines. The test context trusts that loopback certificate; it does not validate the production certificate. CSP and SDK integrity checks remain enabled.

`npm run security:live` runs read-only production probes. `tests/database-security.sql` checks live authorization and audit triggers inside an explicit rolled-back transaction; review it before running as a database administrator.

For an existing production project, apply the audit-trigger migration first, deploy the frontend with explicit column lists, and then apply the author-column restriction migration. Do not replay historical migrations. The two new filenames match the versions recorded by the controlled production deployment. Reload an admin tab opened before the rollout so it uses the new query column lists.

The Edge Function uses `@supabase/server` with `auth: "user"` to verify session JWTs and a database owner check for authorization. Keep the legacy gateway `verify_jwt` setting false, as required by the SDK/new API-key workflow. This does not make the handler unauthenticated.

See [the October 18 sprint](security/SPRINT-2026-10-18.md) for current results and remaining account/hosting work. The [October 13 review](security/REVIEW-2026-10-13.md), [October 10 security recheck](security/RECHECK-2026-10-10.md), and [earlier audit record](security/AUDIT-2026-10-10.md) retain historical checks. `npm run security:test` runs the security-focused local suite; `tests/database-readonly-security.sql` provides a read-only database recheck without fixture writes.

## Church information

**Ministerio Cristiano Shekinah**  
2149 W Washington Blvd  
Los Angeles, CA 90018

The service day and time shown publicly are managed through the admin portal and may change for special services.

## Technology

- HTML
- CSS
- JavaScript
- GitHub Pages
- Supabase Postgres
- Supabase Auth
- Supabase Edge Functions

## Website information pages

The privacy policy describes the current website only: hosting, locally served fonts, public content delivery, administrator authentication, local preferences, and provider retention. It makes no claim about the church’s incorporation, nonprofit status, or compliance certification. Update both language versions when collection, providers, or features change; legal review remains recommended.

Contact and accessibility help currently directs visitors to church leadership in person at the existing published address. No public email, telephone, mailing address, or response deadline has been inferred from Git metadata or private administrator accounts. Add an approved public remote contact method when the church supplies one.

All three information pages work without the content backend and render English text without JavaScript. With JavaScript disabled, Spanish policy text is also available. Language and appearance controls use the same stored preferences and reduced-motion behavior as the rest of the public site.

## Background motion

The five public pages share a decorative background in `public-glass.css`. Three bounded gradient shapes move using CSS transforms; small screens display two. The layer cannot receive pointer or keyboard input and is hidden from assistive technology. There is no video, canvas, animation dependency, animated blur, or JavaScript render loop.

The bilingual **Background motion** switch in the footer saves a local preference. Motion pauses when the document is hidden or enters the back-forward cache, and resumes only when the visitor's preference permits it. Reduced-motion, reduced-transparency, and forced-color settings override the animation. Without JavaScript the background stays still; print hides it. Privacy and accessibility copy describes the control and preference storage in both languages.

## Original typography

Inter (400/500/600/700) and Playfair Display (600/700) remain unchanged. `assets/fonts/fonts.css` preserves the original Google Fonts face declarations and glyph subsets, referencing locally hosted copies of the same WOFF2 bytes. The two Latin files are preloaded; other subsets load only when needed. `assets/fonts/provenance.json` records source URLs, byte counts, and SHA-256 hashes. Both upstream SIL Open Font Licenses are included. Updating fonts is a deliberate design change: retain the original families and weights unless the owner explicitly approves otherwise.

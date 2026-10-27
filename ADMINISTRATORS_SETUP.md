# Owner and Administrator Management

This feature adds two portal roles:

- **Owner** — full content access plus administrator management.
- **Admin** — service, announcement, and newsletter management only.

The browser never receives a Supabase secret key. Inviting, removing, and changing administrator roles is handled by the protected `admin-users` Supabase Edge Function.

## New-project setup

Apply all nine committed migrations in the [canonical README sequence](README.md#canonical-supabase-setup). Do not skip directly to the role migration on a new or unknown database. Existing production databases require a catalog/history review and only the missing changes, not a replay of the bootstrap sequence.

1. Apply `supabase/migrations/202608090001_complete_production_schema.sql`.
   - This is the canonical baseline for `admin_users`, `service_settings`, `announcements`, and `newsletters`.
   - It preserves existing rows and creates the compatibility helpers expected by later hardening migrations.
2. Apply `supabase/migrations/202608090002_admin_roles.sql`.
   - It adds the `role` column to `public.admin_users`.
   - If exactly one administrator already exists, that existing account becomes the initial `owner`.
   - It does not create or delete Auth users.
3. Apply `supabase/migrations/202608090003_security_hardening.sql`.
   - It installs the canonical browser grants and Row Level Security policies.
   - Public visitors can read only the singleton service row, active announcements, and published newsletters.
   - Authenticated content writes require membership in `admin_users`.
4. Apply `supabase/migrations/202608090004_service_role_least_privilege.sql`.
   - It limits `service_role` table access to the `admin_users` operations used by the protected Edge Function.
5. Apply `supabase/migrations/202608090005_public_content_query_indexes.sql`.
   - It adds indexes matching the public announcement and published-newsletter read paths.
6. Apply `20260817225828_add_newsletter_optional_sections.sql`, `20261010195851_secure_content_audit_fields.sql`, and `20261010200704_restrict_content_author_columns.sql` in that order.
   - These preserve optional newsletter content, supply audit fields on the server, and restrict browser access to author UUID columns.
7. Apply `20261018202726_fix_admin_removal_trigger.sql`.
   - Ordinary administrator deletion must return `OLD` from the BEFORE DELETE trigger. Returning `NEW` silently suppresses the deletion. Existing final-Owner protections remain in place.
8. Deploy `supabase/functions/admin-users/index.ts` as the Edge Function named `admin-users`.
   - The handler independently requires the requested administrator ID in DELETE RETURNING before reporting removal success.
   - Its `@supabase/server` user-auth middleware verifies the JWT and the handler verifies Owner membership. Keep gateway `verify_jwt = false` for this SDK/API-key integration; this is not an unauthenticated handler.
9. Sign out of the website admin portal, sign back in, and refresh the page.
10. The **Administrators** tab appears only when the signed-in allow-listed account has `role = 'owner'`.

The existing production repair was applied on October 26 as Supabase migration `20261026205057_fix_admin_removal_trigger`, with `admin-users` Edge Function version 5. Its trigger definition was rechecked against the repository repair. See [the release record](security/RELEASE-2026-10-26.md). Do not deploy the older defective trigger as a rollback.

### Required post-migration verification

Before adding another administrator, confirm in Supabase that:

- RLS is enabled on all four application tables.
- `anon` cannot read `admin_users`, hidden announcements, or unpublished newsletters.
- an authenticated account that is not in `admin_users` cannot create, update, or delete CMS content.
- an allow-listed administrator can still manage announcements, newsletters, and the singleton service row.
- at least one `owner` exists in `admin_users`.

## Security model

- `admin_users` remains the authorization allow-list.
- Browser roles do not receive INSERT, UPDATE, or DELETE privileges on `admin_users`.
- The Edge Function verifies the caller is an allow-listed `owner` before using its server-side privileged Supabase client.
- New invitations are added as `admin` by default.
- Removing access deletes only the `admin_users` allow-list row. It does not delete the person's Supabase Auth account.
- The last Owner cannot be demoted or removed.
- Owners cannot remove their own access from the portal.

Supabase automatically provides secret API credentials to hosted Edge Functions. Never copy those secret credentials into `supabase-config.js`, `admin.js`, `administrators.js`, or any other browser-served file.

The Owner list fetches Auth profiles only for existing administrator memberships, with at most four profile reads at once. It does not scan unrelated accounts. A deleted Auth profile can appear without an email; a provider failure produces an error instead of a partial list.

When Supabase supplies confirmation and last-sign-in information, the list shows it beside the account. Times use the viewing device's time zone and include its zone label. Missing or malformed timestamps are omitted. Confirmation status is account information, not an access decision: the allowlist and server-side Owner checks still determine permissions.

Adding an address first checks for an existing Auth account using pages of up to 1,000 users. An existing account receives membership without an invitation, and an existing Owner keeps that role. The lookup stops after ten pages. If the directory cannot be checked completely, the request fails without sending an invitation or granting membership. At 10,000 or more Auth accounts, plan a targeted server-side email lookup before this bound affects new invitations. These are capacity limits, not an estimate of the church's account count.

## Password setup and recovery

An invited administrator follows the Supabase email link. After the portal verifies both the account identity and current allow-list membership, the **Account** tab opens with password setup. A verified recovery link follows the same path. A link type in the URL does not itself authorize an account.

An existing administrator can open **Account**, enter a new password twice, and select **Save password**. The form asks for at least 12 characters. The server's password policy remains authoritative; this interface does not change it. Enter the current password when required; leave it blank for invitation/recovery setup. If Supabase requests reauthentication, explicitly send a verification code, enter that code and save again. Success clears the password and code fields.

From the sign-in page, **Forgot your password?** opens an email form. It sends only after **Send recovery link** is selected. Both successful and unknown-account responses use the same account-neutral wording. Provider rate limits are respected and there is no automatic resend. **Back to sign in** closes the form; it cannot retract an email request already accepted by Supabase.

Recovery uses the fixed destination `https://mcshekinah.org/admin/`, matching administrator invitations. Verify that the existing Supabase Auth redirect allowlist and email templates permit that exact URL. The deployed UI does not change the provider's redirect, email, signup, password or MFA settings.

If identity or membership verification takes too long, the portal releases the read after ten seconds and shows a retry message. A connection failure does not mean administrator access was revoked. Retry after the connection recovers. Password/email submissions are never automatically retried; if their result is uncertain, use a fresh sign-in or recovery flow to establish the current state.

If another tab changes to a different signed-in account, the current tab clears the previous account's private drafts and Owner controls. Reload to verify the new account before continuing. Ordinary session refreshes for the same account preserve unsaved work. This cleanup does not sign out the new account.

All automated password/email tests use fictional accounts and intercept every Auth request. Actual email delivery, reusable/expired links and a real password sign-in must be confirmed by an authorized administrator with their own account. Keep a verified Owner recovery route before changing authentication policy. Never paste passwords, session tokens, recovery links or verification codes into a repository issue or test artifact.

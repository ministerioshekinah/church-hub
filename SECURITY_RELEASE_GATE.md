# Security Release Gate

This branch addresses the hostile reassessment findings that can be safely fixed in source control without mutating production. It must not be merged and assumed deployed as a complete security fix until the runtime steps below pass.

## What this branch closes in code

- Requires the Edge platform JWT check for `admin-users` (`verify_jwt = true`) while retaining `withSupabase({ auth: "user" })` as the handler-level check.
- Revalidates `session_id` against `auth.sessions` and current Owner membership for privileged actions.
- Rechecks session + Owner state inside the same database transaction as every membership mutation, reducing the revocation/in-flight race window.
- Replaces Auth-directory enumeration with narrowly scoped database lookups tied to current administrator membership or an exact email.
- Streams and cancels request bodies above 16 KiB instead of buffering the entire body before rejecting it.
- Adds database-backed per-owner action rate limiting.
- Adds idempotency support through request IDs and an append-only-style private owner-action audit record that survives deletion of the Auth user because it intentionally has no foreign key to `auth.users`.
- Removes direct-main write capability from the scheduled keep-alive workflow.
- Makes hosted JavaScript syntax checks fail fast and pins `actions/checkout` to an immutable commit.
- Adds CODEOWNERS coverage for security-sensitive files and source regression checks.

## Required staging verification before production

1. Apply `supabase/migrations/20260822034500_harden_owner_session_boundary.sql` to a disposable/staging project first.
2. Deploy `admin-users` to staging with JWT verification enabled.
3. Verify this matrix with synthetic accounts/tokens:
   - no token -> rejected before handler;
   - malformed/expired/wrong-project token -> rejected;
   - non-admin -> rejected;
   - Admin -> rejected;
   - active Owner -> allowed;
   - captured Owner JWT after global sign-out/session revocation -> rejected even while JWT `exp` is still in the future;
   - Owner demoted/removed while a request is paused before mutation -> mutation rejected;
   - final Owner demotion/removal -> rejected by the existing database trigger.
4. Send small, oversized Content-Length, and oversized chunked/no-length requests; verify the body reader cancels at the configured ceiling.
5. Seed many unrelated Auth users and verify administrator listing performs no Auth `listUsers()` scan.
6. Trigger duplicate mutation requests with the same explicit request ID and verify the second call returns the first result without repeating the membership change.
7. Confirm every successful invite/role/remove mutation creates exactly one row in `private.admin_action_audit` and browser roles cannot read/write that table or call the security-definer RPCs.
8. Run Supabase security/performance advisors after the migration.

## External controls still required

These cannot be enforced merely by committing source files:

- Protect `main` with a GitHub ruleset/branch protection: pull requests, required checks, CODEOWNER review, no force-push/deletion, and tightly restricted bypass.
- Disable public Supabase Auth signup because the website has no public registration flow.
- **Leaked-password protection is currently unavailable on this project because the Ministerio Shekinah Supabase organization is on the Free plan. Supabase currently makes this control available only on Pro and above. If the project is upgraded, enable it immediately in Auth settings and rerun the security advisor. Until then, treat this as a plan-gated residual risk rather than a deploy blocker that can be fixed in source control.**
- Review the strongest password-length/character policy available on the current plan.
- Establish and test an Owner recovery path before mandatory MFA enforcement.
- Enroll/test MFA in staging, then enable `ADMIN_REQUIRE_AAL2=true` only after recovery and direct AAL1-enrollment behavior are verified. The code intentionally does **not** force AAL2 today to avoid locking out the sole Owner.
- Define and test a server-verifiable recent-authentication rule for the highest-risk Owner actions; AAL2 alone is not claimed as recent reauthentication.
- Reconcile production migration history before applying repository migrations. Do not blindly replay all canonical files onto production.
- Self-host the verified Supabase browser bundle (or otherwise narrow the admin CSP) before claiming the remaining jsDelivr CSP hardening gap is closed.
- Review/normalize future-object default privileges in staging before changing PostgreSQL default ACLs in production.

## Assurance limits

The Node tests in this repository are source/regression checks. They are **not** a substitute for a real Supabase RLS/session test matrix, a deployed Edge gateway test, or browser CSP testing.

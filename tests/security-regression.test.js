const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("admin Edge function requires platform JWT verification", () => {
  const config = read("supabase/config.toml");
  assert.match(config, /\[functions\.admin-users\][\s\S]*verify_jwt\s*=\s*true/);
  assert.doesNotMatch(config, /verify_jwt\s*=\s*false/);
});

test("admin Edge dependency is pinned exactly", () => {
  const edge = read("supabase/functions/admin-users/index.ts");
  assert.match(edge, /npm:@supabase\/server@1\.4\.1/);
  assert.doesNotMatch(edge, /@supabase\/server@\^/);
});

test("admin Edge function streams and bounds request bodies before parsing", () => {
  const edge = read("supabase/functions/admin-users/index.ts");
  assert.match(edge, /MAX_BODY_BYTES\s*=\s*16\s*\*\s*1024/);
  assert.match(edge, /req\.body\.getReader\(\)/);
  assert.match(edge, /total\s*>\s*MAX_BODY_BYTES/);
  assert.doesNotMatch(edge, /await\s+req\.text\(\)/);
  assert.doesNotMatch(edge, /await\s+req\.json\(\)/);
});

test("administrator listing never enumerates the Auth directory", () => {
  const edge = read("supabase/functions/admin-users/index.ts");
  assert.doesNotMatch(edge, /auth\.admin\.listUsers\s*\(/);
  assert.match(edge, /admin_list_directory/);
  assert.match(edge, /admin_find_auth_user_by_email/);
});

test("owner mutations lock active session and Owner state before mutation", () => {
  const migration = read("supabase/migrations/20260822034500_harden_owner_session_boundary.sql");
  assert.match(migration, /from auth\.sessions as s[\s\S]*for share;/i);
  assert.match(migration, /from public\.admin_users as a[\s\S]*a\.role = 'owner'[\s\S]*for share;/i);
  assert.match(migration, /private\.admin_action_audit/);
  assert.match(migration, /admin_apply_membership_change/);
  assert.match(migration, /actor_session_id uuid not null/);
  assert.match(migration, /request_id uuid not null unique/);
});

test("security-definer admin RPCs are not executable by browser roles", () => {
  const migration = read("supabase/migrations/20260822034500_harden_owner_session_boundary.sql");
  for (const fn of [
    "admin_assert_active_owner_session",
    "admin_consume_action_rate_limit",
    "admin_list_directory",
    "admin_find_auth_user_by_email",
    "admin_apply_membership_change",
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${fn}`));
  }
  assert.match(migration, /from public, anon, authenticated/g);
  assert.match(migration, /to service_role/g);
});

test("keep-alive workflow cannot write or push to the repository", () => {
  const workflow = read(".github/workflows/supabase-keep-alive.yml");
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /git\s+push/);
  assert.doesNotMatch(workflow, /GH_TOKEN|github\.token/);
});

test("hosted syntax check fails fast without a piped subshell loop", () => {
  const workflow = read(".github/workflows/frontend-checks.yml");
  assert.match(workflow, /set -euo pipefail/);
  assert.match(workflow, /done\s*<\s*<\(/);
  assert.doesNotMatch(workflow, /find[^\n]*\|\s*while/);
});

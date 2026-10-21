import { withSupabase } from "npm:@supabase/server@1.9.1";

type AdminAction =
  | { action: "list" }
  | { action: "invite"; email?: string }
  | { action: "set-role"; userId?: string; role?: "owner" | "admin" }
  | { action: "remove"; userId?: string };

const SITE_ORIGIN = "https://mcshekinah.org";
const MAX_REQUEST_BYTES = 8192;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class RequestError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
function jsonResponse(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function jsonError(message: string, status = 400) { return jsonResponse({ error: message }, status); }
async function readAction(req: Request): Promise<AdminAction> {
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RequestError("JSON is required.", 415);
  const reader = req.body?.getReader();
  if (!reader) throw new RequestError("Invalid request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) { await reader.cancel(); throw new RequestError("Request is too large.", 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new RequestError("Invalid request body."); }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.action !== "string") throw new RequestError("Invalid request body.");
  return body as AdminAction;
}

async function assertOwner(ctx: any) {
  const callerId = ctx.userClaims?.id ?? ctx.jwtClaims?.sub;
  if (!callerId) return { error: jsonError("Authentication required.", 401) };

  const { data, error } = await ctx.supabaseAdmin
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", callerId)
    .maybeSingle();

  if (error) {
    console.error("Owner lookup failed:", error);
    return { error: jsonError("Could not verify owner access.", 500) };
  }

  if (data?.role !== "owner") {
    return { error: jsonError("Owner access is required.", 403) };
  }

  return { callerId };
}

async function listAuthUsers(ctx: any) {
  const { data, error } = await ctx.supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return data.users ?? [];
}

async function listAdministrators(ctx: any) {
  const [{ data: rows, error: rowsError }, users] = await Promise.all([
    ctx.supabaseAdmin
      .from("admin_users")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: true }),
    listAuthUsers(ctx),
  ]);

  if (rowsError) throw rowsError;
  const userMap = new Map(users.map((user: any) => [user.id, user]));

  return (rows ?? []).map((row: any) => {
    const user = userMap.get(row.user_id) as any;
    return {
      id: row.user_id,
      email: user?.email ?? null,
      role: row.role,
      createdAt: row.created_at,
      confirmedAt: user?.confirmed_at ?? null,
      lastSignInAt: user?.last_sign_in_at ?? null,
    };
  });
}

async function ensureAnotherOwner(ctx: any, targetUserId: string) {
  const { data: target, error: targetError } = await ctx.supabaseAdmin
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (targetError) throw targetError;
  if (!target) throw new RequestError("Administrator not found.", 404);
  if (target.role !== "owner") return;

  const { count, error: countError } = await ctx.supabaseAdmin
    .from("admin_users")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "owner");

  if (countError) throw countError;
  if ((count ?? 0) <= 1) {
    throw new RequestError("At least one Owner must remain.", 409);
  }
}

export default {
  fetch: withSupabase({ auth: "user", cors: {
    "Access-Control-Allow-Origin": SITE_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  } }, async (req: Request, ctx: any) => {
    if (req.method !== "POST") return jsonError("Method not allowed.", 405);
    const origin = req.headers.get("origin");
    if (origin && origin !== SITE_ORIGIN) return jsonError("Origin not allowed.", 403);
    const owner = await assertOwner(ctx);
    if (owner.error) return owner.error;

    let body: AdminAction;
    try {
      body = await readAction(req);
    } catch (error) {
      return error instanceof RequestError ? jsonError(error.message, error.status) : jsonError("Invalid request body.");
    }

    try {
      if (body.action === "list") {
        return jsonResponse({ admins: await listAdministrators(ctx) });
      }

      if (body.action === "invite") {
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Enter a valid email address.");

        const users = await listAuthUsers(ctx);
        let user = users.find((candidate: any) => candidate.email?.toLowerCase() === email);
        let invited = false;

        if (!user) {
          const { data, error } = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: "https://mcshekinah.org/admin/",
          });
          if (error) throw error;
          user = data.user;
          invited = true;
        }

        if (!user?.id) throw new Error("Supabase did not return a user ID.");

        const { data: existingMembership, error: membershipError } = await ctx.supabaseAdmin
          .from("admin_users")
          .select("user_id, role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (membershipError) throw membershipError;

        if (existingMembership) {
          return jsonResponse({
            ok: true,
            invited,
            alreadyAuthorized: true,
            userId: user.id,
            email,
            role: existingMembership.role,
          });
        }

        const { error: allowError } = await ctx.supabaseAdmin
          .from("admin_users")
          .insert({ user_id: user.id, role: "admin" });
        if (allowError) throw allowError;

        return jsonResponse({ ok: true, invited, alreadyAuthorized: false, userId: user.id, email, role: "admin" });
      }

      if (body.action === "set-role") {
        const userId = typeof body.userId === "string" ? body.userId : "";
        const role = body.role;
        if (!UUID_PATTERN.test(userId) || (role !== "owner" && role !== "admin")) {
          return jsonError("A valid administrator and role are required.");
        }

        if (userId === owner.callerId && role !== "owner") {
          return jsonError("You cannot demote your own Owner account from this page.", 409);
        }

        if (role === "admin") await ensureAnotherOwner(ctx, userId);

        const { data, error } = await ctx.supabaseAdmin
          .from("admin_users")
          .update({ role })
          .eq("user_id", userId)
          .select("user_id, role")
          .single();
        if (error) throw error;

        return jsonResponse({ ok: true, admin: data });
      }

      if (body.action === "remove") {
        const userId = typeof body.userId === "string" ? body.userId : "";
        if (!UUID_PATTERN.test(userId)) return jsonError("A valid administrator ID is required.");
        if (userId === owner.callerId) {
          return jsonError("You cannot remove your own Owner access from this page.", 409);
        }

        await ensureAnotherOwner(ctx, userId);

        const { data, error } = await ctx.supabaseAdmin
          .from("admin_users")
          .delete()
          .eq("user_id", userId)
          .select("user_id")
          .maybeSingle();
        if (error) throw error;
        // A trigger or concurrent change can prevent a deletion without a
        // database error. Never report that access was revoked without proof.
        if (data?.user_id !== userId) {
          throw new RequestError("Administrator access was not removed. Refresh the list and try again.", 409);
        }

        return jsonResponse({ ok: true });
      }

      return jsonError("Unknown administrator action.");
    } catch (error) {
      console.error("admin-users error:", error);
      return error instanceof RequestError
        ? jsonError(error.message, error.status)
        : jsonError("Administrator request failed. Please try again.", 500);
    }
  }),
};

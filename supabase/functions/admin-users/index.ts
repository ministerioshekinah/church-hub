import { withSupabase } from "npm:@supabase/server@1.4.1";

type AdminAction =
  | { action: "list"; requestId?: string }
  | { action: "invite"; email?: string; requestId?: string }
  | { action: "set-role"; userId?: string; role?: "owner" | "admin"; requestId?: string }
  | { action: "remove"; userId?: string; requestId?: string };

type OwnerContext = {
  supabaseAdmin: any;
  userClaims?: { id?: string };
  jwtClaims?: { sub?: string; session_id?: string; aal?: string };
};

const MAX_BODY_BYTES = 16 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClientError";
    this.status = status;
  }
}

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function getCaller(ctx: OwnerContext) {
  const callerId = ctx.userClaims?.id ?? ctx.jwtClaims?.sub;
  const sessionId = ctx.jwtClaims?.session_id;

  if (!isUuid(callerId) || !isUuid(sessionId)) {
    throw new ClientError("Authentication required.", 401);
  }

  return { callerId, sessionId };
}

async function assertActiveOwner(ctx: OwnerContext, callerId: string, sessionId: string) {
  const { data, error } = await ctx.supabaseAdmin.rpc("admin_assert_active_owner_session", {
    p_user_id: callerId,
    p_session_id: sessionId,
  });

  if (error) throw error;
  if (data !== true) throw new ClientError("Owner session is no longer active.", 403);

  // AAL2 is staged behind an environment switch so the sole Owner cannot be
  // accidentally locked out before MFA enrollment/recovery has been tested.
  if (Deno.env.get("ADMIN_REQUIRE_AAL2") === "true" && ctx.jwtClaims?.aal !== "aal2") {
    throw new ClientError("A recent multi-factor authentication session is required.", 403);
  }
}

async function consumeRateLimit(ctx: OwnerContext, callerId: string, action: AdminAction["action"]) {
  const limit = action === "list" ? 60 : 20;
  const { data, error } = await ctx.supabaseAdmin.rpc("admin_consume_action_rate_limit", {
    p_user_id: callerId,
    p_action: action,
    p_limit: limit,
  });

  if (error) throw error;
  if (data !== true) throw new ClientError("Too many administrator requests. Try again shortly.", 429);
}

async function readBoundedJson(req: Request): Promise<AdminAction> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_BODY_BYTES) {
      throw new ClientError("Request body is too large.", 413);
    }
  }

  if (!req.body) throw new ClientError("Invalid request body.", 400);

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel("request body limit exceeded");
        throw new ClientError("Request body is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ClientError("Invalid request body.", 400);
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid JSON object");
    }
    return parsed as AdminAction;
  } catch {
    throw new ClientError("Invalid request body.", 400);
  }
}

function normalizeRequestId(value: unknown) {
  if (value === undefined || value === null || value === "") return crypto.randomUUID();
  if (!isUuid(value)) throw new ClientError("Invalid request ID.", 400);
  return value;
}

async function listAdministrators(ctx: OwnerContext) {
  const { data, error } = await ctx.supabaseAdmin.rpc("admin_list_directory");
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    email: row.email ?? null,
    role: row.role,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at ?? null,
    lastSignInAt: row.last_sign_in_at ?? null,
  }));
}

async function findUserIdByEmail(ctx: OwnerContext, email: string) {
  const { data, error } = await ctx.supabaseAdmin.rpc("admin_find_auth_user_by_email", {
    p_email: email,
  });
  if (error) throw error;
  return typeof data === "string" ? data : null;
}

function safeRpcError(error: any): never {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "");

  if (code === "42501" || message.includes("owner_session_not_active")) {
    throw new ClientError("Owner session is no longer active.", 403);
  }
  if (code === "P0002" || message.includes("administrator_not_found")) {
    throw new ClientError("Administrator not found.", 404);
  }
  if (code === "23514") {
    throw new ClientError("That administrator change is not allowed.", 409);
  }
  if (code === "23505" && message.includes("request_id_conflict")) {
    throw new ClientError("That request ID has already been used.", 409);
  }

  throw error;
}

async function applyMembershipChange(
  ctx: OwnerContext,
  callerId: string,
  sessionId: string,
  requestId: string,
  action: "invite" | "set-role" | "remove",
  targetUserId: string,
  role: "owner" | "admin" | null,
  targetEmail: string | null,
) {
  const { data, error } = await ctx.supabaseAdmin.rpc("admin_apply_membership_change", {
    p_request_id: requestId,
    p_actor_user_id: callerId,
    p_actor_session_id: sessionId,
    p_action: action,
    p_target_user_id: targetUserId,
    p_role: role,
    p_target_email: targetEmail,
  });

  if (error) safeRpcError(error);
  return data;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx: OwnerContext) => {
    if (req.method !== "POST") {
      return new Response(null, { status: 405, headers: { Allow: "POST" } });
    }

    const contentType = req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      return jsonError("Content-Type must be application/json.", 415);
    }

    try {
      const { callerId, sessionId } = getCaller(ctx);
      await assertActiveOwner(ctx, callerId, sessionId);

      const body = await readBoundedJson(req);
      if (!body.action || !["list", "invite", "set-role", "remove"].includes(body.action)) {
        throw new ClientError("Unknown administrator action.", 400);
      }

      await consumeRateLimit(ctx, callerId, body.action);

      if (body.action === "list") {
        return Response.json({ admins: await listAdministrators(ctx) });
      }

      const requestId = normalizeRequestId(body.requestId);

      if (body.action === "invite") {
        const email = String(body.email ?? "").trim().toLowerCase();
        if (!EMAIL_RE.test(email) || email.length > 320) {
          throw new ClientError("Enter a valid email address.", 400);
        }

        let userId = await findUserIdByEmail(ctx, email);
        let invited = false;

        if (!userId) {
          const { data, error } = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: "https://mcshekinah.org/admin/",
          });
          if (error) throw error;
          userId = data.user?.id ?? null;
          invited = true;
        }

        if (!isUuid(userId)) throw new Error("Supabase did not return a valid user ID.");

        // Revalidates active session + Owner role inside the same DB transaction
        // as the membership mutation. A revoked in-flight request fails here.
        const result = await applyMembershipChange(
          ctx,
          callerId,
          sessionId,
          requestId,
          "invite",
          userId,
          null,
          email,
        );

        return Response.json({ ...result, invited, email });
      }

      const userId = String(body.userId ?? "");
      if (!isUuid(userId)) throw new ClientError("A valid administrator ID is required.", 400);

      if (body.action === "set-role") {
        if (body.role !== "owner" && body.role !== "admin") {
          throw new ClientError("A valid administrator role is required.", 400);
        }

        const result = await applyMembershipChange(
          ctx,
          callerId,
          sessionId,
          requestId,
          "set-role",
          userId,
          body.role,
          null,
        );
        return Response.json(result);
      }

      const result = await applyMembershipChange(
        ctx,
        callerId,
        sessionId,
        requestId,
        "remove",
        userId,
        null,
        null,
      );
      return Response.json(result);
    } catch (error) {
      if (error instanceof ClientError) return jsonError(error.message, error.status);
      console.error("admin-users error:", error);
      return jsonError("Administrator request failed.", 500);
    }
  }),
};

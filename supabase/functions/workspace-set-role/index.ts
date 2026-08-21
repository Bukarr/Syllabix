import { createService } from "../_shared/service.ts";
import { errorResponse, json } from "../_shared/http/responses.ts";
import { serviceClient } from "../_shared/clients.ts";

const ROLES = ["teacher", "subject_head", "headmaster", "director", "admin", "other"];
const ADMIN_ROLES = ["admin", "headmaster", "director"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * workspace-set-role — server-side role assignment inside a school workspace.
 * Replaces the previously API-exposed SECURITY DEFINER RPC: all authorization
 * happens here, so no privileged function is callable by signed-in users.
 */
Deno.serve(
  createService(
    { name: "workspace-set-role", requireAuth: true, rateLimit: { max: 30, windowSeconds: 60 } },
    async ({ user, body }) => {
      const targetUserId = String(body.targetUserId ?? "");
      const newRole = String(body.newRole ?? "");

      if (!UUID_RE.test(targetUserId)) return errorResponse("Invalid target user", 400);
      if (!ROLES.includes(newRole)) return errorResponse("Invalid role", 400);

      const svc = serviceClient();

      const { data: caller, error: callerError } = await svc
        .from("profiles")
        .select("role, school_code")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (callerError) return errorResponse("Could not verify permissions", 500);
      if (!caller || !ADMIN_ROLES.includes(String(caller.role))) {
        return errorResponse("Not permitted", 403);
      }

      const { data: target, error: targetError } = await svc
        .from("profiles")
        .select("school_code")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (targetError) return errorResponse("Could not load member", 500);
      const callerSchool = String(caller.school_code ?? "");
      if (!target || !callerSchool || String(target.school_code ?? "") !== callerSchool) {
        return errorResponse("Target is not in your workspace", 403);
      }

      const { error: updateError } = await svc
        .from("profiles")
        .update({ role: newRole })
        .eq("user_id", targetUserId);

      if (updateError) return errorResponse("Could not update role", 500);

      return json({ success: true });
    },
  ),
);

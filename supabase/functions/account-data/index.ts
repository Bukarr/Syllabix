import { createService } from "../_shared/service.ts";
import { badRequest, json, serverError } from "../_shared/http/responses.ts";
import { serviceClient } from "../_shared/clients.ts";

/**
 * account-data — data-subject rights microservice (GDPR/NDPR).
 *  action "export": returns every row this user owns, as JSON.
 *  action "delete": deletes all their rows and their auth account.
 * Runs standalone so a failure here cannot affect lesson or AI services.
 */

/** Tables keyed by the owning user's id. */
const USER_TABLES = [
  "profiles",
  "lesson_plans",
  "shared_schemes",
  "scheme_comments",
  "support_messages",
  "user_activity",
  "ai_suggestions",
] as const;

Deno.serve(
  createService(
    { name: "account-data", requireAuth: true, rateLimit: { max: 5, windowSeconds: 300 } },
    async ({ user, body }) => {
      const action = String(body.action ?? "");
      const db = serviceClient();
      const userId = user!.id;

      if (action === "export") {
        const payload: Record<string, unknown> = {
          exportedAt: new Date().toISOString(),
          account: { id: userId, email: user!.email ?? null },
        };
        for (const table of USER_TABLES) {
          const { data, error } = await db.from(table).select("*").eq("user_id", userId);
          // A missing column on a table must not fail the whole export.
          payload[table] = error ? [] : data ?? [];
        }
        console.log(JSON.stringify({ evt: "account.export", user: userId }));
        return json(payload);
      }

      if (action === "delete") {
        for (const table of USER_TABLES) {
          await db.from(table).delete().eq("user_id", userId);
        }
        const { error } = await db.auth.admin.deleteUser(userId);
        if (error) {
          console.error("account.delete failed", error.message);
          return serverError("Could not delete account");
        }
        console.log(JSON.stringify({ evt: "account.delete", user: userId }));
        return json({ deleted: true });
      }

      return badRequest("action must be 'export' or 'delete'");
    },
  ),
);
import { createService } from "../_shared/service.ts";
import { errorResponse, json } from "../_shared/http/responses.ts";
import { serviceClient } from "../_shared/clients.ts";
import { isSuperAdmin } from "../_shared/authz/super-admin.ts";

interface ProfileRow {
  user_id: string;
  display_name: string;
  school_code: string;
  role: string;
  created_at: string;
}

/**
 * admin-overview — read-only oversight API for the standalone admin dashboard.
 * Every response is gated on public.app_admins membership; no other service
 * depends on it, so a failure here cannot affect the teacher app.
 */
Deno.serve(
  createService(
    { name: "admin-overview", requireAuth: true, rateLimit: { max: 60, windowSeconds: 60 } },
    async ({ user }) => {
      if (!(await isSuperAdmin(user!.id))) {
        return errorResponse("Admin access required", 403);
      }

      const svc = serviceClient();

      const { data: profiles, error: profilesError } = await svc
        .from("profiles")
        .select("user_id, display_name, school_code, role, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (profilesError) return errorResponse("Could not load profiles", 500);

      // Emails come from the auth admin API — never exposed through the Data API.
      const emails = new Map<string, string>();
      const lastSeen = new Map<string, string | null>();
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !data?.users?.length) break;
        for (const u of data.users) {
          emails.set(u.id, u.email ?? "");
          lastSeen.set(u.id, u.last_sign_in_at ?? null);
        }
        if (data.users.length < 1000) break;
      }

      const rows = (profiles ?? []) as ProfileRow[];
      const users = rows.map((p) => ({
        userId: p.user_id,
        displayName: p.display_name,
        email: emails.get(p.user_id) ?? "",
        schoolCode: p.school_code,
        role: p.role,
        createdAt: p.created_at,
        lastSignInAt: lastSeen.get(p.user_id) ?? null,
      }));

      const workspaceMap = new Map<string, { schoolCode: string; members: number; roles: Record<string, number> }>();
      for (const u of users) {
        if (!u.schoolCode) continue;
        const entry = workspaceMap.get(u.schoolCode) ?? { schoolCode: u.schoolCode, members: 0, roles: {} };
        entry.members += 1;
        entry.roles[u.role] = (entry.roles[u.role] ?? 0) + 1;
        workspaceMap.set(u.schoolCode, entry);
      }
      const workspaces = [...workspaceMap.values()].sort((a, b) => b.members - a.members);

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const newThisWeek = users.filter((u) => u.createdAt >= since).length;

      return json({
        stats: {
          totalUsers: users.length,
          totalWorkspaces: workspaces.length,
          newThisWeek,
          unaffiliated: users.filter((u) => !u.schoolCode).length,
        },
        users,
        workspaces,
      });
    },
  ),
);

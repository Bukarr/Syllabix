import { serviceClient } from "../clients.ts";

/**
 * True only when the caller is listed in public.app_admins.
 * Uses the service client so the check never depends on client-side RLS.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data, error } = await serviceClient()
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !error && !!data;
}

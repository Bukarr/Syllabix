import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Client bound to the caller's JWT — all RLS runs as that user. */
export function userClient(authHeader: string): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
}

/** Privileged client for internal service work (rate limits, curriculum lookups). Never expose to callers. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Security regression tests for the internal `api_rate_limits` table and its
 * related server-side rate-limiting function.
 *
 * Guarantees enforced here (exercised with the public anon key — exactly what a
 * browser/attacker has):
 *  1. The table is protected by a deny-all RLS policy: anonymous clients cannot
 *     read, insert, or delete its rows directly through the Data API.
 *  2. `check_and_increment_rate_limit` is NOT publicly executable — it is only
 *     reachable server-side (service role) from the AI edge functions.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const anon = createClient(URL, ANON, { auth: { persistSession: false } });

describe("api_rate_limits deny-all policy", () => {
  it("blocks anonymous direct SELECT (no rows leak)", async () => {
    const { data, error } = await anon
      .from("api_rate_limits")
      .select("id, identifier, endpoint")
      .limit(50);

    // Must never return rows: either an RLS/permission error or an empty set.
    if (error) {
      expect(error).toBeTruthy();
    } else {
      expect(data).toEqual([]);
    }
  });

  it("blocks anonymous direct INSERT", async () => {
    const { error } = await anon
      .from("api_rate_limits")
      .insert({ identifier: "test-attacker", endpoint: "test-endpoint" });

    // deny-all WITH CHECK (false) must reject this write.
    expect(error).toBeTruthy();
  });

  it("does not allow anonymous DELETE to affect any rows", async () => {
    // With deny-all RLS, PostgREST reports success but zero rows are visible/
    // deletable. `.select()` returns exactly the rows that were deleted.
    const { data, error } = await anon
      .from("api_rate_limits")
      .delete()
      .neq("identifier", "___never___")
      .select("id");

    if (error) {
      expect(error).toBeTruthy();
    } else {
      // No rows were deletable => policy is intact.
      expect(data).toEqual([]);
    }
  });
});

describe("check_and_increment_rate_limit is server-side only", () => {
  it("rejects anonymous execution of the rate-limit function", async () => {
    const { error } = await anon.rpc("check_and_increment_rate_limit", {
      _identifier: `test-${Date.now()}`,
      _endpoint: "vitest-probe",
      _max: 3,
      _window_seconds: 60,
    });

    // The function must not be callable by untrusted (anon) clients.
    expect(error).toBeTruthy();
    expect(error?.code).toBe("42501"); // insufficient_privilege / permission denied
  });
});

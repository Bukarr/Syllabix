import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Security regression tests for the internal `api_rate_limits` table and its
 * related server-side rate-limiting function.
 *
 * Guarantees enforced here:
 *  1. The table is protected by a deny-all RLS policy — anonymous clients can
 *     neither read nor write it directly through the Data API.
 *  2. The only supported path, `check_and_increment_rate_limit`, still works and
 *     actually throttles once the configured limit is exceeded.
 *
 * These run against the live Data API using the public anon key (the same key
 * shipped to browsers), so they reflect exactly what an attacker could attempt.
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

    // Either an explicit RLS/permission error, or an empty result set.
    // What must NEVER happen: rows are returned.
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

    // The deny-all WITH CHECK (false) must reject this write.
    expect(error).toBeTruthy();
  });

  it("blocks anonymous direct DELETE of the whole table", async () => {
    const { error } = await anon
      .from("api_rate_limits")
      .delete()
      .neq("identifier", "___never___");

    expect(error).toBeTruthy();
  });
});

describe("check_and_increment_rate_limit throttling", () => {
  it("allows calls up to the limit, then blocks further calls", async () => {
    // Unique identifier per run so the test is independent of prior state.
    const identifier = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const endpoint = "vitest-throttle";
    const max = 3;
    const windowSeconds = 60;

    const results: boolean[] = [];
    for (let i = 0; i < max + 2; i++) {
      const { data, error } = await anon.rpc("check_and_increment_rate_limit", {
        _identifier: identifier,
        _endpoint: endpoint,
        _max: max,
        _window_seconds: windowSeconds,
      });
      expect(error).toBeNull();
      results.push(data as boolean);
    }

    // First `max` calls allowed, everything after is throttled.
    expect(results.slice(0, max)).toEqual([true, true, true]);
    expect(results.slice(max)).toEqual([false, false]);
  });
});

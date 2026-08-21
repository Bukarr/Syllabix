import { serviceClient } from "./clients.ts";

/**
 * Server-side sliding-window rate limit.
 * Returns true when the call is allowed.
 */
export async function allowRequest(
  identifier: string,
  endpoint: string,
  max = 20,
  windowSeconds = 60,
): Promise<boolean> {
  try {
    const { data } = await serviceClient().rpc("check_and_increment_rate_limit", {
      _identifier: identifier,
      _endpoint: endpoint,
      _max: max,
      _window_seconds: windowSeconds,
    });
    return data !== false;
  } catch (e) {
    console.error("rate limit check failed:", e);
    return true; // fail open: availability over strictness for teachers in the field
  }
}
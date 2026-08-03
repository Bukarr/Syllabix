import { isPreflight, preflightResponse } from "./http/cors.ts";
import { rateLimited, serverError, unauthorized } from "./http/responses.ts";
import { resolveUser, type AuthedUser } from "./auth/require-user.ts";
import { allowRequest } from "./rate-limit.ts";

export interface ServiceContext {
  req: Request;
  user: AuthedUser | null;
  body: Record<string, unknown>;
}

export interface ServiceOptions {
  /** Service name — used for rate-limit buckets and log context. */
  name: string;
  /** Reject the request when there is no signed-in user. */
  requireAuth?: boolean;
  /** Requests allowed per window (per user or per anonymous client). */
  rateLimit?: { max: number; windowSeconds: number } | false;
}

/**
 * Shared service envelope: CORS, auth resolution, rate limiting, body parsing
 * and error handling. Each function owns only its own domain logic.
 */
export function createService(
  options: ServiceOptions,
  handler: (ctx: ServiceContext) => Promise<Response>,
): (req: Request) => Promise<Response> {
  const limit = options.rateLimit === false ? null : options.rateLimit ?? { max: 20, windowSeconds: 60 };

  return async (req: Request): Promise<Response> => {
    if (isPreflight(req)) return preflightResponse();

    try {
      const user = await resolveUser(req);
      if (options.requireAuth && !user) return unauthorized();

      if (limit) {
        const identifier = user?.id ?? `anon:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
        const allowed = await allowRequest(identifier, options.name, limit.max, limit.windowSeconds);
        if (!allowed) return rateLimited();
      }

      let body: Record<string, unknown> = {};
      if (req.method !== "GET") {
        body = await req.json().catch(() => ({}));
      }

      return await handler({ req, user, body });
    } catch (e) {
      console.error(`${options.name} error:`, e);
      return serverError();
    }
  };
}
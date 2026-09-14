/**
 * Shared CORS policy for every Syllabix service.
 * Only known first-party origins are allowed. Credentials are never used
 * (the session travels in the Authorization header), so no wildcard+credentials
 * combination can occur.
 */
const STATIC_ALLOWED = [
  "https://syllabixng.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

/** Extra origins (comma separated) can be supplied via the ALLOWED_ORIGINS secret. */
function allowList(): string[] {
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [...STATIC_ALLOWED, ...extra];
}

/** Lovable preview/sandbox origins are per-project subdomains. */
function isFirstParty(origin: string): boolean {
  if (allowList().includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovable\.dev)$/i.test(origin);
}

const BASE_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

/** Resolve the Access-Control-Allow-Origin value for a request, if permitted. */
export function resolveOrigin(req: Request): string | null {
  const origin = req.headers.get("Origin");
  if (!origin) return null; // non-browser caller: no CORS headers needed
  return isFirstParty(origin) ? origin : null;
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = resolveOrigin(req);
  return origin ? { ...BASE_HEADERS, "Access-Control-Allow-Origin": origin } : { ...BASE_HEADERS };
}

/** Base headers used by response helpers; origin is attached per-request. */
export const corsHeaders: Record<string, string> = { ...BASE_HEADERS };

export function isPreflight(req: Request): boolean {
  return req.method === "OPTIONS";
}

export function preflightResponse(req?: Request): Response {
  const headers = req ? corsHeadersFor(req) : corsHeaders;
  return new Response(null, { headers });
}
/** Shared CORS policy for every Syllabix service. */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function isPreflight(req: Request): boolean {
  return req.method === "OPTIONS";
}

export function preflightResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}
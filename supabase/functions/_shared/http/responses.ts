import { corsHeaders } from "./cors.ts";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...extraHeaders } });
}

export function errorResponse(message: string, status: number, extraHeaders: Record<string, string> = {}): Response {
  return json({ error: message }, status, extraHeaders);
}

export const unauthorized = () => errorResponse("Unauthorized", 401);
export const badRequest = (message: string) => errorResponse(message, 400);
export const serverError = (message = "Internal server error") => errorResponse(message, 500);
export const rateLimited = () =>
  errorResponse("Too many requests. Please wait a moment and try again.", 429, { "Retry-After": "60" });

/** Stream headers for SSE responses. */
export const streamHeaders = { ...corsHeaders, "Content-Type": "text/event-stream" };
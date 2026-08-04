import { errorResponse } from "../http/responses.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const DEFAULT_MODEL = "google/gemini-3-flash-preview";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function apiKey(): string | null {
  return Deno.env.get("LOVABLE_API_KEY") ?? null;
}

/** Low-level call to the Lovable AI Gateway. */
export function callGateway(
  messages: ChatMessage[],
  opts: { model?: string; stream?: boolean; key: string },
): Promise<Response> {
  return fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      messages,
      ...(opts.stream ? { stream: true } : {}),
    }),
  });
}

/** Map gateway failures onto user-facing responses. Returns null when the call succeeded. */
export function gatewayFailure(response: Response, context: string): Response | null {
  if (response.ok) return null;
  if (response.status === 429) return errorResponse("AI service is busy. Please try again in a moment.", 429);
  if (response.status === 402) return errorResponse("AI credits exhausted. Please add credits to continue.", 402);
  console.error(`AI gateway error (${context}):`, response.status);
  return errorResponse(`Failed to ${context}`, 500);
}

/** Parse a JSON completion, tolerating markdown code fences. */
export function parseJsonCompletion<T = Record<string, unknown>>(content: string): T | null {
  try {
    return JSON.parse(content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()) as T;
  } catch {
    return null;
  }
}
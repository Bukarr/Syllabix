import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitize = (s: unknown, max = 300): string =>
      typeof s === 'string' ? s.replace(/[\x00-\x1F\x7F]/g, '').slice(0, max) : '';

    const body = await req.json();
    const classLevel = sanitize(body.classLevel, 50);
    const subject = sanitize(body.subject, 100);

    // Validate and sanitize messages - only allow 'user' and 'assistant' roles
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = rawMessages
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m: any) => ({ role: m.role as string, content: sanitize(m.content, 5000) }))
      .slice(-20); // Limit to last 20 messages

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const levelType = classLevel?.startsWith("Primary")
      ? "primary school"
      : classLevel?.startsWith("JSS")
      ? "junior secondary school"
      : "senior secondary school";

    const systemPrompt = `You are a Nigerian ${levelType} teacher assistant specializing in creating student copy notes aligned with the NERDC-approved curriculum.

Your role is to generate well-structured student copy notes — the notes a teacher would write on the board or dictate for students to copy into their exercise books.

RULES:
- You are generating notes for ${classLevel || "Nigerian"} students studying ${subject || "a subject"}.
- Use simple, clear, age-appropriate language for the class level.
- Use Nigerian-relevant examples and contexts (e.g., Naira for money, Nigerian cities/rivers for geography, local food items for science examples).
- Format notes clearly so a student can copy them neatly.
- Every copy note MUST include:
  1. A clear HEADING (topic title, date placeholder)
  2. A short INTRODUCTION (1-2 sentences connecting to what students already know)
  3. KEY POINTS explained in simple language with numbering
  4. At least one EXAMPLE or worked problem (with step-by-step solution where applicable)
  5. A SUMMARY (3-5 bullet points of the most important things to remember)
- DO NOT use any markdown formatting. No asterisks (*), no hashtags (#), no underscores (_), no backticks, no em dashes (—), no bullet symbols (•).
- Use PLAIN TEXT only. Write headings in UPPERCASE on their own line. Use numbered lists (1. 2. 3.) for key points. Use blank lines between sections for spacing.
- If asked to revise, modify, shorten, or expand — do so while maintaining the copy note structure.
- Do NOT mention AI, curriculum documents, or internal reasoning.
- Do NOT use overly complex vocabulary inappropriate for the class level.
- Be inspection-ready: the note should look professional and complete.

When the user sends a topic, generate the full copy note immediately. When they send follow-up instructions like "make it shorter", "add more examples", "simplify it", respond with the revised note.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("copy-note-chat error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

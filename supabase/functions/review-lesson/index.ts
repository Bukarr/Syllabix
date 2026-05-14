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
    const lessonPlan = sanitize(body.lessonPlan, 10000);
    const classLevel = sanitize(body.classLevel, 50);
    const subject = sanitize(body.subject, 100);
    const action = sanitize(body.action, 20);

    if (!lessonPlan) {
      return new Response(
        JSON.stringify({ error: "lessonPlan text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isImprove = action === 'improve';

    const systemPrompt = isImprove
      ? `You are an expert Nigerian education specialist. You will receive a lesson plan and a review critique. Your task is to rewrite and improve the lesson plan based on the critique.

RULES:
- Follow the standard Nigerian lesson plan format
- Include: Performance Objectives, Entry Behaviour, Instructional Materials, References, Presentation Steps (teacher and student activities), Evaluation, Assignment
- Use Nigerian-relevant examples
- DO NOT use markdown. Use PLAIN TEXT with UPPERCASE headings.
- Return the improved lesson plan as clean, professional text suitable for classroom use.
- Add an AI disclaimer at the end: "AI-generated content. Review before use in class."`
      : `You are an expert Nigerian education quality assurance specialist. You review lesson plans against Nigerian teaching standards.

Evaluate the submitted lesson plan against these criteria:
1. CURRICULUM ALIGNMENT: Does the content match expected scope for the stated class level and subject?
2. STRUCTURAL COMPLETENESS: Does it include Performance Objectives, Entry Behaviour, Instructional Materials, Introduction/Set Induction, Presentation Steps, Evaluation, Assignment?
3. LANGUAGE APPROPRIATENESS: Is the language and cognitive demand appropriate for the stated class?
4. DIFFERENTIATION: Does the lesson account for different learning needs or ability levels?
5. TIME FEASIBILITY: Can the described activities realistically be completed in one 40-45 minute period?

RULES:
- DO NOT use markdown. No asterisks, no hashtags, no underscores.
- Use PLAIN TEXT with UPPERCASE headings.

Return a valid JSON object:
{
  "overallScore": 7,
  "summary": "Brief paragraph on the lesson's strengths",
  "criteria": [
    {
      "name": "Curriculum Alignment",
      "rating": "Strong" or "Adequate" or "Needs Work",
      "explanation": "1-2 sentence explanation"
    }
  ],
  "suggestedImprovements": [
    "Specific, actionable improvement 1",
    "Specific, actionable improvement 2"
  ]
}

Return ONLY the JSON object. No markdown, no code fences.`;

    const userPrompt = isImprove
      ? `Improve this lesson plan:\n\n${lessonPlan}`
      : `Review this lesson plan${classLevel ? ` for ${classLevel}` : ''}${subject ? ` ${subject}` : ''}:\n\n${lessonPlan}`;

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
          { role: "user", content: userPrompt },
        ],
        stream: isImprove,
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
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isImprove) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse review:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse review" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("review-lesson error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

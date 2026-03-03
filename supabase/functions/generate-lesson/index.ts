import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { subject, classLevel, topic, subTopic, term, week, resources } = await req.json();

    if (!subject || !classLevel || !topic) {
      return new Response(
        JSON.stringify({ error: "subject, classLevel, and topic are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert Nigerian teacher and curriculum specialist with deep knowledge of the NERDC-approved curriculum for all levels (Primary, Junior Secondary, Senior Secondary).

Your task is to generate a complete, inspection-ready lesson plan for a Nigerian school.

RULES:
- Align all content strictly to the given topic, subject, and class level
- Use simple, professional teacher language appropriate for Nigerian classrooms
- Use Nigerian-relevant examples, materials, and contexts
- Assume limited teaching resources (chalkboard, textbooks, locally available objects) unless told otherwise
- Do NOT introduce concepts outside the approved scope for this class level
- Do NOT mention curriculum documents, AI, or internal reasoning
- Do NOT copy curriculum text verbatim — interpret and present naturally
- If the topic is broad, infer the most likely NERDC-approved interpretation for the class and week
- All content must be ready for school inspection

OUTPUT FORMAT — Return a valid JSON object with these exact keys:
{
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "entryBehaviour": "Prior knowledge students should have...",
  "materials": ["material 1", "material 2"],
  "references": "Textbook reference with chapter and page",
  "steps": [
    {
      "teacherActivity": "Introduction / Set Induction: The teacher will...",
      "studentActivity": "Students will..."
    },
    {
      "teacherActivity": "Step 1: The teacher will...",
      "studentActivity": "Students will..."
    },
    {
      "teacherActivity": "Step 2: The teacher will...",
      "studentActivity": "Students will..."
    },
    {
      "teacherActivity": "Step 3: The teacher will...",
      "studentActivity": "Students will..."
    },
    {
      "teacherActivity": "Summary / Board Summary: The teacher will...",
      "studentActivity": "Students will..."
    }
  ],
  "evaluation": "1. Question one\\n2. Question two\\n3. Question three",
  "assignment": "Homework or follow-up task"
}

IMPORTANT: Return ONLY the JSON object. No markdown, no explanation, no code fences.`;

    const userPrompt = `Generate a complete lesson plan for:
- Subject: ${subject}
- Class: ${classLevel}
- Term: ${term || "1"}
- Week: ${week || "1"}
- Topic: ${topic}
${subTopic ? `- Sub-topic: ${subTopic}` : ""}
${resources && resources.length > 0 ? `- Available resources: ${resources.join(", ")}` : "- Available resources: Chalkboard, textbooks, locally available objects"}

Generate all sections with at least 5 teaching steps (including introduction/set induction and summary).`;

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
        JSON.stringify({ error: "Failed to generate lesson content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the AI response, handling potential markdown fences
    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse generated content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

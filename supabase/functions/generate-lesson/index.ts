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

Your task is to generate a complete LESSON COPY NOTE — the note that pupils will copy into their exercise books during the lesson. This is NOT a lesson plan for the teacher; it is the actual content pupils write down.

RULES:
- Align all content strictly to the given topic, subject, and class level
- Use simple, clear language appropriate for pupils at the specified class level
- Use Nigerian-relevant examples and contexts
- Assume limited teaching resources (chalkboard, textbooks, locally available objects) unless told otherwise
- Do NOT introduce concepts outside the approved scope for this class level
- Do NOT mention curriculum documents, AI, or internal reasoning
- Do NOT copy curriculum text verbatim — interpret and present naturally
- If the topic is broad, infer the most likely NERDC-approved interpretation for the class and week
- The note must be what a pupil would actually write in their notebook during class
- Include a clear title/heading, date placeholder, definitions, explanations, worked examples, diagrams descriptions where relevant, and classwork/exercises
- Content should be inspection-ready and suitable for Nigerian school standards

OUTPUT FORMAT — Return a valid JSON object with these exact keys:
{
  "objectives": ["By the end of this lesson, pupils should be able to: objective 1", "objective 2", "objective 3"],
  "entryBehaviour": "What pupils already know from previous lessons...",
  "materials": ["material 1", "material 2"],
  "references": "Textbook reference with chapter and page",
  "steps": [
    {
      "teacherActivity": "TOPIC / HEADING: Write the topic and sub-topic on the board for pupils to copy",
      "studentActivity": "Pupils copy the topic and date into their exercise books"
    },
    {
      "teacherActivity": "INTRODUCTION: Brief introduction connecting to previous knowledge",
      "studentActivity": "Pupils listen and recall previous lesson"
    },
    {
      "teacherActivity": "CONTENT NOTE: The main content pupils will copy — definitions, explanations, key points, with numbering",
      "studentActivity": "Pupils copy the note into their exercise books"
    },
    {
      "teacherActivity": "WORKED EXAMPLES: Step-by-step examples solved on the board",
      "studentActivity": "Pupils copy the worked examples and follow along"
    },
    {
      "teacherActivity": "SUMMARY / BOARD SUMMARY: Key points summarized clearly for pupils to copy",
      "studentActivity": "Pupils copy the summary into their exercise books"
    }
  ],
  "evaluation": "CLASSWORK / EXERCISES:\\n1. Question one\\n2. Question two\\n3. Question three",
  "assignment": "HOMEWORK / TAKE-HOME ASSIGNMENT:\\nTask for pupils to complete at home"
}

IMPORTANT: 
- The "teacherActivity" field contains the ACTUAL NOTE CONTENT that pupils will copy, not instructions to the teacher
- The "studentActivity" describes what pupils do at each stage
- Return ONLY the JSON object. No markdown, no explanation, no code fences.`;

    const userPrompt = `Generate a complete lesson copy note for pupils for:
- Subject: ${subject}
- Class: ${classLevel}
- Term: ${term || "1"}
- Week: ${week || "1"}
- Topic: ${topic}
${subTopic ? `- Sub-topic: ${subTopic}` : ""}
${resources && resources.length > 0 ? `- Available resources: ${resources.join(", ")}` : "- Available resources: Chalkboard, textbooks, locally available objects"}

Generate a detailed pupil note with at least 5 sections (heading, introduction, main content, worked examples, and summary). The content should be what pupils actually copy into their books.`;

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
        JSON.stringify({ error: "Failed to generate lesson note" }),
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

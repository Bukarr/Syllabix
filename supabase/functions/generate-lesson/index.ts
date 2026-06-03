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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const subject = sanitize(body.subject, 100);
    const classLevel = sanitize(body.classLevel, 50);
    const topic = sanitize(body.topic, 200);
    const subTopic = sanitize(body.subTopic, 200);
    const term = typeof body.term === 'number' ? Math.min(Math.max(body.term, 1), 3) : 1;
    const week = typeof body.week === 'number' ? Math.min(Math.max(body.week, 1), 13) : 1;
    const resources = Array.isArray(body.resources) ? body.resources.map((r: unknown) => sanitize(r, 100)).slice(0, 20) : [];
    const weakTopics = Array.isArray(body.weakTopics) ? body.weakTopics.map((t: unknown) => sanitize(t, 100)).slice(0, 10) : [];

    if (!subject || !classLevel || !topic) {
      return new Response(
        JSON.stringify({ error: "subject, classLevel, and topic are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const termLabel = term === 1 ? "1st" : term === 2 ? "2nd" : "3rd";
    const curriculumPosition = `Week ${week || 1}, ${termLabel} Term content for ${classLevel} ${subject}`;

    const systemPrompt = `You are an expert Nigerian teacher and curriculum specialist with deep knowledge of the NERDC-approved curriculum and UBE scope and sequence for all levels (Primary, Junior Secondary, Senior Secondary).

Your task is to generate a complete LESSON COPY NOTE — the note that pupils will copy into their exercise books during the lesson. This is NOT a lesson plan for the teacher; it is the actual content pupils write down.

CURRICULUM INTELLIGENCE:
- This lesson is positioned at: ${curriculumPosition}
- You MUST be aware of the curriculum sequence for ${subject} at ${classLevel} level
- The content must match the expected scope for Week ${week || 1} of ${termLabel} Term
- Reference the UBE scope and sequence to ensure topic ordering is correct
- If this is an early-term topic, introduce foundational concepts; if mid or late term, build on prior knowledge
- Consider what topics came before this week and what comes after in the NERDC sequence

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
  "curriculumPosition": "${curriculumPosition}",
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

    const weakTopicNote = weakTopics.length > 0
      ? `\n\nIMPORTANT SCAFFOLDING: The Class Tracker has identified these weak topics among students: ${weakTopics.join(", ")}. If any of these relate to today's lesson, include extra foundational review, simpler examples first, and explicit connections to help students who struggled with these areas.`
      : '';

    const userPrompt = `Generate a complete lesson copy note for pupils for:
- Subject: ${subject}
- Class: ${classLevel}
- Term: ${termLabel} Term (Term ${term || 1})
- Week: Week ${week || 1} of 13
- Topic: ${topic}
${subTopic ? `- Sub-topic: ${subTopic}` : ""}
${resources && resources.length > 0 ? `- Available resources: ${resources.join(", ")}` : "- Available resources: Chalkboard, textbooks, locally available objects"}

Curriculum Position: ${curriculumPosition}
Ensure this content is sequenced appropriately for this point in the Nigerian academic calendar. Build on what students should have covered in earlier weeks this term.

Generate a detailed pupil note with at least 5 sections (heading, introduction, main content, worked examples, and summary). The content should be what pupils actually copy into their books.${weakTopicNote}`;

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
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

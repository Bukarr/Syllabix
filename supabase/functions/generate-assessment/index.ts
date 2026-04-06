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

    const { subject, classLevel, topic, subTopic, assessmentType, questionCount, difficulty } = await req.json();

    if (!subject || !classLevel || !topic) {
      return new Response(
        JSON.stringify({ error: "subject, classLevel, and topic are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const levelType = classLevel?.startsWith("Primary")
      ? "primary school"
      : classLevel?.startsWith("JSS")
      ? "junior secondary school"
      : "senior secondary school";

    const examFormat = classLevel?.startsWith("SS")
      ? "WAEC/NECO formatting conventions"
      : classLevel?.startsWith("JSS")
      ? "UBE/Basic Education Certificate Examination (BECE) conventions"
      : "UBE/Common Entrance conventions";

    const systemPrompt = `You are an expert Nigerian education assessment specialist. Generate assessments that follow ${examFormat}.

RULES:
- Generate exactly ${questionCount || 10} questions for ${classLevel} ${subject}
- Difficulty level: ${difficulty || 'Medium'}
- Assessment type: ${assessmentType || 'Mixed'}
- Use Nigerian-relevant examples and contexts
- Language must be age-appropriate for ${levelType} students
- DO NOT use any markdown formatting. No asterisks, no hashtags, no underscores, no backticks.
- Use PLAIN TEXT only. Write headings in UPPERCASE.
- Use numbered lists (1. 2. 3.) for questions.
- For objective questions, use letters (A. B. C. D.) for options.

OUTPUT FORMAT:
Return a valid JSON object with this structure:
{
  "title": "Assessment: [Topic] - [Class Level]",
  "instructions": "Clear instructions for students",
  "sections": [
    {
      "type": "objective" or "theory",
      "title": "SECTION A: OBJECTIVE QUESTIONS" or "SECTION B: THEORY QUESTIONS",
      "questions": [
        {
          "number": 1,
          "question": "Question text",
          "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
          "marks": 1
        }
      ]
    }
  ],
  "answerKey": [
    { "number": 1, "answer": "A", "explanation": "Brief explanation" }
  ],
  "totalMarks": 20
}

For theory questions, omit the "options" field and set appropriate marks (e.g., 5 marks).
For mixed type, include both objective and theory sections.
Return ONLY the JSON object. No markdown, no explanation, no code fences.`;

    const userPrompt = `Generate a ${assessmentType || 'mixed'} assessment for:
- Subject: ${subject}
- Class: ${classLevel}
- Topic: ${topic}
${subTopic ? `- Sub-topic: ${subTopic}` : ""}
- Number of questions: ${questionCount || 10}
- Difficulty: ${difficulty || 'Medium'}`;

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
        JSON.stringify({ error: "Failed to generate assessment" }),
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
        JSON.stringify({ error: "Failed to parse generated assessment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-assessment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "lookup_curriculum",
  title: "Look up verified curriculum topics",
  description:
    "Look up verified NERDC-grounded curriculum topics and learning objectives by subject, class level, term and week.",
  inputSchema: {
    subject: z.string().trim().min(1).describe("Subject, e.g. Mathematics."),
    classLevel: z.string().trim().min(1).describe("Class level, e.g. 'JSS 1'."),
    term: z.number().int().min(1).max(3).optional().describe("Term 1-3. Omit for all terms."),
    week: z.number().int().min(1).max(13).optional().describe("Week 1-13. Omit for all weeks."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ subject, classLevel, term, week }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("curriculum_topics")
      .select("subject, class_level, term, week, topic, sub_topic, learning_objectives, source, source_url")
      .eq("subject", subject)
      .eq("class_level", classLevel)
      .eq("verified", true)
      .order("term")
      .order("week")
      .limit(60);
    if (typeof term === "number") query = query.eq("term", term);
    if (typeof week === "number") query = query.eq("week", week);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data?.length) {
      return {
        content: [
          {
            type: "text",
            text: `No verified curriculum found for ${subject} / ${classLevel}. Content for this slot is not curriculum-verified yet.`,
          },
        ],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { topics: data },
    };
  },
});
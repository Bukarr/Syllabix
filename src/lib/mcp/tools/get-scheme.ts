import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_shared_scheme",
  title: "Get a shared scheme of work",
  description:
    "Fetch the full weekly breakdown of one shared scheme of work by its id, including all weekly topics and notes.",
  inputSchema: {
    id: z.string().uuid().describe("The scheme id returned by list_shared_schemes."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("shared_schemes")
      .select("id, subject, class_level, term, year, status, weeks, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "No scheme found with that id in your workspace." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { scheme: data },
    };
  },
});
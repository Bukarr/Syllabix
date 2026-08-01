import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "comment_on_scheme",
  title: "Comment on a shared scheme",
  description:
    "Add a review comment to a shared scheme of work in the signed-in teacher's school workspace.",
  inputSchema: {
    schemeId: z.string().uuid().describe("The scheme id to comment on."),
    comment: z.string().trim().min(1).max(2000).describe("The comment text."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ schemeId, comment }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("scheme_comments")
      .insert({ scheme_id: schemeId, comment, user_id: ctx.getUserId() })
      .select("id, scheme_id, comment, created_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { comment: data },
    };
  },
});
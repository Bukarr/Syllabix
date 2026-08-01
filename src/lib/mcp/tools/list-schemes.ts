import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_shared_schemes",
  title: "List shared schemes of work",
  description:
    "List schemes of work shared in the signed-in teacher's school workspace, optionally filtered by subject, class level, term or status.",
  inputSchema: {
    subject: z.string().trim().min(1).optional().describe("Filter by subject."),
    classLevel: z.string().trim().min(1).optional().describe("Filter by class level, e.g. 'JSS 2'."),
    term: z.number().int().min(1).max(3).optional().describe("Filter by term 1-3."),
    status: z.string().trim().min(1).optional().describe("Filter by review status, e.g. 'pending' or 'approved'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ subject, classLevel, term, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("shared_schemes")
      .select("id, subject, class_level, term, year, status, user_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (subject) query = query.eq("subject", subject);
    if (classLevel) query = query.eq("class_level", classLevel);
    if (typeof term === "number") query = query.eq("term", term);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { schemes: data ?? [] },
    };
  },
});
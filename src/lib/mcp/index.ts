import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfileTool from "./tools/get-profile";
import lookupCurriculumTool from "./tools/lookup-curriculum";
import listSchemesTool from "./tools/list-schemes";
import getSchemeTool from "./tools/get-scheme";
import commentOnSchemeTool from "./tools/comment-on-scheme";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "syllabix",
  title: "Syllabix",
  version: "0.1.0",
  instructions:
    "Tools for Syllabix, an offline-first lesson planning app for Nigerian teachers. Use `lookup_curriculum` for verified NERDC topics and objectives, `list_shared_schemes` and `get_shared_scheme` to read schemes of work shared in the teacher's school workspace, `comment_on_scheme` to leave review feedback, and `get_my_profile` for the signed-in teacher's workspace context.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfileTool,
    lookupCurriculumTool,
    listSchemesTool,
    getSchemeTool,
    commentOnSchemeTool,
  ],
});
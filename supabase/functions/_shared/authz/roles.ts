import { serviceClient } from "../clients.ts";

/** Workspace positions understood by the approval workflow. */
export type WorkspaceRole = "teacher" | "subject_head" | "headmaster" | "director" | "admin" | "other";

export interface Actor {
  userId: string;
  role: WorkspaceRole;
  schoolCode: string;
  displayName: string;
}

/** Positions allowed to submit a lesson plan for review. */
const SUBMITTERS: WorkspaceRole[] = ["teacher", "subject_head", "headmaster", "director", "admin", "other"];
/** Positions allowed to review (subject-head tier and above). */
const REVIEWERS: WorkspaceRole[] = ["subject_head", "headmaster", "director", "admin"];
/** Positions allowed to give final approval (head-teacher tier). */
const APPROVERS: WorkspaceRole[] = ["headmaster", "director", "admin"];

export const canSubmit = (role: WorkspaceRole) => SUBMITTERS.includes(role);
export const canReview = (role: WorkspaceRole) => REVIEWERS.includes(role);
export const canApprove = (role: WorkspaceRole) => APPROVERS.includes(role);

/**
 * Load the caller's workspace identity from their profile.
 * Uses the service client so a reviewer can act on colleagues' plans,
 * while every authorization decision stays server-side.
 */
export async function loadActor(userId: string): Promise<Actor | null> {
  const { data, error } = await serviceClient()
    .from("profiles")
    .select("user_id, role, school_code, display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    userId: data.user_id as string,
    role: ((data.role as string) || "teacher") as WorkspaceRole,
    schoolCode: (data.school_code as string) || "",
    displayName: (data.display_name as string) || "",
  };
}

/** Same-workspace check — reviewers may only act inside their own school. */
export function sameWorkspace(actor: Actor, ownerSchoolCode: string): boolean {
  return actor.schoolCode !== "" && actor.schoolCode === ownerSchoolCode;
}
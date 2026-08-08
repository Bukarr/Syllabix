import { serviceClient } from "../clients.ts";

export interface PlanRow {
  id: string;
  user_id: string;
  local_id: string;
  subject: string;
  class_level: string;
  term: number;
  week: number;
  topic: string;
  status: string;
  plan: Record<string, unknown>;
  deleted: boolean;
}

/** Fetch one plan by id. Returns null when missing or soft-deleted. */
export async function getPlan(id: string): Promise<PlanRow | null> {
  const { data, error } = await serviceClient()
    .from("lesson_plans")
    .select("id, user_id, local_id, subject, class_level, term, week, topic, status, plan, deleted")
    .eq("id", id)
    .maybeSingle();
  if (error || !data || data.deleted) return null;
  return data as PlanRow;
}

/** School code of the plan owner — used for workspace scoping. */
export async function ownerSchoolCode(userId: string): Promise<string> {
  const { data } = await serviceClient()
    .from("profiles")
    .select("school_code")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.school_code as string) ?? "";
}

export async function savePlanState(
  id: string,
  status: string,
  plan: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await serviceClient()
    .from("lesson_plans")
    .update({ status, plan, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}
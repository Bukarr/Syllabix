import { supabase } from '@/integrations/supabase/client';

export type ApprovalStatus = 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';

interface ApprovalResponse {
  id: string;
  status: ApprovalStatus;
}

async function callService(fn: string, body: Record<string, unknown>): Promise<ApprovalResponse> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as ApprovalResponse;
}

/** Teacher submits their own plan for review. */
export const submitLessonPlan = (planId: string, note = '') =>
  callService('lesson-submit', { planId, note });

/** Subject head passes the plan on, or sends it back. */
export const reviewLessonPlan = (planId: string, decision: 'review' | 'reject', note = '') =>
  callService('lesson-review', { planId, decision, note });

/** Head teacher / director gives the final decision. */
export const approveLessonPlan = (planId: string, decision: 'approve' | 'reject', note = '') =>
  callService('lesson-approve', { planId, decision, note });
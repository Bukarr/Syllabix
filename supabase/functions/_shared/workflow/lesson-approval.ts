/** Lifecycle states for a lesson plan moving through school approval. */
export type PlanStatus = "draft" | "submitted" | "reviewed" | "approved" | "rejected";

export type PlanAction = "submit" | "review" | "approve" | "reject";

/** Allowed source states for each action. */
const ALLOWED_FROM: Record<PlanAction, PlanStatus[]> = {
  submit: ["draft", "rejected"],
  review: ["submitted"],
  approve: ["reviewed", "submitted"],
  reject: ["submitted", "reviewed"],
};

const RESULT: Record<PlanAction, PlanStatus> = {
  submit: "submitted",
  review: "reviewed",
  approve: "approved",
  reject: "rejected",
};

export interface TransitionResult {
  ok: boolean;
  next: PlanStatus;
  reason?: string;
}

export function transition(current: string, action: PlanAction): TransitionResult {
  const from = (current || "draft") as PlanStatus;
  if (!ALLOWED_FROM[action].includes(from)) {
    return { ok: false, next: from, reason: `Cannot ${action} a plan that is "${from}".` };
  }
  return { ok: true, next: RESULT[action] };
}

export interface ApprovalEntry {
  action: PlanAction;
  by: string;
  byName: string;
  role: string;
  note: string;
  at: string;
}

/** Append an immutable audit entry to the plan's approval trail. */
export function appendTrail(plan: Record<string, unknown>, entry: ApprovalEntry): Record<string, unknown> {
  const approval = (plan.approval ?? {}) as Record<string, unknown>;
  const history = Array.isArray(approval.history) ? (approval.history as ApprovalEntry[]) : [];
  return {
    ...plan,
    approval: {
      ...approval,
      last: entry,
      history: [...history, entry].slice(-50),
    },
  };
}
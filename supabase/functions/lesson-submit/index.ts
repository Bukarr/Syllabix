import { createService } from "../_shared/service.ts";
import { badRequest, errorResponse, json, serverError } from "../_shared/http/responses.ts";
import { canSubmit, loadActor } from "../_shared/authz/roles.ts";
import { appendTrail, transition } from "../_shared/workflow/lesson-approval.ts";
import { getPlan, savePlanState } from "../_shared/services/lesson-plan-repo.ts";
import { sanitizeText } from "../_shared/validation/sanitize.ts";

/**
 * lesson-submit — a teacher submits their own lesson plan for review.
 * Owns only this action; a failure here cannot affect review or approval.
 */
Deno.serve(
  createService(
    { name: "lesson-submit", requireAuth: true, rateLimit: { max: 30, windowSeconds: 60 } },
    async ({ user, body }) => {
      const planId = sanitizeText(body.planId, 64);
      const note = sanitizeText(body.note, 1000);
      if (!planId) return badRequest("planId is required");

      const actor = await loadActor(user!.id);
      if (!actor) return errorResponse("Profile not found", 403);
      if (!canSubmit(actor.role)) return errorResponse("Your position cannot submit lesson plans", 403);

      const plan = await getPlan(planId);
      if (!plan) return errorResponse("Lesson plan not found", 404);
      if (plan.user_id !== actor.userId) return errorResponse("You can only submit your own lesson plan", 403);

      const step = transition(plan.status, "submit");
      if (!step.ok) return errorResponse(step.reason!, 409);

      const nextPlan = appendTrail(plan.plan ?? {}, {
        action: "submit",
        by: actor.userId,
        byName: actor.displayName,
        role: actor.role,
        note,
        at: new Date().toISOString(),
      });

      const saved = await savePlanState(planId, step.next, nextPlan);
      if (!saved) return serverError("Could not submit lesson plan");

      return json({ id: planId, status: step.next });
    },
  ),
);
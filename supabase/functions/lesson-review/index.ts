import { createService } from "../_shared/service.ts";
import { badRequest, errorResponse, json, serverError } from "../_shared/http/responses.ts";
import { canReview, loadActor, sameWorkspace } from "../_shared/authz/roles.ts";
import { appendTrail, transition } from "../_shared/workflow/lesson-approval.ts";
import { getPlan, ownerSchoolCode, savePlanState } from "../_shared/services/lesson-plan-repo.ts";
import { sanitizeText } from "../_shared/validation/sanitize.ts";

/**
 * lesson-review — a subject head reviews a submitted plan (pass on, or send back).
 * Isolated deployment: only this action fails if this service fails.
 */
Deno.serve(
  createService(
    { name: "lesson-review", requireAuth: true, rateLimit: { max: 30, windowSeconds: 60 } },
    async ({ user, body }) => {
      const planId = sanitizeText(body.planId, 64);
      const note = sanitizeText(body.note, 2000);
      const decision = sanitizeText(body.decision, 16) || "review";
      if (!planId) return badRequest("planId is required");
      if (decision !== "review" && decision !== "reject") {
        return badRequest('decision must be "review" or "reject"');
      }

      const actor = await loadActor(user!.id);
      if (!actor) return errorResponse("Profile not found", 403);
      if (!canReview(actor.role)) return errorResponse("Only subject heads and above can review plans", 403);

      const plan = await getPlan(planId);
      if (!plan) return errorResponse("Lesson plan not found", 404);
      if (plan.user_id === actor.userId) return errorResponse("You cannot review your own lesson plan", 403);

      const school = await ownerSchoolCode(plan.user_id);
      if (!sameWorkspace(actor, school)) return errorResponse("Plan belongs to another workspace", 403);

      const step = transition(plan.status, decision === "reject" ? "reject" : "review");
      if (!step.ok) return errorResponse(step.reason!, 409);

      const nextPlan = appendTrail(plan.plan ?? {}, {
        action: decision === "reject" ? "reject" : "review",
        by: actor.userId,
        byName: actor.displayName,
        role: actor.role,
        note,
        at: new Date().toISOString(),
      });

      const saved = await savePlanState(planId, step.next, nextPlan);
      if (!saved) return serverError("Could not record review");

      return json({ id: planId, status: step.next });
    },
  ),
);
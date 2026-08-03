import { createService } from "../_shared/service.ts";
import { badRequest, json, serverError } from "../_shared/http/responses.ts";
import { apiKey, callGateway, gatewayFailure, parseJsonCompletion } from "../_shared/ai/gateway.ts";
import { groundCurriculum, groundingNote } from "../_shared/services/curriculum.ts";
import { clampNumber, sanitizeList, sanitizeText } from "../_shared/validation/sanitize.ts";
import { systemPrompt, userPrompt, type LessonRequest } from "./prompts.ts";

Deno.serve(
  createService({ name: "generate-lesson", rateLimit: { max: 20, windowSeconds: 60 } }, async ({ user, body }) => {
    const key = apiKey();
    if (!key) return serverError("AI service is not configured");

    const request: LessonRequest = {
      subject: sanitizeText(body.subject, 100),
      classLevel: sanitizeText(body.classLevel, 60),
      topic: sanitizeText(body.topic, 200),
      subTopic: sanitizeText(body.subTopic, 200),
      term: clampNumber(body.term, 1, 3, 1),
      week: clampNumber(body.week, 1, 13, 1),
      resources: sanitizeList(body.resources),
      weakTopics: sanitizeList(body.weakTopics),
    };

    if (!request.subject || !request.classLevel || !request.topic) {
      return badRequest("Subject, class level and topic are required");
    }

    const grounding = await groundCurriculum({ ...request, userId: user?.id ?? "anonymous" });

    const response = await callGateway(
      [
        { role: "system", content: systemPrompt(request) },
        { role: "user", content: userPrompt(request) + groundingNote(grounding) },
      ],
      { key },
    );

    const failure = gatewayFailure(response, "generate lesson note");
    if (failure) return failure;

    const content = (await response.json())?.choices?.[0]?.message?.content;
    if (!content) return serverError("No content generated");

    const parsed = parseJsonCompletion<Record<string, unknown>>(content);
    if (!parsed) return serverError("Failed to parse generated content");

    parsed.grounded = grounding.grounded;
    parsed.groundingSource = grounding.grounded ? grounding.source : null;
    if (grounding.grounded && grounding.objectives.length) parsed.objectives = grounding.objectives;

    return json(parsed);
  }),
);

import { serviceClient } from "../clients.ts";

export interface CurriculumGrounding {
  grounded: boolean;
  source: string | null;
  topic: string;
  subTopic: string;
  objectives: string[];
}

/**
 * Look up the verified NERDC record for a curriculum slot.
 * Logs a coverage gap when nothing verified exists, so seeding can be expanded.
 */
export async function groundCurriculum(params: {
  subject: string;
  classLevel: string;
  term: number;
  week: number;
  topic: string;
  subTopic: string;
  userId: string;
}): Promise<CurriculumGrounding> {
  const fallback: CurriculumGrounding = {
    grounded: false,
    source: null,
    topic: params.topic,
    subTopic: params.subTopic,
    objectives: [],
  };

  const svc = serviceClient();
  try {
    const { data } = await svc
      .from("curriculum_topics")
      .select("topic, sub_topic, learning_objectives, source, verified")
      .eq("subject", params.subject)
      .eq("class_level", params.classLevel)
      .eq("term", params.term)
      .eq("week", params.week)
      .eq("verified", true)
      .maybeSingle();

    if (!data) {
      await svc.from("curriculum_gaps").insert({
        subject: params.subject,
        class_level: params.classLevel,
        term: params.term,
        week: params.week,
        user_id: params.userId,
      });
      return fallback;
    }

    return {
      grounded: true,
      source: data.source ?? "NERDC",
      topic: data.topic || params.topic,
      subTopic: data.sub_topic || params.subTopic,
      objectives: Array.isArray(data.learning_objectives) ? data.learning_objectives : [],
    };
  } catch (e) {
    console.error("curriculum grounding lookup failed:", e);
    return fallback;
  }
}

/** The grounding instruction appended to the model prompt. */
export function groundingNote(g: CurriculumGrounding): string {
  if (!g.grounded) {
    return `\n\nNOTE: No verified curriculum record exists for this exact slot. Generate the most NERDC-consistent content you can, but this output is NOT curriculum-verified.`;
  }
  return `\n\nGROUNDED CURRICULUM DATA (authoritative — align strictly to this): Topic "${g.topic}"${
    g.subTopic ? `, sub-topic "${g.subTopic}"` : ""
  }, source ${g.source}. Required learning objectives: ${
    g.objectives.length ? g.objectives.join("; ") : "(derive from the verified topic)"
  }.`;
}
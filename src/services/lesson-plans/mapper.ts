import type { LessonPlan, RemoteLessonPlan } from './types';

/** Local IndexedDB record -> cloud row payload (without user_id). */
export function toRemotePayload(plan: LessonPlan, userId: string, deleted = false) {
  return {
    user_id: userId,
    local_id: plan.id,
    subject: plan.subject ?? '',
    class_level: plan.classLevel ?? '',
    term: plan.term ?? 1,
    week: plan.week ?? 1,
    topic: plan.topic ?? '',
    status: plan.status ?? 'draft',
    plan: plan as unknown as Record<string, unknown>,
    deleted,
    updated_at: plan.updatedAt || new Date().toISOString(),
  };
}

/** Cloud row -> local IndexedDB record. */
export function toLocalPlan(row: RemoteLessonPlan): LessonPlan {
  const stored = (row.plan ?? {}) as Partial<LessonPlan>;
  return {
    id: row.local_id,
    subject: stored.subject ?? row.subject,
    classLevel: stored.classLevel ?? row.class_level,
    term: stored.term ?? row.term,
    week: stored.week ?? row.week,
    date: stored.date ?? '',
    duration: stored.duration ?? '',
    topic: stored.topic ?? row.topic,
    subTopic: stored.subTopic ?? '',
    objectives: stored.objectives ?? [],
    entryBehaviour: stored.entryBehaviour ?? '',
    materials: stored.materials ?? [],
    references: stored.references ?? '',
    steps: stored.steps ?? [],
    evaluation: stored.evaluation ?? '',
    assignment: stored.assignment ?? '',
    status: (stored.status as LessonPlan['status']) ?? (row.status as LessonPlan['status']) ?? 'draft',
    createdAt: stored.createdAt ?? row.created_at,
    updatedAt: stored.updatedAt ?? row.updated_at,
  };
}
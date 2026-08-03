import { enqueueSync } from '@/lib/sync-queue';
import { localLessonPlans } from './local-repository';
import { remoteLessonPlans } from './remote-repository';
import type { LessonPlan } from './types';

export { localLessonPlans } from './local-repository';
export { remoteLessonPlans } from './remote-repository';
export { processLessonPlanOp, pullLessonPlans } from './sync';
export type { LessonPlan, RemoteLessonPlan } from './types';

async function isReachable(): Promise<boolean> {
  return typeof navigator === 'undefined' ? false : navigator.onLine;
}

/**
 * Save a lesson plan offline-first: IndexedDB always succeeds, then the change
 * is mirrored to the cloud immediately when online, or queued for later.
 */
export async function saveLessonPlanOfflineFirst(plan: LessonPlan): Promise<void> {
  await localLessonPlans.save(plan);

  const userId = await remoteLessonPlans.currentUserId().catch(() => null);
  if (!userId) return; // anonymous — stays local only

  if (await isReachable()) {
    try {
      await remoteLessonPlans.upsert(plan, userId);
      return;
    } catch {
      /* fall through to the queue */
    }
  }
  await enqueueSync({
    table: 'lesson_plans',
    action: 'update',
    payload: {},
    matchColumn: 'local_id',
    matchValue: plan.id,
  });
}

/** Delete offline-first, mirroring a soft delete to the cloud when possible. */
export async function deleteLessonPlanOfflineFirst(id: string): Promise<void> {
  await localLessonPlans.remove(id);

  const userId = await remoteLessonPlans.currentUserId().catch(() => null);
  if (!userId) return;

  if (await isReachable()) {
    try {
      await remoteLessonPlans.markDeleted(id, userId);
      return;
    } catch {
      /* fall through to the queue */
    }
  }
  await enqueueSync({
    table: 'lesson_plans',
    action: 'delete',
    payload: {},
    matchColumn: 'local_id',
    matchValue: id,
  });
}
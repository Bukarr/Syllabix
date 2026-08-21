import { localLessonPlans } from './local-repository';
import { remoteLessonPlans } from './remote-repository';
import { toLocalPlan } from './mapper';
import type { SyncOperation } from '@/lib/sync-queue';

const LAST_PULL_KEY = 'syllabix:lesson-plans-last-pull';

function readLastPull(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem(LAST_PULL_KEY) ?? undefined;
}

function writeLastPull(iso: string) {
  try {
    window.localStorage.setItem(LAST_PULL_KEY, iso);
  } catch {
    /* storage full or blocked — the next pull just re-reads everything */
  }
}

/**
 * Push one queued lesson-plan operation to the cloud.
 * The queue stores only the local id, so the freshest local record is sent.
 */
export async function processLessonPlanOp(op: SyncOperation): Promise<boolean> {
  const localId = op.matchValue;
  if (!localId) return true;
  const userId = await remoteLessonPlans.currentUserId();
  // No session: nothing to sync to. Drop the op — the plan stays safe offline.
  if (!userId) return true;

  try {
    if (op.action === 'delete') {
      await remoteLessonPlans.markDeleted(localId, userId);
      return true;
    }
    const plan = await localLessonPlans.get(localId);
    if (!plan) return true;
    await remoteLessonPlans.upsert(plan, userId);
    return true;
  } catch (err) {
    console.error('[LessonPlanSync] push failed', (err as Error)?.message);
    return false;
  }
}

/**
 * Pull cloud changes into IndexedDB using last-write-wins on `updatedAt`.
 * Safe to call on every reconnect — it only fetches rows changed since the last pull.
 */
export async function pullLessonPlans(): Promise<number> {
  const userId = await remoteLessonPlans.currentUserId();
  if (!userId) return 0;

  const rows = await remoteLessonPlans.listSince(userId, readLastPull());
  let applied = 0;
  let newest = readLastPull() ?? '';

  for (const row of rows) {
    if (row.updated_at > newest) newest = row.updated_at;
    const existing = await localLessonPlans.get(row.local_id);

    if (row.deleted) {
      if (existing) {
        await localLessonPlans.remove(row.local_id);
        applied++;
      }
      continue;
    }

    const incoming = toLocalPlan(row);
    if (!existing || new Date(incoming.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
      await localLessonPlans.save(incoming);
      applied++;
    }
  }

  if (newest) writeLastPull(newest);
  return applied;
}
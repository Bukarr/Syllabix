import {
  getAllLessonPlans,
  saveLessonPlan as saveLocalPlan,
  deleteLessonPlan as deleteLocalPlan,
} from '@/lib/db';
import type { LessonPlan } from './types';

/**
 * Offline source of truth for lesson plans (IndexedDB).
 * Every read/write in the app goes through this repository so the UI never
 * depends on connectivity.
 */
export const localLessonPlans = {
  list: (): Promise<LessonPlan[]> => getAllLessonPlans(),
  async get(id: string): Promise<LessonPlan | undefined> {
    const all = await getAllLessonPlans();
    return all.find(p => p.id === id);
  },
  save: (plan: LessonPlan): Promise<void> => saveLocalPlan(plan),
  remove: (id: string): Promise<void> => deleteLocalPlan(id),
};
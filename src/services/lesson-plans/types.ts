import type { LessonPlan } from '@/lib/db';

export type { LessonPlan };

/** Shape of a `public.lesson_plans` row as stored in the cloud. */
export interface RemoteLessonPlan {
  id: string;
  user_id: string;
  local_id: string;
  subject: string;
  class_level: string;
  term: number;
  week: number;
  topic: string;
  status: string;
  plan: Record<string, unknown>;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}
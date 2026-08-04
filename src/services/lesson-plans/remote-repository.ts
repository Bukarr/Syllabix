import { supabase } from '@/integrations/supabase/client';
import type { LessonPlan, RemoteLessonPlan } from './types';
import { toRemotePayload } from './mapper';

/** Cloud persistence for lesson plans. Only used when a session exists and the device is online. */
export const remoteLessonPlans = {
  async currentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  },

  async listSince(userId: string, since?: string): Promise<RemoteLessonPlan[]> {
    let query = supabase
      .from('lesson_plans')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(500);
    if (since) query = query.gt('updated_at', since);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as RemoteLessonPlan[];
  },

  async upsert(plan: LessonPlan, userId: string, deleted = false): Promise<void> {
    const { error } = await supabase
      .from('lesson_plans')
      .upsert(toRemotePayload(plan, userId, deleted) as never, { onConflict: 'user_id,local_id' });
    if (error) throw error;
  },

  async markDeleted(localId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('lesson_plans')
      .update({ deleted: true, updated_at: new Date().toISOString() } as never)
      .eq('user_id', userId)
      .eq('local_id', localId);
    if (error) throw error;
  },
};
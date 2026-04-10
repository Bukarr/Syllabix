import { supabase } from '@/integrations/supabase/client';

/** Log a user activity event for AI personalization */
export async function trackActivity(params: {
  feature: string;
  subject?: string;
  classLevel?: string;
  topic?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_activity').insert({
      user_id: user.id,
      feature: params.feature,
      subject: params.subject || null,
      class_level: params.classLevel || null,
      topic: params.topic || null,
      metadata: params.metadata || {},
    } as any);
  } catch {
    // Silent fail — tracking should never block UX
  }
}

/** Fetch AI-generated suggestions for the current user */
export async function fetchSuggestions() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { suggestions: [], featureOrder: [] };

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-suggestions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });

    if (!resp.ok) return { suggestions: [], featureOrder: [] };
    return await resp.json();
  } catch {
    return { suggestions: [], featureOrder: [] };
  }
}

/** Dismiss a suggestion */
export async function dismissSuggestion(id: string) {
  await supabase
    .from('ai_suggestions')
    .update({ dismissed: true } as any)
    .eq('id', id);
}

/** Get cached suggestions from DB */
export async function getCachedSuggestions() {
  const { data } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('dismissed', false)
    .order('priority', { ascending: false })
    .limit(5);
  return (data || []) as any[];
}

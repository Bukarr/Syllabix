import { supabase } from '@/integrations/supabase/client';

export type ApiResult<T> = { ok: boolean; status: number; data?: T; error?: string };

async function callFunction<T = any>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const url = `${location.origin}/functions/v1/${path}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
  } catch {
    // ignore
  }
  // include publishable key for Supabase function auth where needed
  if (!headers.has('apikey') && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    headers.set('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  }

  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  const contentType = res.headers.get('Content-Type') || '';
  let data: any = undefined;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => undefined);
  } else if (contentType.includes('text/event-stream')) {
    return { ok: true, status: res.status, data: undefined };
  } else {
    data = await res.text().catch(() => undefined);
  }
  if (!res.ok) return { ok: false, status: res.status, error: data?.error || String(data) };
  return { ok: true, status: res.status, data };
}

export async function getAiSuggestions() {
  return callFunction('/ai-suggestions', { method: 'POST', body: JSON.stringify({}) });
}

export async function generateLesson(payload: any) {
  return callFunction('/generate-lesson', { method: 'POST', body: JSON.stringify(payload) });
}

export async function generateAssessment(payload: any) {
  return callFunction('/generate-assessment', { method: 'POST', body: JSON.stringify(payload) });
}

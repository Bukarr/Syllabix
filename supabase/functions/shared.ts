import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function getCorsHeaders(req: Request) {
  const origin = (req.headers.get('origin') || '').toString();
  const allowedEnv = Deno.env.get('APP_ALLOWED_ORIGINS') || '';
  const allowed = allowedEnv.split(',').map(s => s.trim()).filter(Boolean);
  const allowOrigin = allowed.length === 0 ? '*' : (allowed.includes(origin) ? origin : allowed[0]);
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

export async function verifyUserAndRateLimit(req: Request, endpoint: string, _max = 20, _window_seconds = 60) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('UNAUTHORIZED');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('UNAUTHORIZED');

  const svc = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: allowed } = await svc.rpc('check_and_increment_rate_limit', {
    _identifier: user.id,
    _endpoint: endpoint,
    _max,
    _window_seconds,
  });
  if (allowed === false) {
    try { recordMetric(`rate_limit.${endpoint}`); } catch {}
    throw new Error('RATE_LIMIT');
  }

  return { user, supabase, svc } as const;
}

export function sanitizeString(s: unknown, max = 300) {
  return typeof s === 'string' ? s.replace(/[[\x00-\x1F\x7F]]/g, '').slice(0, max) : '';
}

export function logError(context: string, err: unknown) {
  try {
    console.error(JSON.stringify({ time: new Date().toISOString(), context, error: (err && (err as any).stack) ? (err as any).stack : String(err) }));
  } catch (e) {
    console.error('logError failed', context, err, e);
  }
}

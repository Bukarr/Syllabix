import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitize = (s: unknown, max = 300): string =>
      typeof s === 'string' ? s.replace(/[\x00-\x1F\x7F]/g, '').slice(0, max) : '';

    const body = await req.json();
    const subject = sanitize(body.subject, 100);
    const classLevel = sanitize(body.classLevel, 50);
    const topic = sanitize(body.topic, 200);

    if (!subject || !topic) {
      return new Response(JSON.stringify({ error: 'Subject and topic are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a Nigerian education resource specialist. Generate exactly 3 free, open-access educational resource recommendations for Nigerian teachers.

RULES:
- Only recommend resources that are genuinely free and open-access
- No paywalled content, no login-required content
- Prefer: YouTube educational channels, Khan Academy, NOUN Open Courseware, CK-12, OpenStax, BBC Bitesize, government educational portals
- Each resource must have a plausible real URL
- Return ONLY a JSON array, no markdown, no extra text

FORMAT: [{"title": "...", "type": "Video|Article|Worksheet", "source": "...", "url": "https://...", "description": "1-2 sentence description of how it supports the lesson"}]`
          },
          {
            role: 'user',
            content: `Recommend 3 free teaching resources for Nigerian ${classLevel} students studying ${subject}, Topic: ${topic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: 'AI service error', resources: [] }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    let resources;
    try {
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      resources = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      resources = [];
    }

    return new Response(JSON.stringify({ resources }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("generate-resources error:", error);
    return new Response(JSON.stringify({ error: 'Internal server error', resources: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

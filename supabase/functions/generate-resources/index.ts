import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { subject, classLevel, topic } = await req.json();

    if (!subject || !topic) {
      return new Response(JSON.stringify({ error: 'Subject and topic are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
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
      throw new Error(`AI gateway error: ${response.status}`);
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
    return new Response(JSON.stringify({ error: error.message, resources: [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

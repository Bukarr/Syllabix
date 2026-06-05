import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const svc = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: allowed } = await svc.rpc('check_and_increment_rate_limit', {
      _identifier: user.id,
      _endpoint: 'ai-suggestions',
      _max: 20,
      _window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    // Fetch user activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activities } = await supabase
      .from('user_activity')
      .select('feature, subject, class_level, topic, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(200);

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, role')
      .eq('user_id', user.id)
      .single();

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build activity summary for AI
    const featureCounts: Record<string, number> = {};
    const subjectCounts: Record<string, number> = {};
    const recentTopics: string[] = [];

    (activities || []).forEach((a: any) => {
      featureCounts[a.feature] = (featureCounts[a.feature] || 0) + 1;
      if (a.subject) subjectCounts[a.subject] = (subjectCounts[a.subject] || 0) + 1;
      if (a.topic && recentTopics.length < 10) recentTopics.push(a.topic);
    });

    const activitySummary = {
      totalActivities: (activities || []).length,
      featureCounts,
      subjectCounts,
      recentTopics,
      daysSinceLastActivity: activities?.length
        ? Math.floor((Date.now() - new Date(activities[0].created_at).getTime()) / 86400000)
        : null,
    };

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
            content: `You are an AI assistant for Syllabix NG, a Nigerian teacher productivity app. Based on the teacher's usage patterns, generate 3-5 personalized suggestions.

Each suggestion must be one of these types:
- "lesson": Suggest a lesson to create next
- "curriculum_gap": Highlight a subject/topic they haven't covered
- "review": Suggest reviewing/improving an existing lesson
- "explore": Suggest exploring an app feature they haven't used much
- "streak": Motivational nudge about consistency

App features: lesson-plan (create lesson notes), ai-notes (AI copy notes), scheme (scheme of work), class-tracker (student tracking), reviewer (lesson quality review), templates (lesson templates), portfolio (teaching portfolio), collaborate (school collaboration)

Return ONLY a JSON array:
[{"type":"...", "title":"Short title", "description":"1-2 sentences", "action_route":"/route", "action_data":{}, "priority": 1-5}]

Priority 5 = most urgent. action_route must be a valid app route. action_data can include subject, classLevel, topic for pre-filling forms.`
          },
          {
            role: 'user',
            content: `Teacher: ${profile?.display_name || 'Teacher'}, Role: ${profile?.role || 'teacher'}

Activity summary (last 30 days): ${JSON.stringify(activitySummary)}

Generate personalized suggestions based on their usage patterns.`
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, try again later' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    let suggestions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      suggestions = [];
    }

    // Store suggestions in DB
    if (suggestions.length > 0) {
      // Clear old undismissed suggestions
      await supabase
        .from('ai_suggestions')
        .delete()
        .eq('user_id', user.id)
        .eq('dismissed', false);

      const rows = suggestions.map((s: any) => ({
        user_id: user.id,
        type: s.type || 'explore',
        title: s.title || '',
        description: s.description || '',
        action_route: s.action_route || '/',
        action_data: s.action_data || {},
        priority: s.priority || 1,
      }));

      await supabase.from('ai_suggestions').insert(rows);
    }

    // Also return dashboard ordering based on usage
    const featureOrder = Object.entries(featureCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([feature]) => feature);

    return new Response(JSON.stringify({ suggestions, featureOrder, activitySummary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("ai-suggestions error:", error);
    return new Response(JSON.stringify({ error: 'Internal server error', suggestions: [] }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

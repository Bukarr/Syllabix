
-- Track user activity patterns for AI personalization
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  subject text,
  class_level text,
  topic text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON public.user_activity
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON public.user_activity
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_activity_user ON public.user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_feature ON public.user_activity(user_id, feature);

-- Store AI-generated suggestions
CREATE TABLE public.ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  action_route text,
  action_data jsonb DEFAULT '{}'::jsonb,
  priority integer DEFAULT 0,
  dismissed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions" ON public.ai_suggestions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suggestions" ON public.ai_suggestions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions" ON public.ai_suggestions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suggestions" ON public.ai_suggestions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_ai_suggestions_user ON public.ai_suggestions(user_id, dismissed, priority DESC);

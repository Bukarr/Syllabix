CREATE TABLE public.lesson_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id text NOT NULL,
  subject text NOT NULL DEFAULT '',
  class_level text NOT NULL DEFAULT '',
  term integer NOT NULL DEFAULT 1,
  week integer NOT NULL DEFAULT 1,
  topic text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_plans TO authenticated;
GRANT ALL ON public.lesson_plans TO service_role;

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lesson plans"
  ON public.lesson_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lesson plans"
  ON public.lesson_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lesson plans"
  ON public.lesson_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lesson plans"
  ON public.lesson_plans FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX lesson_plans_user_updated_idx ON public.lesson_plans (user_id, updated_at DESC);

CREATE TRIGGER update_lesson_plans_updated_at
  BEFORE UPDATE ON public.lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
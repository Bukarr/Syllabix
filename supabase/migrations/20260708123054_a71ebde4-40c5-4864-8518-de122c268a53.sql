-- 1. Fix cross-workspace comment injection
DROP POLICY IF EXISTS "Add comments" ON public.scheme_comments;
CREATE POLICY "Add comments"
ON public.scheme_comments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.shared_schemes s
    WHERE s.id = scheme_comments.scheme_id
      AND s.school_code = private.get_my_school_code()
  )
);

-- 2. Fix cross-workspace scheme injection
DROP POLICY IF EXISTS "Create shared schemes" ON public.shared_schemes;
CREATE POLICY "Create shared schemes"
ON public.shared_schemes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND school_code = private.get_my_school_code()
  AND school_code <> ''
);

-- 3. Curriculum grounding infrastructure
CREATE TABLE public.curriculum_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  class_level text NOT NULL,
  term integer NOT NULL CHECK (term BETWEEN 1 AND 3),
  week integer NOT NULL CHECK (week BETWEEN 1 AND 13),
  topic text NOT NULL,
  sub_topic text,
  learning_objectives text[],
  source text NOT NULL DEFAULT 'NERDC',
  source_url text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject, class_level, term, week)
);

GRANT SELECT ON public.curriculum_topics TO authenticated, anon;
GRANT ALL ON public.curriculum_topics TO service_role;
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read curriculum"
ON public.curriculum_topics FOR SELECT
TO authenticated, anon
USING (true);

CREATE TRIGGER update_curriculum_topics_updated_at
BEFORE UPDATE ON public.curriculum_topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_curriculum_lookup
ON public.curriculum_topics (subject, class_level, term, week);

-- 4. Gap log: records requested combinations that have no grounded data
CREATE TABLE public.curriculum_gaps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  class_level text NOT NULL,
  term integer,
  week integer,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.curriculum_gaps TO authenticated;
GRANT ALL ON public.curriculum_gaps TO service_role;
ALTER TABLE public.curriculum_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own gaps"
ON public.curriculum_gaps FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own gaps"
ON public.curriculum_gaps FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
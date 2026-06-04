-- Scalability: indexes on hot query columns (user- and school-scoped reads)

-- ai_suggestions: fetched per user, filtered by dismissed/expiry, ordered by priority
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_active
  ON public.ai_suggestions (user_id, dismissed, expires_at);

-- user_activity: read and inserted per user, ordered by recency
CREATE INDEX IF NOT EXISTS idx_user_activity_user_created
  ON public.user_activity (user_id, created_at DESC);

-- shared_schemes: school-wide listing + per-user filtering
CREATE INDEX IF NOT EXISTS idx_shared_schemes_school
  ON public.shared_schemes (school_code);
CREATE INDEX IF NOT EXISTS idx_shared_schemes_user
  ON public.shared_schemes (user_id);

-- scheme_comments: looked up per scheme
CREATE INDEX IF NOT EXISTS idx_scheme_comments_scheme
  ON public.scheme_comments (scheme_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheme_comments_user
  ON public.scheme_comments (user_id);

-- profiles: school workspace lookups (school_code = get_my_school_code())
CREATE INDEX IF NOT EXISTS idx_profiles_school_code
  ON public.profiles (school_code);

-- support_messages: per-user history
CREATE INDEX IF NOT EXISTS idx_support_messages_user_created
  ON public.support_messages (user_id, created_at DESC);
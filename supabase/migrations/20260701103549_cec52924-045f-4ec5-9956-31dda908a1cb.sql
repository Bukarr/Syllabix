-- 1) api_rate_limits: RLS is enabled but has no policy. It is only accessed via the
--    SECURITY DEFINER function check_and_increment_rate_limit. Add an explicit
--    deny-all policy so direct access from anon/authenticated is blocked and the
--    "RLS enabled, no policy" finding is resolved.
CREATE POLICY "No direct access to rate limits"
ON public.api_rate_limits
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 2) Harden school_code against enumeration: require non-empty school codes to be
--    sufficiently long (>= 6 chars) so they are not trivially guessable. This runs
--    on insert/update of profiles and leaves empty codes (no workspace) untouched.
CREATE OR REPLACE FUNCTION public.validate_school_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.school_code IS NOT NULL
     AND NEW.school_code <> ''
     AND char_length(NEW.school_code) < 6 THEN
    RAISE EXCEPTION 'School code must be at least 6 characters';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_school_code_trigger ON public.profiles;
CREATE TRIGGER validate_school_code_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_school_code();
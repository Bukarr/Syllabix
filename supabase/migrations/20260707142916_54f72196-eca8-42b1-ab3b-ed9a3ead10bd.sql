
-- Create a private schema that is NOT exposed by the Data API (PostgREST only exposes public)
CREATE SCHEMA IF NOT EXISTS private;

-- Recreate RLS-helper SECURITY DEFINER functions inside the private schema
CREATE OR REPLACE FUNCTION private.get_my_school_code()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT school_code FROM public.profiles WHERE user_id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION private.get_user_school_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT school_code FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION private.is_workspace_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'headmaster', 'director')
  );
$function$;

-- Lock down execute: private schema is not exposed to the API. Grant execute only to
-- authenticated (needed so RLS policy evaluation can call these) and service_role.
REVOKE ALL ON FUNCTION private.get_my_school_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_user_school_code(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_workspace_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_my_school_code() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_school_code(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_workspace_admin() TO authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Re-point RLS policies to the private helpers
DROP POLICY IF EXISTS "Users can view same school profiles" ON public.profiles;
CREATE POLICY "Users can view same school profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR ((school_code <> ''::text) AND (school_code = private.get_my_school_code())));

DROP POLICY IF EXISTS "Update own shared schemes" ON public.shared_schemes;
CREATE POLICY "Update own shared schemes"
ON public.shared_schemes
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR private.is_workspace_admin())
WITH CHECK ((((auth.uid() = user_id) AND ((status <> 'approved'::text) OR private.is_workspace_admin())) OR private.is_workspace_admin()));

DROP POLICY IF EXISTS "View shared schemes in same school" ON public.shared_schemes;
CREATE POLICY "View shared schemes in same school"
ON public.shared_schemes
FOR SELECT
TO authenticated
USING (school_code = private.get_user_school_code(auth.uid()));

DROP POLICY IF EXISTS "View comments on accessible schemes" ON public.scheme_comments;
CREATE POLICY "View comments on accessible schemes"
ON public.scheme_comments
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.shared_schemes s
  WHERE ((s.id = scheme_comments.scheme_id) AND (s.school_code = private.get_user_school_code(auth.uid())))
));

-- Re-point the realtime authorization policy
DROP POLICY IF EXISTS "Authenticated users can receive school-scoped realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can receive school-scoped realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING ((realtime.topic() = ('school:'::text || private.get_my_school_code())) OR (realtime.topic() = ('user:'::text || (auth.uid())::text)));

-- Drop the now-unreferenced public SECURITY DEFINER helpers (only used by RLS above)
DROP FUNCTION IF EXISTS public.get_my_school_code();
DROP FUNCTION IF EXISTS public.get_user_school_code(uuid);
DROP FUNCTION IF EXISTS public.is_workspace_admin();

-- Drop unused SECURITY DEFINER helpers that were exposed via the API but never called
DROP FUNCTION IF EXISTS public.get_my_current_school_code();
DROP FUNCTION IF EXISTS public.get_my_profile_role();

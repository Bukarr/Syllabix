-- Allow admins, headmasters, and directors to manage roles within their workspace.

-- 1) Update the privilege-change trigger so privileged roles can change roles.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
BEGIN
  -- Only gate role changes. school_code changes are always permitted.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT role INTO caller_role FROM public.profiles WHERE user_id = auth.uid();
    IF caller_role IS NULL OR caller_role NOT IN ('admin', 'headmaster', 'director') THEN
      RAISE EXCEPTION 'Not permitted to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Make sure the trigger is actually attached.
DROP TRIGGER IF EXISTS profiles_prevent_privilege_change ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_change();

-- 2) RPC for privileged users to set another member's role within the same workspace.
CREATE OR REPLACE FUNCTION public.set_member_role(_target_user_id uuid, _new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
  caller_school text;
  target_school text;
BEGIN
  IF _new_role NOT IN ('teacher', 'headmaster', 'director', 'admin', 'other') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT role, school_code INTO caller_role, caller_school
  FROM public.profiles WHERE user_id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'headmaster', 'director') THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  SELECT school_code INTO target_school
  FROM public.profiles WHERE user_id = _target_user_id;

  IF target_school IS NULL OR caller_school IS NULL OR target_school <> caller_school THEN
    RAISE EXCEPTION 'Target is not in your workspace';
  END IF;

  UPDATE public.profiles SET role = _new_role WHERE user_id = _target_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_member_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, text) TO authenticated;

-- 3) Helper to check if the current user has elevated workspace privileges.
CREATE OR REPLACE FUNCTION public.is_workspace_admin()
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

-- 4) Broaden shared_schemes approval policy to include the same roles.
DROP POLICY IF EXISTS "Update own shared schemes" ON public.shared_schemes;
CREATE POLICY "Update own shared schemes"
ON public.shared_schemes
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_workspace_admin()
)
WITH CHECK (
  (auth.uid() = user_id AND (status <> 'approved' OR public.is_workspace_admin()))
  OR public.is_workspace_admin()
);
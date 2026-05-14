
-- 1. Tighten shared_schemes update policy: non-admins cannot set status to 'approved'
DROP POLICY IF EXISTS "Update own shared schemes" ON public.shared_schemes;
CREATE POLICY "Update own shared schemes"
ON public.shared_schemes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (status <> 'approved' OR public.get_my_profile_role() = 'admin')
);

-- 2. Prevent self role / school_code escalation on profiles via trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.school_code IS DISTINCT FROM OLD.school_code THEN
    SELECT role INTO caller_role FROM public.profiles WHERE user_id = auth.uid();
    IF caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Not permitted to change role or school_code';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_change ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_change();

-- Lock down profiles UPDATE policy so role/school_code cannot be touched at all unless admin
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Revoke EXECUTE on SECURITY DEFINER helpers from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.get_my_school_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_school_code(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_profile_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_current_school_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_change() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_school_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_school_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_current_school_code() TO authenticated;

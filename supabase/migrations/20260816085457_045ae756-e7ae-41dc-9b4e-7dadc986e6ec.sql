DROP FUNCTION IF EXISTS public.set_member_role(uuid, text);

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Trusted server-side services (edge functions) perform their own
    -- authorization before changing roles.
    IF auth.uid() IS NULL AND current_setting('request.jwt.claims', true) IS NULL THEN
      RETURN NEW;
    END IF;
    SELECT role INTO caller_role FROM public.profiles WHERE user_id = auth.uid();
    IF caller_role IS NULL OR caller_role NOT IN ('admin', 'headmaster', 'director') THEN
      RAISE EXCEPTION 'Not permitted to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
BEGIN
  -- Only block role escalation by non-admins.
  -- Users ARE allowed to change their own school_code (e.g. to join a workspace).
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT role INTO caller_role FROM public.profiles WHERE user_id = auth.uid();
    IF caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Not permitted to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
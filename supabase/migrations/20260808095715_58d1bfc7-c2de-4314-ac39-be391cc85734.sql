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
  IF _new_role NOT IN ('teacher', 'subject_head', 'headmaster', 'director', 'admin', 'other') THEN
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
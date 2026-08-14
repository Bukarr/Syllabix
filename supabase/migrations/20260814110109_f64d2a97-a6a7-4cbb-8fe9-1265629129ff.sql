CREATE TABLE IF NOT EXISTS public.app_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_admins TO authenticated;
GRANT ALL ON public.app_admins TO service_role;

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = _user_id);
$$;

REVOKE ALL ON FUNCTION private.is_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_super_admin(uuid) TO authenticated, service_role;

CREATE POLICY "Super admins can view admin list"
ON public.app_admins FOR SELECT TO authenticated
USING (private.is_super_admin(auth.uid()));

INSERT INTO public.app_admins (user_id, note)
SELECT id, 'Founder / super admin'
FROM auth.users
WHERE lower(email) = 'sahdheeq1001@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
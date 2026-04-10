-- Use a security definer function to get current profile values (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.get_my_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_current_school_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_code FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Drop and recreate the UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = public.get_my_profile_role()
  AND school_code = public.get_my_current_school_code()
);
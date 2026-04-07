
-- Create a SECURITY DEFINER function to get current user's school code without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_school_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_code FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view same school profiles" ON public.profiles;

-- Recreate it using the SECURITY DEFINER function
CREATE POLICY "Users can view same school profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    school_code <> ''
    AND school_code = public.get_my_school_code()
  )
);

-- Drop the old simple self-view policy (now covered by the combined policy above)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

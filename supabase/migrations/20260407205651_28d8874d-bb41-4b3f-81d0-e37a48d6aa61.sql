
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  school_code TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can view profiles in same school
CREATE POLICY "Users can view same school profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  school_code != '' AND
  school_code = (SELECT p.school_code FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Shared schemes table
CREATE TABLE public.shared_schemes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_code TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_level TEXT NOT NULL,
  term INTEGER NOT NULL CHECK (term BETWEEN 1 AND 3),
  year TEXT NOT NULL,
  weeks JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'shared', 'approved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_schemes ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user's school code
CREATE OR REPLACE FUNCTION public.get_user_school_code(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_code FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE POLICY "View shared schemes in same school"
ON public.shared_schemes FOR SELECT
TO authenticated
USING (school_code = public.get_user_school_code(auth.uid()));

CREATE POLICY "Create shared schemes"
ON public.shared_schemes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own shared schemes"
ON public.shared_schemes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Delete own shared schemes"
ON public.shared_schemes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Scheme comments table
CREATE TABLE public.scheme_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheme_id UUID NOT NULL REFERENCES public.shared_schemes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheme_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View comments on accessible schemes"
ON public.scheme_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shared_schemes s
    WHERE s.id = scheme_id
    AND s.school_code = public.get_user_school_code(auth.uid())
  )
);

CREATE POLICY "Add comments"
ON public.scheme_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own comments"
ON public.scheme_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_profiles_school_code ON public.profiles(school_code);
CREATE INDEX idx_shared_schemes_school_code ON public.shared_schemes(school_code);
CREATE INDEX idx_scheme_comments_scheme_id ON public.scheme_comments(scheme_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shared_schemes_updated_at
  BEFORE UPDATE ON public.shared_schemes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_schemes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheme_comments;

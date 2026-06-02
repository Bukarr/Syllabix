CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.support_messages TO anon;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit support messages"
ON public.support_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(message) > 0
  AND char_length(message) <= 5000
  AND char_length(name) <= 200
  AND char_length(email) <= 320
);

CREATE POLICY "Users can view their own support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

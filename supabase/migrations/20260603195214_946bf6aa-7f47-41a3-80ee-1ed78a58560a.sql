DROP POLICY IF EXISTS "Anyone can submit support messages" ON public.support_messages;

CREATE POLICY "Anyone can submit support messages"
ON public.support_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(message) > 0
  AND char_length(message) <= 5000
  AND char_length(name) <= 200
  AND char_length(email) <= 320
  AND (user_id IS NULL OR user_id = auth.uid())
);
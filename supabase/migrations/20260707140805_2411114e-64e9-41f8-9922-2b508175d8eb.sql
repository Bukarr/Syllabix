-- 1. Lock down SECURITY DEFINER functions: revoke EXECUTE from anon/public,
-- and from authenticated on functions never called directly by clients.

-- Trigger-only functions: no direct execution needed by any API role.
REVOKE ALL ON FUNCTION public.validate_school_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_change() FROM PUBLIC, anon, authenticated;

-- Rate limiter: only called by edge functions via service role.
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;

-- Helper functions used inside RLS policies / RPC: remove anon + public,
-- keep authenticated (required for RLS evaluation and RPC calls).
REVOKE ALL ON FUNCTION public.get_my_school_code() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_current_school_code() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_profile_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_school_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_workspace_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_member_role(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_school_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_current_school_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_school_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, text) TO authenticated;

-- 2. Restrict Realtime channel subscriptions: enable RLS on realtime.messages
-- so only authenticated users can subscribe, and only to school-scoped topics.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive school-scoped realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can receive school-scoped realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Only allow topics scoped to the caller's own school workspace,
  -- or personal topics scoped to the caller's user id.
  realtime.topic() = ('school:' || public.get_my_school_code())
  OR realtime.topic() = ('user:' || auth.uid()::text)
);

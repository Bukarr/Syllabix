CREATE TABLE public.api_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_rate_limits_lookup ON public.api_rate_limits (identifier, endpoint, created_at DESC);

GRANT ALL ON public.api_rate_limits TO service_role;

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: table is backend-only (service_role bypasses RLS).

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  _identifier text,
  _endpoint text,
  _max integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  win timestamptz := now() - make_interval(secs => _window_seconds);
  cnt integer;
BEGIN
  -- Opportunistic cleanup of stale rows.
  DELETE FROM public.api_rate_limits WHERE created_at < now() - interval '1 hour';

  SELECT count(*) INTO cnt
  FROM public.api_rate_limits
  WHERE identifier = _identifier
    AND endpoint = _endpoint
    AND created_at > win;

  IF cnt >= _max THEN
    RETURN false;
  END IF;

  INSERT INTO public.api_rate_limits (identifier, endpoint) VALUES (_identifier, _endpoint);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer) TO service_role;
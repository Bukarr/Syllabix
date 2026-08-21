CREATE OR REPLACE FUNCTION public.validate_school_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized text;
  alnum_count int;
BEGIN
  -- Empty / no workspace: allow and store as empty string.
  IF NEW.school_code IS NULL OR btrim(NEW.school_code) = '' THEN
    NEW.school_code := '';
    RETURN NEW;
  END IF;

  -- Normalize: trim, uppercase, remove all whitespace inside the code.
  normalized := upper(regexp_replace(btrim(NEW.school_code), '\s+', '', 'g'));

  -- Format: only A-Z, 0-9 and hyphen separators, total length 6..40.
  IF normalized !~ '^[A-Z0-9-]{6,40}$' THEN
    RAISE EXCEPTION 'Invalid school code format. Use 6-40 letters, numbers or hyphens.';
  END IF;

  -- Require at least 6 alphanumeric characters (hyphens don't count).
  alnum_count := char_length(regexp_replace(normalized, '[^A-Z0-9]', '', 'g'));
  IF alnum_count < 6 THEN
    RAISE EXCEPTION 'School code must contain at least 6 letters or numbers.';
  END IF;

  NEW.school_code := normalized;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_school_code_trigger ON public.profiles;
CREATE TRIGGER validate_school_code_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_school_code();
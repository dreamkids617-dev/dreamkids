-- Purge personal data after 30-day deletion retention window.
-- Invoked by service_role (Edge Function / cron). Session: ffc7da1b64

ALTER TABLE public.profiles_ffc7da1b64
  ADD COLUMN IF NOT EXISTS purged_at timestamptz;

COMMENT ON COLUMN public.profiles_ffc7da1b64.purged_at IS
  'Set when PII was anonymized after the 30-day post-withdrawal retention window.';

CREATE OR REPLACE FUNCTION public.dk_purge_expired_account_deletions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer := 0;
BEGIN
  -- service_role only (auth.role() is 'service_role' for those JWTs)
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'dk_purge_expired_account_deletions: service_role required';
  END IF;

  WITH expired AS (
    SELECT id
    FROM public.profiles_ffc7da1b64
    WHERE deletion_requested_at IS NOT NULL
      AND deletion_requested_at <= (now() - interval '30 days')
      AND purged_at IS NULL
  ),
  scrubbed AS (
    UPDATE public.profiles_ffc7da1b64 p
    SET
      email = 'purged+' || p.id::text || '@deleted.local',
      name = '탈퇴회원',
      display_name = NULL,
      region_sido = NULL,
      region_sigungu = NULL,
      child_age_band = NULL,
      is_active = false,
      purged_at = now(),
      updated_at = now()
    FROM expired e
    WHERE p.id = e.id
    RETURNING p.id
  )
  SELECT count(*)::integer INTO n FROM scrubbed;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.dk_purge_expired_account_deletions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dk_purge_expired_account_deletions() FROM authenticated;
REVOKE ALL ON FUNCTION public.dk_purge_expired_account_deletions() FROM anon;
GRANT EXECUTE ON FUNCTION public.dk_purge_expired_account_deletions() TO service_role;

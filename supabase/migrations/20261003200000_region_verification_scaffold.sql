-- Region verification scaffolding for parent community trust.
-- Now: self-declared region is required in app UX.
-- Later at scale: automated verification (phone/address) — NOT manual admin review per user.
-- Session: ffc7da1b64

ALTER TABLE public.profiles_ffc7da1b64
  ADD COLUMN IF NOT EXISTS region_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS region_verification_method text;

COMMENT ON COLUMN public.profiles_ffc7da1b64.region_verified_at IS
  'When neighborhood/region was verified by an automated method. NULL = self-declared only.';

COMMENT ON COLUMN public.profiles_ffc7da1b64.region_verification_method IS
  'Verification channel e.g. phone_otp, carrier, address_api. Never use manual_admin_per_user at scale.';

-- Helper for future gated features (local deals, region-only boards).
CREATE OR REPLACE FUNCTION public.dk_has_verified_region(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles_ffc7da1b64 p
    WHERE p.user_id = p_user_id
      AND p.region_sido IS NOT NULL
      AND btrim(p.region_sido) <> ''
      AND p.region_verified_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.dk_has_verified_region(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dk_has_verified_region(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dk_has_verified_region(uuid) TO service_role;

-- Keep purge in sync once verification columns exist.
CREATE OR REPLACE FUNCTION public.dk_purge_expired_account_deletions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer := 0;
BEGIN
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
      region_verified_at = NULL,
      region_verification_method = NULL,
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

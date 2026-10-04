-- Account deletion request (30-day retention window).
-- Session: ffc7da1b64

ALTER TABLE public.profiles_ffc7da1b64
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

COMMENT ON COLUMN public.profiles_ffc7da1b64.deletion_requested_at IS
  'When set, account use is blocked; PII purge after 30 days per privacy policy.';

-- Allow member to request deletion without changing privileged columns via client UPDATE.
CREATE OR REPLACE FUNCTION public.dk_request_account_deletion()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.profiles_ffc7da1b64 p
  SET
    deletion_requested_at = ts,
    is_active = false
  WHERE p.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  RETURN ts;
END;
$$;

-- Cancel within the 30-day window.
CREATE OR REPLACE FUNCTION public.dk_cancel_account_deletion()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.profiles_ffc7da1b64 p
  SET
    deletion_requested_at = NULL,
    is_active = true
  WHERE p.user_id = auth.uid()
    AND p.deletion_requested_at IS NOT NULL
    AND p.deletion_requested_at > (now() - interval '30 days');

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

-- Privileged guard: allow SECURITY DEFINER deletion helpers to flip is_active
-- only together with deletion_requested_at transitions for the row owner.
CREATE OR REPLACE FUNCTION public.dk_profiles_privileged_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.dk_is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- Self-service deletion request / cancel via dk_* RPCs (SECURITY DEFINER).
  IF NEW.user_id = auth.uid()
     AND NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.is_approved IS NOT DISTINCT FROM OLD.is_approved
     AND (
       -- request: become inactive + deletion timestamp set
       (
         OLD.deletion_requested_at IS NULL
         AND NEW.deletion_requested_at IS NOT NULL
         AND NEW.is_active IS NOT DISTINCT FROM false
       )
       OR
       -- cancel within window: clear timestamp + reactivate
       (
         OLD.deletion_requested_at IS NOT NULL
         AND NEW.deletion_requested_at IS NULL
         AND NEW.is_active IS NOT DISTINCT FROM true
       )
     ) THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'profiles: role / is_approved / is_active may only be changed by super_admin';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.dk_request_account_deletion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dk_cancel_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dk_request_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dk_cancel_account_deletion() TO authenticated;

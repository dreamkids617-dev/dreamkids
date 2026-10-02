-- Institutions soft delete: status = 'deleted' instead of hard DELETE.
-- Decisions:
--   - Owner admin (or super) may soft-delete own/any institutions
--   - Soft-deleted rows remain visible to super + owning admin (existing SELECT policies)
--   - Only super_admin may restore (change status away from 'deleted')
--   - Public listings stay status = 'approved' only (deleted never public)
-- No DELETE/TRUNCATE on row data in this migration.

-- ---------------------------------------------------------------------------
-- 1) Status guard: allow owner soft-delete; restore/approve/reject = super only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dk_institutions_mutable_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.dk_is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'institutions: created_by may only be changed by super_admin';
  END IF;

  -- Soft-deleted rows are read-only for non-super (no restore, no edits)
  IF OLD.status IS NOT DISTINCT FROM 'deleted' THEN
    RAISE EXCEPTION 'institutions: deleted rows may only be changed by super_admin';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Owner approved admin may soft-delete only (any non-deleted -> deleted)
    IF NEW.status IS NOT DISTINCT FROM 'deleted'
       AND public.dk_is_approved_admin()
       AND OLD.created_by IS NOT DISTINCT FROM public.dk_profile_id() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'institutions: status may only be changed by super_admin (except owner soft-delete)';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Block hard DELETE via RLS (soft delete uses UPDATE status = 'deleted')
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS institutions_delete_admin ON public.institutions_ffc7da1b64;

-- ---------------------------------------------------------------------------
-- 3) Public SELECT stays approved-only (deleted excluded). Reaffirm explicitly.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS institutions_select_public ON public.institutions_ffc7da1b64;

CREATE POLICY institutions_select_public
  ON public.institutions_ffc7da1b64 FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

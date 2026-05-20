-- Institution INSERT: super_admin may create with any status; approved non-super
-- admins may only insert rows with status = 'pending' and created_by = own profile id.
-- Prevents bypassing the UI to insert as approved/rejected. Replaces INSERT policy only.
-- No DROP TABLE / DELETE / TRUNCATE / UPDATE on data.

DROP POLICY IF EXISTS institutions_insert_admin ON public.institutions_ffc7da1b64;

CREATE POLICY institutions_insert_admin
  ON public.institutions_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND NOT public.dk_is_super_admin()
      AND created_by IS NOT DISTINCT FROM public.dk_profile_id()
      AND status = 'pending'
    )
  );

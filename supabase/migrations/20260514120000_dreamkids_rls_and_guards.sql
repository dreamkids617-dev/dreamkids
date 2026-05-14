-- Dream Kids: RLS policies, helper functions, and column guards.
-- Table suffix matches src/lib/supabase.ts (SESSION_ID = ffc7da1b64).
-- Apply with: supabase db push   OR   paste into Supabase SQL Editor (single transaction).

-- ---------------------------------------------------------------------------
-- 1) Schema alignment (safe if columns already exist)
-- ---------------------------------------------------------------------------
ALTER TABLE public.institutions_ffc7da1b64
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles_ffc7da1b64(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_no text,
  ADD COLUMN IF NOT EXISTS inst_no text,
  ADD COLUMN IF NOT EXISTS manager_name text;

-- Legacy rows: treat as already published so public listings do not go empty.
UPDATE public.institutions_ffc7da1b64
SET status = 'approved'
WHERE status IS NULL;

-- ---------------------------------------------------------------------------
-- 2) Helper functions (SECURITY DEFINER reads profiles; bypasses profiles RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dk_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id
  FROM public.profiles_ffc7da1b64 p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.dk_is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles_ffc7da1b64 p
    WHERE p.user_id = auth.uid()
      AND p.role = 'super_admin'
      AND COALESCE(p.is_approved, false)
      AND COALESCE(p.is_active, true)
  );
$$;

CREATE OR REPLACE FUNCTION public.dk_is_approved_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles_ffc7da1b64 p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND COALESCE(p.is_approved, false)
      AND COALESCE(p.is_active, true)
  );
$$;

REVOKE ALL ON FUNCTION public.dk_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dk_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dk_is_approved_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dk_profile_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dk_is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dk_is_approved_admin() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2b) Bootstrap allowlist for first super_admin profile creation from client
--     When using VITE_SUPER_ADMIN_EMAIL, add the same address here (SQL editor).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dk_super_bootstrap_emails (
  email text PRIMARY KEY
);

INSERT INTO public.dk_super_bootstrap_emails (email)
VALUES ('dreamkids617@gmail.com')
ON CONFLICT (email) DO NOTHING;

REVOKE ALL ON public.dk_super_bootstrap_emails FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 3) Triggers: profile insert guard, profile privileged columns, institution status/owner
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dk_profiles_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'profiles: user_id must match auth.uid()';
  END IF;

  IF NEW.role IS NOT DISTINCT FROM 'user' THEN
    IF NOT COALESCE(NEW.is_approved, false) OR NOT COALESCE(NEW.is_active, true) THEN
      RAISE EXCEPTION 'profiles: user signup must be approved and active';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS NOT DISTINCT FROM 'admin' THEN
    IF COALESCE(NEW.is_approved, false) THEN
      RAISE EXCEPTION 'profiles: new admin must start as not approved';
    END IF;
    IF NOT COALESCE(NEW.is_active, true) THEN
      RAISE EXCEPTION 'profiles: new admin must be active';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS NOT DISTINCT FROM 'super_admin' THEN
    IF jwt_email = '' OR lower(trim(NEW.email)) IS DISTINCT FROM jwt_email THEN
      RAISE EXCEPTION 'profiles: super_admin email mismatch';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.dk_super_bootstrap_emails e
      WHERE lower(e.email) = jwt_email
    ) THEN
      RAISE EXCEPTION 'profiles: email not in super_admin bootstrap list (add row in dk_super_bootstrap_emails)';
    END IF;
    IF NOT COALESCE(NEW.is_approved, false) OR NOT COALESCE(NEW.is_active, true) THEN
      RAISE EXCEPTION 'profiles: super_admin must be active and approved';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'profiles: invalid role %', NEW.role;
END;
$$;

DROP TRIGGER IF EXISTS dk_profiles_insert_guard ON public.profiles_ffc7da1b64;
CREATE TRIGGER dk_profiles_insert_guard
  BEFORE INSERT ON public.profiles_ffc7da1b64
  FOR EACH ROW
  EXECUTE PROCEDURE public.dk_profiles_insert_guard();

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
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'profiles: role / is_approved / is_active may only be changed by super_admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dk_profiles_privileged_guard ON public.profiles_ffc7da1b64;
CREATE TRIGGER dk_profiles_privileged_guard
  BEFORE UPDATE ON public.profiles_ffc7da1b64
  FOR EACH ROW
  EXECUTE PROCEDURE public.dk_profiles_privileged_guard();

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
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'institutions: status may only be changed by super_admin';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'institutions: created_by may only be changed by super_admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dk_institutions_mutable_guard ON public.institutions_ffc7da1b64;
CREATE TRIGGER dk_institutions_mutable_guard
  BEFORE UPDATE ON public.institutions_ffc7da1b64
  FOR EACH ROW
  EXECUTE PROCEDURE public.dk_institutions_mutable_guard();

-- ---------------------------------------------------------------------------
-- 4) Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.institutions_ffc7da1b64 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_ffc7da1b64 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites_ffc7da1b64 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_views_ffc7da1b64 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries_ffc7da1b64 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations_ffc7da1b64 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs_ffc7da1b64 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_notices_ffc7da1b64 ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5) Drop existing policies (idempotent re-run in SQL editor)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'institutions_ffc7da1b64',
        'profiles_ffc7da1b64',
        'favorites_ffc7da1b64',
        'recent_views_ffc7da1b64',
        'inquiries_ffc7da1b64',
        'reservations_ffc7da1b64',
        'admin_logs_ffc7da1b64',
        'institution_notices_ffc7da1b64'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6) institutions_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE POLICY institutions_select_public
  ON public.institutions_ffc7da1b64 FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY institutions_select_admin_scope
  ON public.institutions_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND created_by IS NOT DISTINCT FROM public.dk_profile_id()
    )
  );

CREATE POLICY institutions_insert_admin
  ON public.institutions_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND created_by IS NOT DISTINCT FROM public.dk_profile_id()
    )
  );

CREATE POLICY institutions_update_admin
  ON public.institutions_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND created_by IS NOT DISTINCT FROM public.dk_profile_id()
    )
  )
  WITH CHECK (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND created_by IS NOT DISTINCT FROM public.dk_profile_id()
    )
  );

CREATE POLICY institutions_delete_admin
  ON public.institutions_ffc7da1b64 FOR DELETE
  TO authenticated
  USING (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND created_by IS NOT DISTINCT FROM public.dk_profile_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 7) profiles_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_own_or_super
  ON public.profiles_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.dk_is_super_admin());

CREATE POLICY profiles_insert_own
  ON public.profiles_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_update_own_or_super
  ON public.profiles_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.dk_is_super_admin())
  WITH CHECK (user_id = auth.uid() OR public.dk_is_super_admin());

-- ---------------------------------------------------------------------------
-- 8) favorites_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE POLICY favorites_select_own
  ON public.favorites_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY favorites_insert_own_approved_inst
  ON public.favorites_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.institutions_ffc7da1b64 i
      WHERE i.id = institution_id AND i.status = 'approved'
    )
  );

CREATE POLICY favorites_delete_own
  ON public.favorites_ffc7da1b64 FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 9) recent_views_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE POLICY recent_views_select_own
  ON public.recent_views_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY recent_views_insert_own_approved_inst
  ON public.recent_views_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.institutions_ffc7da1b64 i
      WHERE i.id = institution_id AND i.status = 'approved'
    )
  );

CREATE POLICY recent_views_delete_own
  ON public.recent_views_ffc7da1b64 FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY recent_views_update_own
  ON public.recent_views_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 10) inquiries_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE POLICY inquiries_select_user_or_admin
  ON public.inquiries_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  );

CREATE POLICY inquiries_insert_user_approved_inst
  ON public.inquiries_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.institutions_ffc7da1b64 i
      WHERE i.id = institution_id AND i.status = 'approved'
    )
  );

CREATE POLICY inquiries_update_admin
  ON public.inquiries_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  )
  WITH CHECK (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 11) reservations_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE POLICY reservations_select_user_or_admin
  ON public.reservations_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  );

CREATE POLICY reservations_insert_user_approved_inst
  ON public.reservations_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.institutions_ffc7da1b64 i
      WHERE i.id = institution_id AND i.status = 'approved'
    )
  );

CREATE POLICY reservations_update_admin
  ON public.reservations_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  )
  WITH CHECK (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 12) admin_logs_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE POLICY admin_logs_select_scope
  ON public.admin_logs_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (
    public.dk_is_super_admin()
    OR lower(admin_email) = lower(auth.jwt() ->> 'email')
  );

CREATE POLICY admin_logs_insert_admin
  ON public.admin_logs_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (public.dk_is_approved_admin());

-- ---------------------------------------------------------------------------
-- 13) institution_notices_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE POLICY notices_select_public
  ON public.institution_notices_ffc7da1b64 FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.institutions_ffc7da1b64 i
      WHERE i.id = institution_id AND i.status = 'approved'
    )
  );

CREATE POLICY notices_select_admin_draft
  ON public.institution_notices_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  );

CREATE POLICY notices_insert_admin
  ON public.institution_notices_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  );

CREATE POLICY notices_update_admin
  ON public.institution_notices_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  )
  WITH CHECK (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  );

CREATE POLICY notices_delete_admin
  ON public.institution_notices_ffc7da1b64 FOR DELETE
  TO authenticated
  USING (
    public.dk_is_super_admin()
    OR (
      public.dk_is_approved_admin()
      AND EXISTS (
        SELECT 1 FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
      )
    )
  );

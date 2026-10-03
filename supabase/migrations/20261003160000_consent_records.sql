-- Consent audit records for signup legal agreements.
-- Session suffix: ffc7da1b64

CREATE TABLE IF NOT EXISTS public.consent_records_ffc7da1b64 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid REFERENCES public.profiles_ffc7da1b64(id) ON DELETE SET NULL,
  role_intent text NOT NULL CHECK (role_intent IN ('user', 'admin')),
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  privacy_collect_version text NOT NULL,
  marketing_version text,
  terms_agreed boolean NOT NULL DEFAULT true,
  privacy_collect_agreed boolean NOT NULL DEFAULT true,
  age_confirmed boolean NOT NULL DEFAULT true,
  marketing_agreed boolean NOT NULL DEFAULT false,
  agreed_at timestamptz NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consent_records_ffc7da1b64_user_id_idx
  ON public.consent_records_ffc7da1b64 (user_id, created_at DESC);

ALTER TABLE public.consent_records_ffc7da1b64 ENABLE ROW LEVEL SECURITY;

-- Owner can read own consent history
DROP POLICY IF EXISTS consent_records_select_own ON public.consent_records_ffc7da1b64;
CREATE POLICY consent_records_select_own
  ON public.consent_records_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.dk_is_super_admin());

-- Insert only for self at signup / first login sync
DROP POLICY IF EXISTS consent_records_insert_own ON public.consent_records_ffc7da1b64;
CREATE POLICY consent_records_insert_own
  ON public.consent_records_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND terms_agreed = true
    AND privacy_collect_agreed = true
    AND age_confirmed = true
  );

-- No UPDATE/DELETE for members (audit immutability). Super may need support via SQL editor.

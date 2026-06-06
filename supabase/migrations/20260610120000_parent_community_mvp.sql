-- Dream Kids: parent community MVP — profiles extension, posts, reports, RLS.
-- Table suffix matches src/lib/supabase.ts (SESSION_ID = ffc7da1b64).
-- Scope: DB/RLS only. No comments, payments, chat, or image upload.
-- Apply with: supabase db push   OR   paste into Supabase SQL Editor (single transaction).
-- Idempotent-friendly: safe to re-run policy/function sections; tables use IF NOT EXISTS.

-- ---------------------------------------------------------------------------
-- 1) profiles_ffc7da1b64 — optional parent community fields (nullable)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles_ffc7da1b64
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS region_sido text,
  ADD COLUMN IF NOT EXISTS region_sigungu text,
  ADD COLUMN IF NOT EXISTS child_age_band text;

-- ---------------------------------------------------------------------------
-- 2) Helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dk_is_parent_user()
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
      AND p.role = 'user'
      AND COALESCE(p.is_active, true)
      AND COALESCE(p.is_approved, true)
  );
$$;

CREATE OR REPLACE FUNCTION public.dk_is_community_moderator()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.dk_is_approved_admin() OR public.dk_is_super_admin();
$$;

REVOKE ALL ON FUNCTION public.dk_is_parent_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dk_is_community_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dk_is_parent_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dk_is_community_moderator() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) parent_posts_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_posts_ffc7da1b64 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_profile_id uuid NOT NULL REFERENCES public.profiles_ffc7da1b64(id) ON DELETE RESTRICT,
  author_user_id uuid NOT NULL,
  author_display_name text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  region_sido text,
  region_sigungu text,
  status text NOT NULL DEFAULT 'published',
  institution_id uuid REFERENCES public.institutions_ffc7da1b64(id) ON DELETE SET NULL,
  report_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parent_posts_category_check CHECK (
    category IN (
      'admission_prep',
      'adaptation',
      'product_recommend',
      'group_buy',
      'share_used',
      'local_info',
      'institution_question'
    )
  ),
  CONSTRAINT parent_posts_status_check CHECK (
    status IN (
      'published',
      'hidden',
      'deleted_by_author',
      'removed_by_admin'
    )
  ),
  CONSTRAINT parent_posts_report_count_nonnegative CHECK (report_count >= 0)
);

CREATE INDEX IF NOT EXISTS parent_posts_status_idx
  ON public.parent_posts_ffc7da1b64 (status);

CREATE INDEX IF NOT EXISTS parent_posts_category_idx
  ON public.parent_posts_ffc7da1b64 (category);

CREATE INDEX IF NOT EXISTS parent_posts_created_at_desc_idx
  ON public.parent_posts_ffc7da1b64 (created_at DESC);

CREATE INDEX IF NOT EXISTS parent_posts_author_user_id_idx
  ON public.parent_posts_ffc7da1b64 (author_user_id);

CREATE INDEX IF NOT EXISTS parent_posts_region_idx
  ON public.parent_posts_ffc7da1b64 (region_sido, region_sigungu);

-- ---------------------------------------------------------------------------
-- 4) post_reports_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_reports_ffc7da1b64 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_profile_id uuid NOT NULL REFERENCES public.profiles_ffc7da1b64(id) ON DELETE RESTRICT,
  post_id uuid NOT NULL REFERENCES public.parent_posts_ffc7da1b64(id) ON DELETE RESTRICT,
  reason_code text NOT NULL,
  reason_detail text,
  status text NOT NULL DEFAULT 'pending',
  handled_by_profile_id uuid REFERENCES public.profiles_ffc7da1b64(id) ON DELETE SET NULL,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_reports_reason_code_check CHECK (
    reason_code IN (
      'spam',
      'privacy',
      'abuse',
      'institution_defamation',
      'unsafe_trade',
      'other'
    )
  ),
  CONSTRAINT post_reports_status_check CHECK (
    status IN (
      'pending',
      'reviewed',
      'dismissed',
      'action_taken'
    )
  ),
  CONSTRAINT post_reports_reporter_post_unique UNIQUE (reporter_profile_id, post_id)
);

CREATE INDEX IF NOT EXISTS post_reports_post_id_idx
  ON public.post_reports_ffc7da1b64 (post_id);

CREATE INDEX IF NOT EXISTS post_reports_reporter_profile_id_idx
  ON public.post_reports_ffc7da1b64 (reporter_profile_id);

CREATE INDEX IF NOT EXISTS post_reports_status_idx
  ON public.post_reports_ffc7da1b64 (status);

CREATE INDEX IF NOT EXISTS post_reports_created_at_desc_idx
  ON public.post_reports_ffc7da1b64 (created_at DESC);

-- ---------------------------------------------------------------------------
-- 5) Triggers: updated_at + author/moderator column guards (parent_posts only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dk_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dk_parent_posts_updated_at ON public.parent_posts_ffc7da1b64;
CREATE TRIGGER dk_parent_posts_updated_at
  BEFORE UPDATE ON public.parent_posts_ffc7da1b64
  FOR EACH ROW
  EXECUTE PROCEDURE public.dk_set_updated_at();

CREATE OR REPLACE FUNCTION public.dk_parent_posts_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.dk_is_community_moderator() THEN
    RETURN NEW;
  END IF;

  IF NEW.author_user_id IS DISTINCT FROM OLD.author_user_id
     OR NEW.author_profile_id IS DISTINCT FROM OLD.author_profile_id
     OR NEW.author_display_name IS DISTINCT FROM OLD.author_display_name
     OR NEW.institution_id IS DISTINCT FROM OLD.institution_id
     OR NEW.report_count IS DISTINCT FROM OLD.report_count
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'parent_posts: only moderators may change author metadata, institution_id, or report_count';
  END IF;

  IF OLD.author_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'parent_posts: only the author or a moderator may update this row';
  END IF;

  IF OLD.status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'parent_posts: author may only update published posts';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM 'hidden'
     OR NEW.status IS NOT DISTINCT FROM 'removed_by_admin' THEN
    RAISE EXCEPTION 'parent_posts: authors may not set hidden or removed_by_admin';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM 'deleted_by_author'
     AND OLD.status IS NOT DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM 'published'
     AND OLD.status IS NOT DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'parent_posts: invalid author status transition from % to %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS dk_parent_posts_update_guard ON public.parent_posts_ffc7da1b64;
CREATE TRIGGER dk_parent_posts_update_guard
  BEFORE UPDATE ON public.parent_posts_ffc7da1b64
  FOR EACH ROW
  EXECUTE PROCEDURE public.dk_parent_posts_update_guard();

-- ---------------------------------------------------------------------------
-- 6) Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.parent_posts_ffc7da1b64 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports_ffc7da1b64 ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7) Drop existing community policies (idempotent re-run)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS parent_posts_select_public ON public.parent_posts_ffc7da1b64;
DROP POLICY IF EXISTS parent_posts_select_author ON public.parent_posts_ffc7da1b64;
DROP POLICY IF EXISTS parent_posts_select_moderator ON public.parent_posts_ffc7da1b64;
DROP POLICY IF EXISTS parent_posts_insert_parent ON public.parent_posts_ffc7da1b64;
DROP POLICY IF EXISTS parent_posts_update_author ON public.parent_posts_ffc7da1b64;
DROP POLICY IF EXISTS parent_posts_update_moderator ON public.parent_posts_ffc7da1b64;

DROP POLICY IF EXISTS post_reports_select_reporter ON public.post_reports_ffc7da1b64;
DROP POLICY IF EXISTS post_reports_select_moderator ON public.post_reports_ffc7da1b64;
DROP POLICY IF EXISTS post_reports_insert_parent ON public.post_reports_ffc7da1b64;
DROP POLICY IF EXISTS post_reports_update_moderator ON public.post_reports_ffc7da1b64;

-- ---------------------------------------------------------------------------
-- 8) parent_posts_ffc7da1b64 policies
-- ---------------------------------------------------------------------------
CREATE POLICY parent_posts_select_public
  ON public.parent_posts_ffc7da1b64 FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY parent_posts_select_author
  ON public.parent_posts_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (author_user_id = auth.uid());

CREATE POLICY parent_posts_select_moderator
  ON public.parent_posts_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (public.dk_is_community_moderator());

CREATE POLICY parent_posts_insert_parent
  ON public.parent_posts_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    public.dk_is_parent_user()
    AND author_user_id = auth.uid()
    AND author_profile_id IS NOT DISTINCT FROM public.dk_profile_id()
    AND status = 'published'
    AND report_count = 0
    AND (
      institution_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.institutions_ffc7da1b64 i
        WHERE i.id = institution_id
          AND i.status = 'approved'
      )
    )
  );

CREATE POLICY parent_posts_update_author
  ON public.parent_posts_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (
    author_user_id = auth.uid()
    AND status = 'published'
  )
  WITH CHECK (
    author_user_id = auth.uid()
    AND status IN ('published', 'deleted_by_author')
  );

CREATE POLICY parent_posts_update_moderator
  ON public.parent_posts_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (public.dk_is_community_moderator())
  WITH CHECK (public.dk_is_community_moderator());

-- No DELETE policies: hard delete denied; authors use soft delete via UPDATE.

-- ---------------------------------------------------------------------------
-- 9) post_reports_ffc7da1b64 policies
-- ---------------------------------------------------------------------------
CREATE POLICY post_reports_select_reporter
  ON public.post_reports_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (reporter_profile_id IS NOT DISTINCT FROM public.dk_profile_id());

CREATE POLICY post_reports_select_moderator
  ON public.post_reports_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (public.dk_is_community_moderator());

CREATE POLICY post_reports_insert_parent
  ON public.post_reports_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    public.dk_is_parent_user()
    AND reporter_profile_id IS NOT DISTINCT FROM public.dk_profile_id()
    AND status = 'pending'
    AND handled_by_profile_id IS NULL
    AND handled_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.parent_posts_ffc7da1b64 p
      WHERE p.id = post_id
        AND p.status = 'published'
        AND p.author_user_id IS DISTINCT FROM auth.uid()
    )
  );

CREATE POLICY post_reports_update_moderator
  ON public.post_reports_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (public.dk_is_community_moderator())
  WITH CHECK (public.dk_is_community_moderator());

-- No DELETE policies on post_reports.

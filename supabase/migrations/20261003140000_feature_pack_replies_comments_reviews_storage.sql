-- Feature pack: inquiry reply body, parent reservation cancel,
-- community comments, institution reviews, notice image storage.
-- Session suffix: ffc7da1b64

-- ---------------------------------------------------------------------------
-- 1) inquiries: reply body
-- ---------------------------------------------------------------------------
ALTER TABLE public.inquiries_ffc7da1b64
  ADD COLUMN IF NOT EXISTS reply_body text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2) reservations: parent may cancel own pending rows
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS reservations_update_owner_cancel ON public.reservations_ffc7da1b64;

CREATE POLICY reservations_update_owner_cancel
  ON public.reservations_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'cancelled'
  );

-- ---------------------------------------------------------------------------
-- 3) post_comments_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_comments_ffc7da1b64 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.parent_posts_ffc7da1b64(id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles_ffc7da1b64(id) ON DELETE RESTRICT,
  author_user_id uuid NOT NULL,
  author_display_name text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'deleted_by_author', 'removed_by_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_comments_ffc7da1b64_post_id_idx
  ON public.post_comments_ffc7da1b64 (post_id, created_at);

ALTER TABLE public.post_comments_ffc7da1b64 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_comments_select_public ON public.post_comments_ffc7da1b64;
CREATE POLICY post_comments_select_public
  ON public.post_comments_ffc7da1b64 FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.parent_posts_ffc7da1b64 p
      WHERE p.id = post_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS post_comments_select_author ON public.post_comments_ffc7da1b64;
CREATE POLICY post_comments_select_author
  ON public.post_comments_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (author_user_id = auth.uid());

DROP POLICY IF EXISTS post_comments_select_moderator ON public.post_comments_ffc7da1b64;
CREATE POLICY post_comments_select_moderator
  ON public.post_comments_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (public.dk_is_community_moderator());

DROP POLICY IF EXISTS post_comments_insert_parent ON public.post_comments_ffc7da1b64;
CREATE POLICY post_comments_insert_parent
  ON public.post_comments_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    public.dk_is_parent_user()
    AND author_user_id = auth.uid()
    AND author_profile_id IS NOT DISTINCT FROM public.dk_profile_id()
    AND status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.parent_posts_ffc7da1b64 p
      WHERE p.id = post_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS post_comments_update_author ON public.post_comments_ffc7da1b64;
CREATE POLICY post_comments_update_author
  ON public.post_comments_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (author_user_id = auth.uid() AND status = 'published')
  WITH CHECK (author_user_id = auth.uid() AND status = 'deleted_by_author');

DROP POLICY IF EXISTS post_comments_update_moderator ON public.post_comments_ffc7da1b64;
CREATE POLICY post_comments_update_moderator
  ON public.post_comments_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (public.dk_is_community_moderator())
  WITH CHECK (public.dk_is_community_moderator());

-- ---------------------------------------------------------------------------
-- 4) institution_reviews_ffc7da1b64
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_reviews_ffc7da1b64 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions_ffc7da1b64(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_profile_id uuid NOT NULL REFERENCES public.profiles_ffc7da1b64(id) ON DELETE RESTRICT,
  author_display_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden', 'deleted_by_author')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id)
);

CREATE INDEX IF NOT EXISTS institution_reviews_ffc7da1b64_inst_idx
  ON public.institution_reviews_ffc7da1b64 (institution_id, created_at DESC);

ALTER TABLE public.institution_reviews_ffc7da1b64 ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.dk_refresh_institution_rating(p_institution_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.institutions_ffc7da1b64 i
  SET
    rating = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 1)
      FROM public.institution_reviews_ffc7da1b64 r
      WHERE r.institution_id = p_institution_id AND r.status = 'published'
    ), 0),
    review_count = COALESCE((
      SELECT COUNT(*)::int
      FROM public.institution_reviews_ffc7da1b64 r
      WHERE r.institution_id = p_institution_id AND r.status = 'published'
    ), 0)
  WHERE i.id = p_institution_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dk_refresh_institution_rating(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dk_refresh_institution_rating(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dk_institution_reviews_rating_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  target := COALESCE(NEW.institution_id, OLD.institution_id);
  PERFORM public.dk_refresh_institution_rating(target);
  IF TG_OP = 'UPDATE' AND NEW.institution_id IS DISTINCT FROM OLD.institution_id THEN
    PERFORM public.dk_refresh_institution_rating(OLD.institution_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_institution_reviews_rating ON public.institution_reviews_ffc7da1b64;
CREATE TRIGGER trg_institution_reviews_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.institution_reviews_ffc7da1b64
  FOR EACH ROW EXECUTE PROCEDURE public.dk_institution_reviews_rating_trigger();

DROP POLICY IF EXISTS reviews_select_public ON public.institution_reviews_ffc7da1b64;
CREATE POLICY reviews_select_public
  ON public.institution_reviews_ffc7da1b64 FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.institutions_ffc7da1b64 i
      WHERE i.id = institution_id AND i.status = 'approved'
    )
  );

DROP POLICY IF EXISTS reviews_select_own ON public.institution_reviews_ffc7da1b64;
CREATE POLICY reviews_select_own
  ON public.institution_reviews_ffc7da1b64 FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS reviews_insert_parent ON public.institution_reviews_ffc7da1b64;
CREATE POLICY reviews_insert_parent
  ON public.institution_reviews_ffc7da1b64 FOR INSERT
  TO authenticated
  WITH CHECK (
    public.dk_is_parent_user()
    AND user_id = auth.uid()
    AND author_profile_id IS NOT DISTINCT FROM public.dk_profile_id()
    AND status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.institutions_ffc7da1b64 i
      WHERE i.id = institution_id AND i.status = 'approved'
    )
  );

DROP POLICY IF EXISTS reviews_update_author ON public.institution_reviews_ffc7da1b64;
CREATE POLICY reviews_update_author
  ON public.institution_reviews_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS reviews_update_moderator ON public.institution_reviews_ffc7da1b64;
CREATE POLICY reviews_update_moderator
  ON public.institution_reviews_ffc7da1b64 FOR UPDATE
  TO authenticated
  USING (public.dk_is_community_moderator())
  WITH CHECK (public.dk_is_community_moderator());

-- ---------------------------------------------------------------------------
-- 5) Storage bucket + policies for notice images
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notice_images_ffc7da1b64',
  'notice_images_ffc7da1b64',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS notice_images_select ON storage.objects;
CREATE POLICY notice_images_select
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'notice_images_ffc7da1b64'
    AND (
      public.dk_is_super_admin()
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.institutions_ffc7da1b64 i
          WHERE i.id::text = (storage.foldername(name))[1]
            AND (
              i.status = 'approved'
              OR (
                public.dk_is_approved_admin()
                AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
              )
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS notice_images_insert ON storage.objects;
CREATE POLICY notice_images_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'notice_images_ffc7da1b64'
    AND (
      public.dk_is_super_admin()
      OR (
        public.dk_is_approved_admin()
        AND (storage.foldername(name))[1] IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.institutions_ffc7da1b64 i
          WHERE i.id::text = (storage.foldername(name))[1]
            AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS notice_images_update ON storage.objects;
CREATE POLICY notice_images_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'notice_images_ffc7da1b64'
    AND (
      public.dk_is_super_admin()
      OR (
        public.dk_is_approved_admin()
        AND (storage.foldername(name))[1] IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.institutions_ffc7da1b64 i
          WHERE i.id::text = (storage.foldername(name))[1]
            AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'notice_images_ffc7da1b64'
    AND (
      public.dk_is_super_admin()
      OR (
        public.dk_is_approved_admin()
        AND (storage.foldername(name))[1] IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.institutions_ffc7da1b64 i
          WHERE i.id::text = (storage.foldername(name))[1]
            AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS notice_images_delete ON storage.objects;
CREATE POLICY notice_images_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'notice_images_ffc7da1b64'
    AND (
      public.dk_is_super_admin()
      OR (
        public.dk_is_approved_admin()
        AND (storage.foldername(name))[1] IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.institutions_ffc7da1b64 i
          WHERE i.id::text = (storage.foldername(name))[1]
            AND i.created_by IS NOT DISTINCT FROM public.dk_profile_id()
        )
      )
    )
  );

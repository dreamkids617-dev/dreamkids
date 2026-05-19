-- Institution detail intro: optional text fields for public detail page.
-- No data changes, no DROP/DELETE/TRUNCATE.

ALTER TABLE public.institutions_ffc7da1b64
  ADD COLUMN IF NOT EXISTS director_message text,
  ADD COLUMN IF NOT EXISTS education_philosophy text,
  ADD COLUMN IF NOT EXISTS kindergarten_strengths text,
  ADD COLUMN IF NOT EXISTS recruitment_info text;

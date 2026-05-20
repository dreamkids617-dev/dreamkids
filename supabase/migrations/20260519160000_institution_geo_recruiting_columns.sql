-- Map search prep: administrative region + coordinates + recruiting flag.
-- latitude/longitude reserved for a future map SDK (no SDK in this migration).
-- No data changes, no DROP/DELETE/TRUNCATE/UPDATE.

ALTER TABLE public.institutions_ffc7da1b64
  ADD COLUMN IF NOT EXISTS sido text,
  ADD COLUMN IF NOT EXISTS sigungu text,
  ADD COLUMN IF NOT EXISTS eupmyeondong text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS is_recruiting boolean DEFAULT false;

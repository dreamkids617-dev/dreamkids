# Supabase in this repository

## Migrations (single source of truth)

All database DDL, RLS policies, triggers, and (when implemented) **Storage policies on `storage.objects`** live in `supabase/migrations/` as ordered, timestamp-prefixed SQL files.

- Apply with the [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase db push` on a linked project) or by running the migration SQL in the Supabase SQL Editor.
- Avoid maintaining a second canonical copy of the same policies in another path; extend this folder instead.

Current baseline: `20260514120000_dreamkids_rls_and_guards.sql` (table RLS and related helpers).

## Storage policies (plan — ship with image upload)

The app defines one bucket name for future notice images: **`notice_images_ffc7da1b64`** (`STORAGE.notice_images` in `src/lib/supabase.ts`). Until upload is implemented, **URL fields stay the source of truth**; add a new migration when uploads go live.

When you add uploads, design Storage RLS in the same migration (or a follow-up migration) together with the feature:

1. **Read (`SELECT`)** — Match how URLs are exposed: public bucket + public URL vs private bucket + signed URLs. Public notice pages use anon reads on approved institutions; object visibility must match that product choice.
2. **Write (`INSERT` / `UPDATE`)** — Authenticated admins only, scoped to institutions they own (same idea as `institution_notices_*` policies).
3. **Delete** — Decide whether deleting a notice row removes the object, and encode that in app logic and/or policies.

## Edge Functions

Edge Function sources live under `supabase/functions/`. Deploy and secrets are managed in the Supabase dashboard or CLI, not via this README.

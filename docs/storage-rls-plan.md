# Storage RLS Plan (Dream Kids)

Plan only — **no Storage migration or upload UI in this change**.  
Ship Storage policies in the **same PR/migration as image upload**, not before.

Related:

- Bucket constant: `STORAGE.notice_images` → `notice_images_ffc7da1b64` (`src/lib/supabase.ts`)
- Notice row image field today: `institution_notices_*.image_url` (external URL string)
- Table RLS pattern: `institution_notices_*` + `institutions_*` ownership via `created_by`
- Folder note: `supabase/README.md`

---

## Current state

| Item | Status |
|------|--------|
| Institution / notice images in app | **URL 문자열** (외부 CDN/직접 입력) |
| Supabase Storage upload UI | Not implemented |
| `storage.objects` policies in migrations | **None** |
| Bucket `notice_images_ffc7da1b64` | Planned name only — create when upload ships |

Until upload ships, **do not** rely on Storage; keep Admin URL fields.

---

## Product decisions (recommended)

### 1) What gets stored first

**Phase 1 (first upload feature):** institution **notice** images only  
Bucket: `notice_images_ffc7da1b64`

**Later (separate PR):** institution gallery / profile images if needed  
Do not mix unrelated object types in the same path layout without a clear prefix.

### 2) Public vs private bucket

**Recommendation: public bucket** for notice images.

Reason:

- Detail page already shows notice images to anon users for **approved** institutions.
- Public object URLs match current `image_url` usage (simple `<img src>`).
- Signed URLs add client complexity without clear benefit for public notices.

If a future image type is private (e.g. admin-only docs), use a **separate private bucket**.

### 3) Path convention (required for RLS scoping)

Use a stable object path that embeds `institution_id`:

```text
{institution_id}/{notice_id_or_uuid}.{ext}
```

Example:

```text
ea43ebc4-.../a1b2c3d4.webp
```

RLS and app code both key off the first path segment = `institution_id`.

### 4) Who can read / write / delete

Align with existing notice table policies:

| Action | Who | Rule |
|--------|-----|------|
| **SELECT** (read) | `anon`, `authenticated` | Object allowed if parent institution `status = 'approved'` **or** caller is Super / owning approved Admin |
| **INSERT** | `authenticated` | Super, or approved Admin whose `created_by` owns that `institution_id` |
| **UPDATE** | `authenticated` | Same as INSERT (optional; can disallow UPDATE and only allow replace-via-new-object) |
| **DELETE** | `authenticated` | Super, or owning approved Admin; prefer soft-delete notice row first, then delete object in app |

**Recommendation:** allow Storage DELETE for owner Admin + Super (not soft-delete on Storage objects — objects are either present or removed). Soft-delete stays on the **notice/institution row**.

### 5) Soft-deleted / pending institutions

| Institution status | Notice images public? |
|--------------------|------------------------|
| `approved` | Yes (anon read) |
| `pending` / `rejected` / `deleted` | No anon read; Super + owning Admin may still read for dashboard |

This matches public institution SELECT (`status = 'approved'` only).

---

## Migration checklist (when upload ships)

Add one new file, e.g. `supabase/migrations/YYYYMMDDHHMMSS_notice_images_storage_rls.sql`:

1. **Create bucket** (Dashboard or SQL `storage.buckets` insert)
   - `id` / `name`: `notice_images_ffc7da1b64`
   - `public`: `true` (if following recommendation above)
2. **Enable RLS** on `storage.objects` (usually on by default in Supabase)
3. **DROP POLICY IF EXISTS** then **CREATE POLICY** for SELECT / INSERT / UPDATE / DELETE scoped by path + `dk_*` helpers
4. **No** `service_role` in the browser; uploads use the logged-in Admin session (anon key + user JWT)
5. Update Admin notice UI: upload → get public URL → save `image_url`
6. Optional: on notice delete, remove Storage object in the same flow

Do **not** put Storage secrets in `VITE_*`.

---

## Suggested policy sketch (pseudocode — not applied)

```text
SELECT:
  bucket_id = 'notice_images_ffc7da1b64'
  AND (
    institution_for(path).status = 'approved'
    OR dk_is_super_admin()
    OR (dk_is_approved_admin() AND institution.created_by = dk_profile_id())
  )

INSERT / DELETE:
  bucket_id = 'notice_images_ffc7da1b64'
  AND (
    dk_is_super_admin()
    OR (
      dk_is_approved_admin()
      AND institution.created_by = dk_profile_id()
      AND path institution_id matches that institution
    )
  )
```

Implement with `(storage.foldername(name))[1]` (or equivalent) cast to `uuid` and `EXISTS` against `institutions_ffc7da1b64`.

Reuse existing helpers:

- `dk_profile_id()`
- `dk_is_super_admin()`
- `dk_is_approved_admin()`

---

## Out of scope for now

- Creating the bucket in the live project
- Writing/applying `storage.objects` SQL
- Admin upload UI / image compression
- Community post images
- Changing current URL-based institution `image` field

---

## Manual decisions to confirm before coding upload

Use these defaults unless product says otherwise:

1. Bucket public? **Yes**
2. First feature = notice images only? **Yes**
3. Path = `{institution_id}/...`? **Yes**
4. Owner Admin can delete objects? **Yes**
5. Pending institution images hidden from public? **Yes**

If any answer is different, update this doc before writing the migration.

# Dream Kids Deploy Checklist

Staging and production deployment guide for Dream Kids. Use this before every release.

**Do not commit real keys or secrets.** Reference variable names only.

---

## Current Baseline

- **main commit:** `4bc02bf` (PR #16 Naver Map MVP, PR #27 community region filter, PR #28 MyPage profile region)
- **Local regression:** PASS
- **Map regression (local dev):** PASS — `maps.js` HTTP 200, `/v3/auth` HTTP 200, map render, marker click → `/detail/:id`
- **Email Phase 1:** Code on `main`; real mail E2E deferred until Custom SMTP

---

## Required Frontend Environment Variables

Set these in CI or the hosting provider **at build time** (Vite embeds `VITE_*` into the bundle).

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project API URL (Auth, Database, Storage client) |
| `VITE_SUPABASE_ANON_KEY` | Supabase **public anon key** — safe to expose in the browser **only because RLS protects data** |
| `VITE_NAVER_MAP_CLIENT_ID` | Naver Maps JavaScript API v3 **public Client ID** (`X-NCP-APIGW-API-KEY-ID`); loaded as `ncpKeyId` on `/search` map view |

After changing any `VITE_*` value, **rebuild and redeploy** (`pnpm run build`). Runtime-only env changes without rebuild will not update the client.

---

## Optional Frontend Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPER_ADMIN_EMAIL` | Bootstrap email for first `super_admin` profile (`AuthContext`); must match `dk_super_bootstrap_emails` if that flow is used |
| `VITE_API_BASE_URL` | Backend API base; if unset in production, app tries same-origin `GET /api/config` |
| `VITE_SITE_URL` | Sitemap hostname (`vite.config.ts`) and blog canonical/OG URLs (`src/lib/blog.ts`) |
| `VITE_APP_TITLE` | App title / meta (build-time default exists) |
| `VITE_APP_DESCRIPTION` | App description / meta |
| `VITE_APP_LOGO_URL` | Logo URL for meta |
| `VITE_TWITTER_SITE` | Twitter card site handle |
| `VITE_TWITTER_CREATOR` | Twitter card creator handle |

**Local dev only (not required for deploy):** `VITE_PORT` (default `3000`).

See also `.env.example` for documented variable names (no real values).

---

## Public vs Secret

### Public (frontend / build env OK)

| Item | Notes |
|------|-------|
| `VITE_SUPABASE_URL` | Project URL is not secret |
| `VITE_SUPABASE_ANON_KEY` | **Public anon key** — designed for browsers; **RLS must be enabled** and policies must be correct |
| `VITE_NAVER_MAP_CLIENT_ID` | **Public Client ID** only — never use Naver Client Secret in the frontend |

### Secret (never in frontend, repo, or client bundle)

| Item | Where it belongs |
|------|------------------|
| Supabase **service_role** key | Supabase Edge Functions / trusted server only |
| Naver Maps **Client Secret** | **Do not use** — Maps JS v3 uses public Client ID + domain whitelist |
| SMTP password | Supabase Edge Function secrets / SMTP provider vault |
| Database passwords | Supabase managed — not in app env |
| Any API key labeled “secret” | Server-side or Supabase secrets only |

**Why Client Secret must not go in the frontend:** Anything in the Vite bundle or browser Network tab is visible to users. A leaked Client Secret allows unauthorized API calls. Naver Maps JS v3 is intended to use **public Client ID** (`ncpKeyId`) with **Web service URL** restrictions.

**Why service_role must not go in the frontend:** It bypasses RLS and grants full database access.

---

## Naver Cloud Maps

**Application:** DreamKidsMapTest (or environment-specific Maps application)

### API activation

- Enable **Maps > Dynamic Map** or **JavaScript 지도 API** on the Application.

### `VITE_NAVER_MAP_CLIENT_ID` setup

1. In Naver Cloud Console, copy the Application **Client ID** (`X-NCP-APIGW-API-KEY-ID`).
2. Set `VITE_NAVER_MAP_CLIENT_ID` in the **build environment** for staging/production.
3. Run `pnpm run build` and deploy the artifact.
4. **Do not** set Client Secret anywhere in the frontend or `VITE_*` variables.

### Web service URL (domain whitelist)

Register every origin users will open in a browser. `/v3/auth` returns 401 if the deploy URL is missing.

| Environment | Example URLs to register |
|-------------|-------------------------|
| Local dev | `http://localhost:3000`, `http://127.0.0.1:3000` |
| Staging | `https://<your-staging-host>` (exact URL) |
| Production | `https://<your-production-host>`, `https://www.<your-production-host>` if used |

Use the **exact scheme, host, and port** users visit. Register staging and production domains separately before smoke testing the map.

---

## Supabase

| Item | Action |
|------|--------|
| **Project per environment** | Use separate Supabase projects for staging and production when possible |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Set to the **target project** at build time |
| **RLS** | Migrations in `supabase/migrations/` must be applied to the target project before go-live |
| **`VITE_SUPER_ADMIN_EMAIL`** | If set, same email (lowercase) should exist in `dk_super_bootstrap_emails` for bootstrap flows (see `README.md`) |
| **Public listings** | App loads `status = 'approved'` institutions; RLS should enforce the same rules |
| **profiles insert 400** | Monitor after deploy on admin signup and first login |

---

## Email / SMTP

### Current state

- **Email verification Phase 1** UI and guards exist (`/verify-email`, login redirects).
- **Supabase default mail** has rate limits — full signup/verification E2E is **deferred** until Custom SMTP.
- **Inquiry notification** Edge Function (`app_ffc7da1b64_notify_inquiry`) requires server-side SMTP env (not `VITE_*`).

### Edge Function secrets (server only)

Configure in Supabase project secrets, not in the frontend:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_SECURE` (optional)

Edge Functions also use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (managed by Supabase; never expose service_role to the client).

### Confirm email — operate with caution before Custom SMTP

| Phase | Recommendation |
|-------|----------------|
| Before Custom SMTP | Keep **Confirm email OFF** or limited testing only — avoid mass signups that hit rate limits |
| After Custom SMTP on staging | Turn **Confirm email ON**, run full verification E2E |
| Production | Turn **Confirm email ON** only after SMTP is stable and policies are agreed |

Community write/report flows may redirect unverified users to `/verify-email` when Confirm email is enabled.

---

## Test Accounts

Prepare stable accounts in the **target Supabase project** before staging smoke tests.

| Role | Purpose | Notes |
|------|---------|-------|
| **super_admin** | `/admin/dashboard`, institutions, community reports | Assign in Supabase or bootstrap via `VITE_SUPER_ADMIN_EMAIL` + bootstrap table |
| **admin** | Institution inquiries, approvals | Dedicated test email; document verification state |
| **role=user (parent)** | MyPage region profile, `/community?mine=1`, post creation | Prefer dedicated test emails; create after SMTP if Confirm email is ON |
| **Guest** | Login CTAs, route guards | No account needed |

Avoid using production personal emails for automated E2E. Store credentials in a team password manager, not in git.

---

## Smoke Test

Run on **staging** after deploy (then repeat critical paths on production).

1. **Build artifact** — Confirm CI ran `pnpm run lint` and `pnpm run build` successfully.
2. **Static routes** — `/`, `/login`, `/community`, `/mypage` return 200 and render content.
3. **Search list** — `/search` loads approved institutions.
4. **Naver map** — Toggle map view; Network: `maps.js` 200, `/v3/auth` 200; map renders; marker click navigates to `/detail/:id`.
5. **Detail** — Open `/detail/:id` for a known approved institution id.
6. **Community** — Category filter, region filter (sido/sigungu), `/community?mine=1` when logged in as parent; guest `/community/new` shows login guidance.
7. **MyPage** — Guest sees login CTA; `role=user` can save profile region when test account exists.
8. **Admin** — Guest `/admin/dashboard` redirects to `/admin/login`; super_admin login and dashboard tabs (institutions, inquiries, community reports).
9. **Console / network** — No unexpected 4xx; watch for `profiles` 400 and unexpected Supabase 401/403.
10. **Email** (after Custom SMTP) — One signup or password-reset mail delivered end-to-end.

---

## Security Rules

1. **Never** put Naver Client Secret, Supabase service_role, or SMTP passwords in `VITE_*` or frontend code.
2. **Never** commit `.env` — use CI secrets and hosting env UI.
3. **Separate keys** per environment (staging vs production Supabase and Naver Applications).
4. **Rotate** any key that was ever committed, shared in chat, or used in a public build log.
5. **Anon key is public but not optional** — security depends on RLS; audit policies before production traffic.
6. **Maps security** — public Client ID + NCP Web service URL whitelist; verify production domain before launch.

---

## Pre-production Checklist

### Build environment

- [ ] `VITE_SUPABASE_URL` set for target project
- [ ] `VITE_SUPABASE_ANON_KEY` set for target project
- [ ] `VITE_NAVER_MAP_CLIENT_ID` set (public Client ID for target NCP Application)
- [ ] (Recommended) `VITE_SITE_URL` set for correct sitemap/SEO
- [ ] (Optional) `VITE_SUPER_ADMIN_EMAIL` aligned with bootstrap table

### Naver Cloud

- [ ] Dynamic Map / JavaScript Maps API enabled
- [ ] Staging and production **Web service URLs** registered
- [ ] Client Secret not used in frontend

### Supabase

- [ ] Migrations / RLS applied to target project
- [ ] Confirm email policy decided (SMTP readiness)
- [ ] Edge Function SMTP secrets set if inquiry emails are required

### Security

- [ ] No service_role or secrets in client bundle (inspect build / Network)
- [ ] Staging and production projects and keys separated

### Testing

- [ ] super_admin, admin, and parent test accounts ready
- [ ] Smoke test steps 1–10 executed on staging

---

## Known Deferred Items

- **Custom SMTP** — Required for reliable auth email and inquiry notifications at scale.
- **Confirm email ON in production** — Defer until SMTP is configured and verified on staging.
- **Parent / super_admin full E2E** — May be blocked by email rate limits until SMTP and test accounts exist.
- **`.env.example` gaps** — `VITE_SITE_URL` and some meta vars are optional but not yet listed in `.env.example` (documented here).
- **Legacy community posts** — Free-text regions may not match normalized region filters from PR #27.

---

## Related docs

- [`.env.example`](../.env.example) — Variable names for local setup
- [`README.md`](../README.md) — Dev commands, Supabase RLS, bootstrap email
- [`app-store-checklist.md`](./app-store-checklist.md) — Store submission checklist

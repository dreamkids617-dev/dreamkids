# Dream Kids

## Cursor Cloud specific instructions

### Overview

Dream Kids is a mobile-first React/Vite SPA for searching Korean educational institutions (kindergartens/childcare). Backend is entirely Supabase (Auth, PostgreSQL, Storage, Edge Functions). See `README.md` for full tech stack and file structure.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `pnpm install` |
| Dev server | `pnpm run dev` (Vite on port 3000, binds 0.0.0.0) |
| Lint | `pnpm run lint` |
| Build | `pnpm run build` |
| Preview | `pnpm run preview` |

### Environment variables

Copy `.env.example` to `.env`. Required keys: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Without valid Supabase credentials, the app UI loads but all data/auth operations fail gracefully (empty states, login prompts). To allow the app to start without real credentials, set placeholder values in `.env`:

```
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder
```

### Gotchas

- **pnpm build script warnings**: pnpm 10+ blocks build scripts for `@swc/core` and `esbuild` by default. These packages ship prebuilt binaries, so the warnings can be safely ignored — Vite works without running those build scripts.
- **Vite polling**: The dev server uses `usePolling: true` for file watching (see `vite.config.ts`). This is intentional for Docker/VM environments.
- **No automated test files**: Playwright is listed as a devDependency but no test files exist yet. `pnpm run lint` is the primary automated check.
- **Blog prerendering**: `vite.config.ts` imports from `prerender/` for blog SSG. No blog content files exist in `seo/content/`, so blog prerendering is a no-op during build.
- **Supabase table suffix**: All Supabase tables use the suffix `_ffc7da1b64` (e.g., `institutions_ffc7da1b64`). This is defined in `src/lib/supabase.ts`.

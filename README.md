# Dream Kids

Dream Kids is a mobile-first React/Vite MVP for helping parents search educational institutions, save favorites, submit inquiries, and request consultation reservations. The project was originally exported from Atome and has been converted into a normal GitHub development tree.

## Technology stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase Auth, Database, Storage, and Edge Functions

## File structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.ts` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/main.tsx` - Project entry point
- `src/App.tsx` - React Router shell
- `src/pages/` - User, admin, search, detail, compare, and account pages
- `src/contexts/AuthContext.tsx` - Supabase auth/session/profile state
- `src/lib/supabase.ts` - Supabase client, table names, and shared types
- `supabase/functions/` - Supabase Edge Functions
- `src/index.css` - Existing CSS configuration

## Environment

Copy `.env.example` to `.env` and fill in:

```shell
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Optional keys are documented in `.env.example` (`VITE_API_BASE_URL`, `VITE_SUPER_ADMIN_EMAIL`).

Production builds resolve `API_BASE_URL` in this order: build-time `VITE_API_BASE_URL` if set, else a same-origin `GET /api/config` JSON response. Local `pnpm run dev` skips the fetch and uses `.env` / defaults. `vite preview` can serve `/api/config` via Vite without a separate backend (see `vite.config.ts`).

## Supabase row-level security (RLS)

Database and Storage migration conventions are documented in [`supabase/README.md`](supabase/README.md). Policy SQL lives in `supabase/migrations/`. Apply them to your Supabase project with the [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase db push` against a linked project) or by running the latest migration file in the SQL editor.

After changing `VITE_SUPER_ADMIN_EMAIL`, add the same address (lowercase) to the `dk_super_bootstrap_emails` table so the first `super_admin` profile can still be created from the client where that flow is used.

Public institution listings in the app only load rows with `status = 'approved'`; RLS enforces the same rules at the database layer.

## Commands

Install dependencies:

```shell
pnpm install
```

Start local dev server:

```shell
pnpm run dev
```

Build production assets:

```shell
pnpm run build
```

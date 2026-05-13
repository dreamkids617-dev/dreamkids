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

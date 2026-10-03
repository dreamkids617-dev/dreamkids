# Local E2E helpers

Playwright scripts for approval-flow smoke tests. **Do not commit credentials.**

```bash
# App must be running with real VITE_SUPABASE_* in .env
pnpm run dev -- --host 127.0.0.1 --port 3000

E2E_BASE_URL=http://127.0.0.1:3000 \
E2E_SUPER_ADMIN_EMAIL='...' \
E2E_SUPER_ADMIN_PASSWORD='...' \
node e2e/approval-flow-super.mjs
```

`approval-flow.mjs` includes admin/parent signup and is blocked when Confirm email is ON unless mailboxes are available.
`approval-flow-super.mjs` covers Super login → institution create → public listing.

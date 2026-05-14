# App Store / Play submission checklist (Dream Kids)

Use this when preparing store listings and review. Adjust per platform (Apple App Store vs Google Play) and local law (PIPA, COPPA, etc.).

## Accounts and review access

- [ ] **Demo parent account**: email, password, stable data (no 2FA surprises for reviewers).
- [ ] **Demo admin account** (optional): only if reviewers must access `/admin`; otherwise explain that admin is web-only.
- [ ] **Password reset**: confirm reset email or in-app flow works in production.
- [ ] **Super admin**: avoid hard-coded production emails in repo; use `VITE_SUPER_ADMIN_EMAIL` at build time or assign `super_admin` only in Supabase.

## Privacy and legal

- [ ] **Privacy policy URL** (hosted, versioned).
- [ ] **Terms of service** if you collect inquiries, reservations, or child-related data.
- [ ] **Data collection disclosure**: what Supabase stores (profiles, inquiries, reservations, logs).
- [ ] **Third parties**: Supabase region, analytics, maps, CDN image hosts (replace any placeholder image URLs if required).

## App quality

- [ ] **Production Supabase**: RLS enabled; no service role keys in the client bundle.
- [ ] **Public listings**: only `approved` institutions appear on home, search, and detail (enforced in app + RLS).
- [ ] **Screenshots**: localized if you ship multiple locales.
- [ ] **Support URL or email** in store metadata.

## Technical smoke tests

- [ ] Sign up / sign in / sign out (user and admin if applicable).
- [ ] Search, detail, favorite, inquiry, reservation against production project.
- [ ] Offline or bad network: graceful errors, no blank white screen.
- [ ] `pnpm run build` and installable build (Capacitor / TWA / native wrapper) as you ship.

## Google Play–specific (if Android)

- [ ] Data safety form aligned with actual data use.
- [ ] Target API level per Play requirements.

## Apple App Store–specific (if iOS)

- [ ] App Privacy “nutrition” labels match data practices.
- [ ] Sign in with Apple if you offer other third-party logins (rule may apply).

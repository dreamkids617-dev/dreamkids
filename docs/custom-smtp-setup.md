# Custom SMTP Setup Checklist (Dream Kids)

Practical setup guide for the two email paths used by Dream Kids.  
Do **not** put SMTP passwords in `VITE_*` or the frontend.

Related: `docs/auth-email-smtp-policy.md`, `docs/deploy-checklist.md`

---

## Why this is needed

| Without Custom SMTP | With Custom SMTP |
|---------------------|------------------|
| Supabase default mail rate limits | Stable signup / reset / confirm mail |
| Confirm email E2E often blocked | Confirm email ON is workable |
| Inquiry admin notify may fail | Edge Function can send mail |

Current project note (2026-10-02 E2E): Confirm email is ON (`mailer_autoconfirm: false`). Full admin/parent signup E2E needs reliable mail delivery.

---

## A. Supabase Auth SMTP (signup / confirm / password reset)

### Dashboard path

```text
Supabase Dashboard
→ Authentication
→ Emails (or Providers → Email)
→ SMTP Settings
→ Enable Custom SMTP
```

### Values to fill

| Field | Example / notes |
|-------|-----------------|
| Sender email | `no-reply@your-domain.com` (prefer your domain) |
| Sender name | `Dream Kids` |
| Host | Provider SMTP host (e.g. `smtp.resend.com`, `smtp.sendgrid.net`, `smtp.gmail.com`) |
| Port | `587` (STARTTLS) or `465` (SSL) — follow provider docs |
| Username | Provider SMTP user |
| Password | Provider SMTP password / API key (**secret**) |

### DNS (recommended before production)

On the sender domain:

- **SPF**
- **DKIM**
- **DMARC**

Skip only for short internal tests; App Store / production should have these.

### Verify Auth SMTP

1. Keep a test inbox ready (not a throwaway blocked by rate limits).
2. Sign up a new parent at `/login` → expect `/verify-email` and a real inbox message.
3. Trigger password reset from login → expect reset mail.
4. Open the link and confirm it lands back on the app.

---

## B. Inquiry notification Edge Function SMTP

Function: `supabase/functions/app_ffc7da1b64_notify_inquiry`

### Dashboard path

```text
Supabase Dashboard
→ Edge Functions
→ app_ffc7da1b64_notify_inquiry
→ Secrets / Environment variables
```

### Required secrets (server only)

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
SMTP_SECURE          # optional; default treated as true unless "false"
SUPABASE_URL         # usually provided by platform
SUPABASE_SERVICE_ROLE_KEY   # platform / never expose to client
```

If SMTP secrets are missing, the function logs failure and does **not** block the inquiry insert (by design).

### Verify inquiry mail

1. Ensure at least one approved active admin exists for the institution.
2. As a logged-in parent, submit an inquiry on `/detail/:id`.
3. Confirm the admin receives the notification email (or check function logs if not).

---

## Provider quick picks

Pick one and stick to it for both Auth SMTP and Edge Function when possible.

| Provider | Notes |
|----------|-------|
| Resend / SendGrid / Amazon SES | Good for production + DNS |
| Gmail SMTP | OK for early tests only; app passwords + daily limits; not ideal for production |

---

## Suggested order of operations

1. Choose SMTP provider and create API credentials.
2. Configure **Auth Custom SMTP** and send one confirm + one reset mail.
3. Configure **Edge Function** SMTP secrets and send one inquiry notification.
4. Keep **Confirm email ON** for beta (policy in `auth-email-smtp-policy.md`).
5. Re-run full approval E2E (admin signup → approve → institution → public → inquiry).

---

## Manual checklist

- [ ] Auth Custom SMTP enabled
- [ ] Signup confirmation email received
- [ ] Password reset email received
- [ ] Edge Function `SMTP_*` secrets set
- [ ] Inquiry notification email received
- [ ] Sender domain SPF/DKIM/DMARC set (before production)
- [ ] No SMTP secrets in frontend / git / Vercel `VITE_*`

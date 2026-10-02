# Auth E2E, Confirm Email, and Custom SMTP Policy

Last checked: 2026-10-02

## 1. E2E verification result

### Parent signup

- Parent signup page opens at `/login`.
- A clearly invalid test domain was rejected by Supabase as an invalid email address.
- A Gmail-style test address was accepted.
- After signup, the app redirected to `/verify-email`.
- Supabase returned `confirmation_sent_at`, meaning email confirmation is enabled.

Current conclusion:

```text
Confirm email is currently ON.
Parent users must verify email before completing the full account flow.
```

### Super Admin login

- Super Admin login page opens at `/admin/login`.
- Super Admin login succeeded.
- Dashboard loaded at `/admin/dashboard`.
- Profile role was treated as `super_admin`.

Current conclusion:

```text
Super Admin login works.
Super Admin dashboard access works.
```

## 2. Confirm email policy

Recommended policy for beta:

```text
Keep Confirm email ON.
```

Reason:

- Prevents fake email accounts.
- Helps App Store / Play Store review.
- Reduces spam and fake community activity.
- Supports safer admin signup review.

Important product behavior:

```text
Public browsing can remain open.
Actions that require identity should require verified email.
```

Examples of actions that should require verified email:

- writing community posts
- reporting posts
- making inquiries
- making reservations
- admin signup/login completion
- admin dashboard access

If the business requirement changes to "users can fully use immediately after signup", then Supabase Confirm email must be turned OFF or the app must allow a limited unverified-user mode.

## 3. Admin approval policy

Admin approval has two gates:

```text
1. Email verification
2. Super Admin approval
```

Current intended flow:

```text
/admin/signup
-> admin account created
-> email verification required if Supabase Confirm email is ON
-> profile role = admin
-> is_approved = false
-> Super Admin approves
-> admin can access /admin/dashboard
```

## 4. Custom SMTP policy

Custom SMTP should be configured before production or app store review.

**Hands-on checklist:** `docs/custom-smtp-setup.md` (Auth SMTP + Edge Function secrets + verification steps).

There are two separate email systems to consider:

### A. Supabase Auth email

Used for:

- signup confirmation
- magic links if enabled
- password reset

Configure in Supabase Dashboard:

```text
Authentication
-> Providers / Email
-> SMTP Settings
```

Required values usually include:

```text
SMTP host
SMTP port
SMTP username
SMTP password
Sender email
Sender name
```

Recommended:

```text
Use a branded sender domain.
Example: no-reply@your-domain.com
```

DNS setup should include:

- SPF
- DKIM
- DMARC

### B. Supabase Edge Function inquiry notification email

Used by:

```text
supabase/functions/app_ffc7da1b64_notify_inquiry
```

Required Edge Function environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
SMTP_SECURE
```

Current code behavior:

- If SMTP is configured, inquiry emails are sent to approved active admins.
- If SMTP is missing, the function logs the failure and returns a non-blocking response.

## 5. What is not verified yet

The following cannot be fully verified from the frontend repo alone:

- Whether Supabase Auth Custom SMTP is configured in the dashboard.
- Whether Edge Function SMTP environment variables are configured in Supabase.
- Whether actual email delivery reaches inbox instead of spam.

Manual checks needed:

1. Send a signup confirmation email.
2. Confirm the email arrives.
3. Test password reset email.
4. Submit an inquiry.
5. Confirm admin notification email arrives.

## 6. Next recommended work

1. Confirm final email policy:

```text
Confirm email ON for beta.
```

2. Configure Custom SMTP in Supabase Auth.

3. Configure SMTP environment variables for the inquiry notification Edge Function.

4. Run email delivery tests.

5. Add RLS policies to enforce verified/admin-approved behavior at the database level.


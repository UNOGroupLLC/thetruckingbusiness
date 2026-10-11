# Phase 2 — Owner Account Checklist

The site is **key-ready**: all Phase 2 plumbing (database, API routes, owner emails, admin inbox) is built and degrades gracefully to demo mode until these accounts exist. **The assistant cannot create these in the owner's name** — each needs the owner's business identity.

## 1. Supabase (database) — ~10 minutes
1. Go to https://supabase.com → create account → **New project** (free tier is fine to start).
2. In the project: **SQL Editor → New query** → paste the entire contents of `supabase/schema.sql` → **Run**. (Creates `orders`, `intake_submissions`, `call_bookings`.)
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret — never expose client-side)
4. Add both as **Environment Variables** in Vercel (Project Settings → Environment Variables), then redeploy.

## 2. Resend (owner email notifications) — ~10 minutes
1. Go to https://resend.com → create account.
2. **Domains → Add domain** → add `thetruckingbusiness.com` → add the DNS records it shows (in Namecheap, alongside the Vercel records) → wait for verification.
3. **API Keys → Create API key** → copy → `RESEND_API_KEY`.
4. Decide the inbox: `OWNER_EMAIL=` (the email that receives purchase/intake/booking alerts).
5. Set `EMAIL_FROM=orders@thetruckingbusiness.com` (must be on the verified domain).
6. Add all three as Vercel Environment Variables, then redeploy.

## 3. Verify end-to-end (after both are set)
1. Make a **test purchase** on the live site (still simulated payment — Stripe comes next).
2. Confirm: row appears in Supabase **Table Editor → orders**; owner inbox email arrives; admin **Order inbox** shows it.
3. Submit the **intake form** → confirm `intake_submissions` row + owner email with all answers.
4. Book a **kickoff call** (Complete Package) → confirm `call_bookings` row + owner email with date/time.

## 4. Next Phase 2 milestones (after this slice)
- **Stripe**: real checkout (PaymentIntent), webhooks verify payment before owner notification.
- **Owner login**: replace temporary `ADMIN_KEY` with real auth on `/admin`.
- **Client portal auth**: real OTP via Supabase Auth; documents via Supabase Storage.
- **Calendar invites**: booking creates a real calendar event + invite email.
- **POA e-signature**: DocuSign/HelloSign for the attorney-drafted limited POA.

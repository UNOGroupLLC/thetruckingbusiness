# TheTruckingBusiness.com — Phase 1 Scaffold

Working Next.js (App Router + Tailwind v4) scaffold of TheTruckingBusiness.com with the full
customer journey functional on **mock data**. No real payments, no real database, no real auth.

## Run it

```bash
cd /home/hatch/workspace/thetruckingbusiness-app
npm install   # only needed once (already installed)
npm run dev   # → http://localhost:3000
```

## Click-through journey (all working)

1. `/` — homepage: video hero, "START YOUR TRUCKING COMPANY", trust notes, two-path
   journey, services, calculators teaser, FAQ, footer.
2. `/pricing` — three packages (Authority $695, Complete Startup $1,495, Compliance $149/mo).
   **All prices are PLACEHOLDER** (labeled as such) until the owner approves real pricing.
3. `/checkout/[slug]` — mock checkout form (clearly labeled demo, no real charge).
4. `/receipt?id=…` — simulated receipt → continue to intake.
5. `/intake/authority` or `/intake/compliance` — service-specific intake forms.
6. `/fulfillment?order=…` — fulfillment summary: exactly what the owner would receive.
7. `/portal/login` → `/portal/dashboard` — mock passwordless login (any 6-digit code works);
   dashboard shows demo orders, submitted intake details, and SAMPLE documents.
8. `/calculators` — chooser → `/calculators/cost-per-mile` and `/calculators/startup-cost`
   (the owner's complete calculators, ported with bug fixes).
9. `/admin` — mock owner panel: edit package prices, inclusions, fee breakdowns, and
   homepage copy. Saves to this browser's localStorage.

## Project structure

```
app/
  page.tsx                    homepage
  pricing/page.tsx            packages (reads mock store)
  checkout/[slug]/page.tsx    mock checkout
  receipt/page.tsx            simulated receipt
  intake/[service]/page.tsx   authority + compliance intake forms
  fulfillment/page.tsx        owner-facing fulfillment summary
  portal/login/page.tsx       mock email+code login
  portal/dashboard/page.tsx   orders, intake, sample documents
  admin/page.tsx              mock owner admin
  calculators/page.tsx        calculator chooser
  calculators/cost-per-mile/page.tsx
  calculators/startup-cost/page.tsx
components/
  Navbar.tsx  Footer.tsx  Field.tsx  Faq.tsx
  CostPerMileCalculator.tsx StartupCostCalculator.tsx  (ported from owner's HTML)
lib/
  store.ts                    mock data layer — types + all read/write functions
public/
  hero-truck-30s.mp4 / hero-truck-30s-poster.jpg   hero video assets
```

## Mock vs. production (Phase 2 wiring)

| Phase 1 (mock)                              | Phase 2 (production)                                              |
|---------------------------------------------|-------------------------------------------------------------------|
| `lib/store.ts` localStorage                 | Supabase Postgres: `packages`, `site_copy`, `orders` (intake JSONB) |
| "Pay" button creates order locally          | Stripe PaymentIntent via server route + webhook creates the order  |
| Any 6-digit code logs in                    | Supabase Auth `signInWithOtp` / `verifyOtp` (real emailed codes)  |
| Fulfillment page only                       | + owner email (Resend/Postmark) on order & intake submission      |
| Sample documents hardcoded                  | Supabase Storage / S3 per-customer bucket + `documents` table     |
| Admin edits → localStorage                  | Owner-gated admin → Supabase/CMS writes                           |
| No emails sent                              | OTP codes, receipts, notifications via email service              |

**Seam rule:** pages import only from `lib/store.ts`. Phase 2 replaces that module's
internals (and adds `app/api/*` routes for Stripe webhooks) without rewriting pages.
Search for `Phase 2` in the code for every seam.

## Notes

- Pricing, package inclusions, and fee breakdowns are the owner's draft content with
  placeholder prices — confirm before launch.
- Decided production pricing strategy (Oct 10, 2026) lives in
  `workspace/your_files/pricing-packages/pricing-packages.md`. Phase 1 intentionally keeps the
  three placeholder packages per the demo plan; Phase 2 should seed the database from that doc.
- UCR fee figures inside the startup calculator are the owner's content, shown as-is;
  verify against the official UCR Plan before launch.
- Calculator content is educational, not a quote or legal advice (disclaimers included).
- No secrets or API keys are used anywhere in Phase 1.

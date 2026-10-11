'use client';

/**
 * ============================================================================
 * PHASE 1 — MOCK DATA LAYER
 * ============================================================================
 * Everything here is in-memory + localStorage. It mirrors the SHAPE of the
 * production data model so Phase 2 can swap implementations without touching
 * page code.
 *
 * PRODUCTION SEAMS (Phase 2):
 *  - Packages / site copy  -> Supabase Postgres tables `packages`, `site_copy`
 *    (or a headless CMS). Replace load()/persist()/updatePackage()/updateCopy().
 *  - Orders / intake       -> Supabase `orders` table (row per order, intake as
 *    JSONB). Replace createOrder()/saveIntake()/getOrder().
 *  - Checkout payment      -> Stripe Checkout / Payment Element. Replace the
 *    mock "Pay" handler in app/checkout/[slug]/page.tsx with a call to a
 *    server route that creates a Stripe PaymentIntent; confirm on the client,
 *    then create the order from the webhook.
 *  - Portal login          -> Supabase Auth email OTP (signInWithOtp). Replace
 *    the mock code step in app/portal/login/page.tsx.
 *  - Owner notifications   -> On order/intake creation, send email (Resend /
 *    Postmark) to the business owner with the fulfillment summary.
 *  - Documents             -> Supabase Storage / S3 bucket per customer; rows in
 *    a `documents` table; listed in the portal dashboard.
 *
 * RULE: pages only import from this module (types + functions below). Never
 * reach into localStorage directly from a page.
 * ============================================================================
 */

import { useSyncExternalStore } from 'react';

export interface FeeLine {
  label: string;
  amount: number; // USD; 0 allowed when marked "vary / at cost"
  kind: 'ours' | 'government';
  note?: string;
}

export interface Package {
  slug: string;
  name: string;
  tagline: string;
  price: number; // USD
  billing: 'one-time' | '/mo' | '/yr';
  placeholder: boolean; // true until the owner approves real pricing
  category: 'package' | 'alacarte';
  inclusions: string[];
  fees: FeeLine[]; // all-in breakdown: our fee + government fees included
  intake: 'authority' | 'compliance';
  cta: string; // pricing-page button label (kept as "Buy ..." per owner)
}

export interface SiteCopy {
  heroHeadline: string;
  heroSub: string;
  trustNotes: string[];
  contactEmail: string;
  contactPhone: string;
}

export interface OrderRecord {
  id: string;
  packageSlug: string;
  packageName: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  createdAt: string; // ISO
  intakeService: 'authority' | 'compliance';
  intake?: Record<string, string>;
}

interface State {
  packages: Package[];
  copy: SiteCopy;
  orders: OrderRecord[];
  portalEmail: string | null;
}

const STORAGE_KEY = 'ttb-phase1-store-v2';

const SEED_PACKAGES: Package[] = [
  {
    slug: 'complete',
    name: 'The Complete Package',
    tagline: 'Everything needed to launch and stay compliant in one purchase.',
    price: 1499,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Complete Package',
    intake: 'authority',
    inclusions: [
      'Motor Carrier Authority (FMCSA $300 filing fee included)',
      'DOT & MC numbers',
      'BOC-3 processing agent',
      'UCR filing (1st year, 0–2 power units)',
      'Drug & Alcohol Consortium membership (1st year)',
      'FMCSA Drug & Alcohol Clearinghouse account setup',
      'Full audit prep kit (folders, forms, safety policies & procedures)',
      'One-on-one new-entrant audit prep session',
      'Compliance onboarding call',
    ],
    fees: [
      { label: 'FMCSA operating authority filing fee', amount: 300, kind: 'government' },
      { label: 'Our service fee — everything else', amount: 1199, kind: 'ours' },
    ],
  },
  {
    slug: 'authority-plus',
    name: 'Authority Plus',
    tagline: 'MC authority plus the filings that keep you rolling.',
    price: 879,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Authority Plus',
    intake: 'authority',
    inclusions: [
      'Motor Carrier Authority (FMCSA $300 filing fee included)',
      'DOT & MC numbers',
      'BOC-3 processing agent',
      'UCR filing',
    ],
    fees: [
      { label: 'FMCSA operating authority filing fee', amount: 300, kind: 'government' },
      { label: 'Our service fee', amount: 579, kind: 'ours' },
    ],
  },
  {
    slug: 'authority-startup',
    name: 'Authority Startup',
    tagline: 'The essentials to get your motor carrier authority.',
    price: 539,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Authority Startup',
    intake: 'authority',
    inclusions: [
      'Motor Carrier Authority (FMCSA $300 filing fee included)',
      'DOT & MC numbers',
      'BOC-3 processing agent',
    ],
    fees: [
      { label: 'FMCSA operating authority filing fee', amount: 300, kind: 'government' },
      { label: 'Our service fee', amount: 239, kind: 'ours' },
    ],
  },
  {
    slug: 'intrastate',
    name: 'Intrastate DOT Number',
    tagline: 'For intrastate commerce only — we do all the paperwork.',
    price: 179,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Intrastate Filing',
    intake: 'authority',
    inclusions: [
      'USDOT number registration for intrastate operation',
      'All paperwork handled for you',
    ],
    fees: [{ label: 'Our service fee', amount: 179, kind: 'ours' }],
  },
  {
    slug: 'reinstatement',
    name: 'DOT Number Reinstatement',
    tagline: 'Restore a DOT number marked Not Authorized or inactive.',
    price: 179,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Reinstatement',
    intake: 'authority',
    inclusions: [
      'Reinstatement filing handled for you',
      'Status review and next steps',
    ],
    fees: [{ label: 'Our service fee', amount: 179, kind: 'ours' }],
  },
  {
    slug: 'compliance',
    name: 'Compliance Subscription',
    tagline: 'Ongoing compliance peace of mind. Cancel anytime.',
    price: 89,
    billing: '/mo',
    placeholder: false,
    category: 'package',
    cta: 'Buy Compliance Subscription',
    intake: 'compliance',
    inclusions: [
      'Drug & Alcohol Consortium membership included',
      'Annual UCR filing handled (UCR fee for 0–2 units included)',
      'Quarterly compliance check-ins (MCS-150, licenses, filings)',
      'Annual Driver Query',
      'IFTA Quarterly Filing (carrier IFTA taxes not included)',
      'Priority email support',
    ],
    fees: [
      { label: 'Our monthly service fee', amount: 89, kind: 'ours' },
      {
        label: 'Annual UCR government fee (0–2 units)',
        amount: 0,
        kind: 'government',
        note: 'Covered by your subscription',
      },
    ],
  },
  {
    slug: 'consortium',
    name: 'Consortium Membership',
    tagline: 'Annual DOT drug & alcohol consortium membership.',
    price: 139,
    billing: '/yr',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy Consortium',
    intake: 'compliance',
    inclusions: ['Annual consortium membership', 'Random testing program management'],
    fees: [{ label: 'Our service fee', amount: 139, kind: 'ours' }],
  },
  {
    slug: 'clearinghouse',
    name: 'Clearinghouse Setup',
    tagline: 'FMCSA Drug & Alcohol Clearinghouse account setup.',
    price: 139,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy Clearinghouse Setup',
    intake: 'compliance',
    inclusions: ['Clearinghouse account registration', 'Setup guidance'],
    fees: [{ label: 'Our service fee', amount: 139, kind: 'ours' }],
  },
  {
    slug: 'boc3',
    name: 'BOC-3 Filing',
    tagline: 'Process agent filing for your operating authority.',
    price: 59,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy BOC-3 Filing',
    intake: 'authority',
    inclusions: ['BOC-3 process agent designation filed in all states'],
    fees: [{ label: 'Our service fee', amount: 59, kind: 'ours' }],
  },
  {
    slug: 'ucr',
    name: 'UCR Filing',
    tagline: 'Annual UCR registration, 0–2 power units, fee included.',
    price: 99,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy UCR Filing',
    intake: 'compliance',
    inclusions: ['UCR registration for 0–2 power units', 'Government UCR fee included'],
    fees: [{ label: 'UCR filing including government fee (0–2 units)', amount: 99, kind: 'ours' }],
  },
  {
    slug: 'audit-kit',
    name: 'Audit Assistance Kit',
    tagline: 'Nine folders and thirteen forms for audit readiness.',
    price: 139,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy Audit Kit',
    intake: 'compliance',
    inclusions: ['9 compliance folders', '13 ready-to-use forms'],
    fees: [{ label: 'Our service fee', amount: 139, kind: 'ours' }],
  },
  {
    slug: 'audit-plus',
    name: 'Audit Assistance Plus',
    tagline: 'One-on-one audit support from a compliance specialist.',
    price: 529,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy Audit Plus',
    intake: 'compliance',
    inclusions: ['1-on-1 new-entrant audit prep session', 'Document review before your audit'],
    fees: [{ label: 'Our service fee', amount: 529, kind: 'ours' }],
  },
];

const SEED_COPY: SiteCopy = {
  heroHeadline: 'START YOUR TRUCKING COMPANY',
  heroSub:
    'From idea to the open road: we get your trucking company rolling — business setup, operating authority, and DOT compliance, all in one place.',
  trustNotes: [
    'Stay Compliant',
    'Buy online in minutes',
    '100% All-in pricing — our fee and government fees included',
  ],
  contactEmail: 'hello@thetruckingbusiness.com',
  contactPhone: '(555) 010-4477',
};

function seeds(): State {
  return {
    packages: SEED_PACKAGES,
    copy: SEED_COPY,
    orders: [],
    portalEmail: null,
  };
}

let state: State = seeds();
let loaded = false;
const listeners = new Set<() => void>();

function load(): State {
  if (!loaded) {
    loaded = true;
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<State>;
          const base = seeds();
          state = {
            ...base,
            ...parsed,
            copy: { ...base.copy, ...(parsed.copy ?? {}) },
            packages:
              Array.isArray(parsed.packages) && parsed.packages.length > 0
                ? parsed.packages
                : base.packages,
            orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          };
        }
      } catch {
        /* corrupted storage -> fall back to seeds */
      }
    }
  }
  return state;
}

function persist() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / unavailable -> keep in-memory only */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot: State = seeds();

/** Reactive hook: re-renders the component whenever mock data changes. */
export function useTtb(): State {
  return useSyncExternalStore(subscribe, load, () => serverSnapshot);
}

/* ------------------------------ mutations ------------------------------ */

export function updatePackage(slug: string, patch: Partial<Package>) {
  load();
  state = {
    ...state,
    packages: state.packages.map((p) => (p.slug === slug ? { ...p, ...patch } : p)),
  };
  persist();
}

export function updateCopy(patch: Partial<SiteCopy>) {
  load();
  state = { ...state, copy: { ...state.copy, ...patch } };
  persist();
}

export function createOrder(input: {
  packageSlug: string;
  buyerName: string;
  buyerEmail: string;
}): OrderRecord {
  load();
  const pkg = state.packages.find((p) => p.slug === input.packageSlug);
  if (!pkg) throw new Error(`Unknown package: ${input.packageSlug}`);
  const order: OrderRecord = {
    id: `TTB-${Date.now().toString().slice(-6)}`,
    packageSlug: pkg.slug,
    packageName: pkg.name,
    amount: pkg.price,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    createdAt: new Date().toISOString(),
    intakeService: pkg.intake,
  };
  state = { ...state, orders: [order, ...state.orders] };
  persist();
  // Phase 2: also POST to /api/orders (Supabase insert + owner email + Stripe webhook)
  return order;
}

export function saveIntake(orderId: string, data: Record<string, string>) {
  load();
  state = {
    ...state,
    orders: state.orders.map((o) => (o.id === orderId ? { ...o, intake: data } : o)),
  };
  persist();
  // Phase 2: also POST to /api/orders/[id]/intake (Supabase update + owner email)
}

export function getOrder(id: string | null | undefined): OrderRecord | undefined {
  if (!id) return undefined;
  return load().orders.find((o) => o.id === id);
}

/* ------------------------- kickoff call bookings ------------------------ */

export interface CallBooking {
  orderId: string;
  date: string; // YYYY-MM-DD
  time: string; // display label, e.g. "10:30 AM"
  createdAt: string; // ISO
}

const BOOKINGS_KEY = 'ttb_call_bookings_v1';

function loadBookings(): CallBooking[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(BOOKINGS_KEY) ?? '[]') as CallBooking[];
  } catch {
    return [];
  }
}

export function saveCallBooking(orderId: string, date: string, time: string): CallBooking {
  const rest = loadBookings().filter((b) => b.orderId !== orderId);
  const booking: CallBooking = { orderId, date, time, createdAt: new Date().toISOString() };
  try {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify([booking, ...rest]));
  } catch {
    /* storage unavailable — demo only */
  }
  // Phase 2: POST to /api/orders/[id]/call-booking (Supabase + calendar invite email)
  return booking;
}

export function getCallBooking(orderId: string | null | undefined): CallBooking | undefined {
  if (!orderId) return undefined;
  return loadBookings().find((b) => b.orderId === orderId);
}

export function setPortalEmail(email: string | null) {
  load();
  state = { ...state, portalEmail: email };
  persist();
}

/* -------------------------------- helpers ------------------------------- */

export function formatUSD(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

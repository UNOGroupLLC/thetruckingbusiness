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
import type { FeeLine, Package, IntakeKind } from './packages';
import { SEED_PACKAGES, formatUSD as _formatUSD, getPackage as _getPackage } from './packages';

export type { FeeLine, Package, IntakeKind };
export { _formatUSD as formatUSD, _getPackage as getPackage };

export interface SiteCopy {
  heroHeadline: string;
  heroSub: string;
  trustNotes: string[];
  contactEmail: string;
  contactPhone: string;
}

export type IntakeStatus = 'submitted' | 'corrected' | 'certified' | 'filing';

export interface IntakeVersion {
  version: number;
  data: Record<string, string>;
  submittedAt: string; // ISO
  /** E-signature attestation when corrections were certified as final. */
  certifiedAt?: string; // ISO
  certifiedName?: string;
  certifiedDate?: string; // YYYY-MM-DD as typed
}

export interface OrderDocument {
  id: string;
  slotKey: string;
  slotLabel: string;
  fileName: string;
  uploadedAt: string; // ISO
  auto?: boolean;
  /** Demo storage: base64 data URL. Production: Supabase Storage path via API. */
  dataUrl?: string;
}

export interface OrderRecord {
  id: string;
  packageSlug: string;
  packageName: string;
  amount: number;
  /** Purchasable variant label, e.g. "Single state" for State Permit Filing. */
  optionLabel?: string;
  buyerName: string;
  buyerEmail: string;
  createdAt: string; // ISO
  intakeService: IntakeKind;
  /** Latest intake answers (kept for compatibility). */
  intake?: Record<string, string>;
  /** Intake lifecycle: submitted -> corrected -> certified -> filing. */
  intakeStatus?: IntakeStatus;
  /** Immutable version history: v1 submitted, v2 corrected+certified. */
  intakeVersions?: IntakeVersion[];
  /** 0 or 1 — customers get exactly one correction. */
  correctionsUsed?: number;
  filingStartedAt?: string; // ISO
  documents?: OrderDocument[];
}

interface State {
  packages: Package[];
  /** Admin edits, keyed by package slug — layered over the seed so catalog updates always flow through. */
  packageOverrides: Record<string, Partial<Package>>;
  copy: SiteCopy;
  orders: OrderRecord[];
  portalEmail: string | null;
}

const STORAGE_KEY = 'ttb-phase1-store-v2';


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
    packageOverrides: {},
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
          const overrides =
            parsed.packageOverrides && typeof parsed.packageOverrides === 'object'
              ? parsed.packageOverrides
              : {};
          state = {
            ...base,
            ...parsed,
            copy: { ...base.copy, ...(parsed.copy ?? {}) },
            // Catalog always comes from the seed + admin overrides — never from a
            // stale saved snapshot — so pricing/category updates apply on deploy.
            packageOverrides: overrides,
            packages: base.packages.map((p) => ({ ...p, ...(overrides[p.slug] ?? {}) })),
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
    packageOverrides: {
      ...state.packageOverrides,
      [slug]: { ...(state.packageOverrides[slug] ?? {}), ...patch },
    },
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
  /** Override for purchasable variants (e.g. State Permit single-state $89). */
  priceOverride?: number;
  optionLabel?: string;
  /** Preset id (e.g. the TTB id generated for a Stripe session) — generated when omitted. */
  id?: string;
}): OrderRecord {
  load();
  const pkg = state.packages.find((p) => p.slug === input.packageSlug);
  if (!pkg) throw new Error(`Unknown package: ${input.packageSlug}`);
  const order: OrderRecord = {
    id: input.id ?? `TTB-${Date.now().toString().slice(-6)}`,
    packageSlug: pkg.slug,
    packageName: pkg.name,
    amount: input.priceOverride ?? pkg.price,
    optionLabel: input.optionLabel,
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
  saveIntakeSubmission(orderId, data);
}

/** First intake submission -> v1, status 'submitted'. */
export function saveIntakeSubmission(orderId: string, data: Record<string, string>) {
  load();
  const now = new Date().toISOString();
  state = {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            intake: data,
            intakeStatus: 'submitted' as IntakeStatus,
            intakeVersions: [{ version: 1, data, submittedAt: now }],
            correctionsUsed: 0,
          }
        : o
    ),
  };
  persist();
  // Phase 2: also POST to /api/orders/[id]/intake (Supabase update + owner email)
}

/** The one allowed correction -> v2, status 'corrected'. */
export function saveIntakeCorrection(orderId: string, data: Record<string, string>) {
  load();
  const now = new Date().toISOString();
  state = {
    ...state,
    orders: state.orders.map((o) => {
      if (o.id !== orderId) return o;
      const versions = [...(o.intakeVersions ?? [])];
      // Preserve v1 if it was saved before versioning existed.
      if (versions.length === 0 && o.intake) {
        versions.push({ version: 1, data: o.intake, submittedAt: o.createdAt });
      }
      versions.push({ version: versions.length + 1, data, submittedAt: now });
      return {
        ...o,
        intake: data,
        intakeStatus: 'corrected' as IntakeStatus,
        intakeVersions: versions,
        correctionsUsed: 1,
      };
    }),
  };
  persist();
}

/** Customer certifies their corrections as final -> locked for them. */
export function certifyIntake(orderId: string, name: string, date: string) {
  load();
  const now = new Date().toISOString();
  state = {
    ...state,
    orders: state.orders.map((o) => {
      if (o.id !== orderId) return o;
      const versions = (o.intakeVersions ?? []).map((v, i, arr) =>
        i === arr.length - 1 ? { ...v, certifiedAt: now, certifiedName: name, certifiedDate: date } : v
      );
      return { ...o, intakeStatus: 'certified' as IntakeStatus, intakeVersions: versions };
    }),
  };
  persist();
}

/** Owner starts filing -> fully locked. */
export function startFiling(orderId: string) {
  load();
  const now = new Date().toISOString();
  state = {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId ? { ...o, intakeStatus: 'filing' as IntakeStatus, filingStartedAt: now } : o
    ),
  };
  persist();
}

export function addDocument(orderId: string, doc: OrderDocument) {
  load();
  state = {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId ? { ...o, documents: [...(o.documents ?? []), doc] } : o
    ),
  };
  persist();
}

export function removeDocument(orderId: string, docId: string) {
  load();
  state = {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId ? { ...o, documents: (o.documents ?? []).filter((d) => d.id !== docId) } : o
    ),
  };
  persist();
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

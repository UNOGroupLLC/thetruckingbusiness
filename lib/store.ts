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

export type OrderUploadStatus = 'in_review' | 'accepted' | 'needs_new_copy';

/** A document the client uploaded to us from their portal (order_documents
 *  rows with direction 'from_client'). Never carries a storage path or a
 *  signed URL: the office opens client files from the admin only. */
export interface OrderUpload {
  id: string;
  slotKey: string;
  slotLabel: string;
  fileName: string;
  status: OrderUploadStatus;
  staffNote?: string;
  createdAt: string; // ISO
}

export interface OrderRecord {
  id: string;
  packageSlug: string;
  packageName: string;
  amount: number;
  /** Purchasable variant label, e.g. "Single state" for State Permit Filing. */
  optionLabel?: string;
  /** True when the order came from a real Stripe payment (not the simulated flow). */
  isRealPayment?: boolean;
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
  /** Documents this customer uploaded to us from their portal. */
  uploads?: OrderUpload[];
  /** Client-document progress for the admin queue (database orders only):
   *  how many of the package's requested documents the team has accepted. */
  clientDocs?: { total: number; accepted: number };
  /**
   * 'database' marks orders that came from the Supabase feed (real Stripe
   * payments) rather than this browser's localStorage. 'local' is the
   * default for demo/simulated orders.
   */
  source?: 'local' | 'database';
  /** Call booking for database orders (local orders use getCallBooking). */
  booking?: { date: string; time: string };
  /** Uploaded-document count for database orders. */
  documentCount?: number;
  /** Payment lifecycle from Stripe (webhook): paid by default. */
  payStatus?: 'paid' | 'refunded' | 'cancelled';
  /** Refunded amount in cents when payStatus is 'refunded'. */
  refundedCents?: number;
  /** Admin workflow: starred as priority in the orders queue. */
  priority?: boolean;
  /** Admin workflow: who holds this order ('owner' in the solo admin). */
  assignee?: string;
  /** Set when the team marks the order complete (migration-010). A
   *  completed order leaves the Orders queue and lives in Finished. */
  completedAt?: string; // ISO
  /** Company name from the latest intake, when the feed provides it
   *  (admin list/search + the Finished company column). */
  companyName?: string;
  /** USDOT number from the latest intake, when the feed provides it. */
  usdot?: string;
  /** Stripe payment id, when the record carries one (export reference). */
  stripePaymentId?: string;
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
  /** True when mirroring a real Stripe payment (receipt page). */
  isRealPayment?: boolean;
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
    isRealPayment: input.isRealPayment,
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

/* --------------------- portal server sync (Phase 2) --------------------- */

const PORTAL_TOKEN_KEY = 'ttb-portal-token';

/** Session token issued after OTP login; authorizes /api/portal/* reads. */
export function setPortalToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(PORTAL_TOKEN_KEY, token);
    else localStorage.removeItem(PORTAL_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getPortalToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(PORTAL_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

/** A server-side order, as returned by GET /api/portal/orders. */
export interface ServerOrder {
  id: string;
  packageSlug: string;
  packageName: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
  intakeService: IntakeKind;
  intakeStatus?: IntakeStatus;
  intake?: Record<string, string>;
  filingStartedAt?: string;
  booking?: { date: string; time: string };
  documents?: OrderDocument[];
  uploads?: OrderUpload[];
  payStatus?: 'paid' | 'refunded' | 'cancelled';
  refundedCents?: number;
  priority?: boolean;
  assignee?: string;
  completedAt?: string;
}

/**
 * Merge orders fetched from the server into the local store. The server is
 * the source of truth for payment state, intake answers (including edits
 * the team made for the customer), and uploaded documents (signed URLs) —
 * so what the office uploads or corrects shows up in the customer's portal.
 */
export function mergeServerOrders(serverOrders: ServerOrder[]) {
  if (!serverOrders.length) return;
  load();
  const byId = new Map(state.orders.map((o) => [o.id, o]));
  for (const so of serverOrders) {
    const local = byId.get(so.id);
    if (!local) {
      byId.set(so.id, {
        id: so.id,
        packageSlug: so.packageSlug,
        packageName: so.packageName,
        amount: so.amount,
        isRealPayment: true,
        buyerName: so.buyerName,
        buyerEmail: so.buyerEmail,
        createdAt: so.createdAt,
        intakeService: so.intakeService,
        intake: so.intake,
        intakeStatus: so.intakeStatus,
        filingStartedAt: so.filingStartedAt,
        documents: so.documents,
        uploads: so.uploads,
        documentCount: so.documents?.length ?? 0,
        booking: so.booking,
        payStatus: so.payStatus,
        refundedCents: so.refundedCents,
        priority: so.priority,
        assignee: so.assignee,
        completedAt: so.completedAt,
        source: 'database',
      });
      continue;
    }
    const docsBySlot = new Map((local.documents ?? []).map((d) => [d.slotKey, d]));
    for (const d of so.documents ?? []) docsBySlot.set(d.slotKey, d);
    const documents = [...docsBySlot.values()];
    byId.set(so.id, {
      ...local,
      intakeStatus: so.intakeStatus ?? local.intakeStatus,
      intake: so.intake ?? local.intake,
      filingStartedAt: so.filingStartedAt ?? local.filingStartedAt,
      documents,
      uploads: so.uploads ?? local.uploads,
      documentCount: documents.length,
      booking: so.booking ?? local.booking,
      payStatus: so.payStatus ?? local.payStatus,
      refundedCents: so.refundedCents ?? local.refundedCents,
      priority: so.priority ?? local.priority,
      assignee: so.assignee ?? local.assignee,
      completedAt: so.completedAt ?? local.completedAt,
      source: 'database',
      isRealPayment: true,
    });
  }
  state = { ...state, orders: [...byId.values()] };
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

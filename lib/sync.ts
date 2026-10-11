'use client';

/**
 * Phase 2 sync — fire-and-forget POSTs to the API routes.
 * Every call is best-effort: the app already saved locally, so a backend
 * failure must never break the customer flow. When the Supabase/Resend env
 * vars aren't set, the API routes simply report persisted:false/emailed:false.
 */

function post(path: string, body: unknown): void {
  try {
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never break the UI */
  }
}

export interface SyncOrder {
  id: string;
  packageSlug: string;
  buyerName: string;
  buyerEmail: string;
}

export function syncOrder(o: SyncOrder): void {
  post('/api/orders', o);
}

export interface SyncOrderInfo {
  id: string;
  packageName: string;
  amount: string;
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
  buyerPhone?: string;
}

export interface SyncIntakeMeta {
  status?: 'submitted' | 'corrected' | 'certified';
  version?: number;
  certified?: { name: string; date: string };
}

export function syncIntake(
  orderId: string,
  order: SyncOrderInfo,
  data: Record<string, string>,
  labels: Record<string, string>,
  meta?: SyncIntakeMeta
): void {
  // Make checkbox answers human-readable in the owner email.
  const pretty: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    pretty[k] = v === 'yes' ? 'Yes — agreed/signed' : v;
  }
  post(`/api/orders/${encodeURIComponent(orderId)}/intake`, { order, data: pretty, labels, ...meta });
}

export function syncBooking(orderId: string, order: SyncOrderInfo, date: string, time: string): void {
  post(`/api/orders/${encodeURIComponent(orderId)}/call-booking`, { order, date, time });
}

export function syncFiling(orderId: string): void {
  post(`/api/orders/${encodeURIComponent(orderId)}/filing`, {});
}

/** Owner document upload: multipart POST (server persists + emails the customer). */
export function syncDocument(
  orderId: string,
  order: SyncOrderInfo,
  slotKey: string,
  slotLabel: string,
  file: File
): void {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('slotKey', slotKey);
    form.append('slotLabel', slotLabel);
    form.append('orderInfo', JSON.stringify(order));
    fetch(`/api/orders/${encodeURIComponent(orderId)}/documents`, {
      method: 'POST',
      body: form,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never break the UI */
  }
}

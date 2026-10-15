'use client';

/**
 * Phase 2 sync — fire-and-forget POSTs to the API routes.
 * Every call is best-effort: the app already saved locally, so a backend
 * failure must never break the customer flow. When the Supabase/Resend env
 * vars aren't set, the API routes simply report persisted:false/emailed:false.
 */

/** The owner admin key, when this browser has unlocked the admin panel. */
export function storedAdminKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem('ttb-admin-key') ?? '';
  } catch {
    return '';
  }
}

export function adminKeyHeaders(): Record<string, string> {
  const k = storedAdminKey();
  return k ? { 'x-admin-key': k } : {};
}

function post(path: string, body: unknown): void {
  try {
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminKeyHeaders() },
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

export interface SyncDocumentResult {
  ok: boolean;
  persisted?: boolean;
  emailed?: boolean;
  error?: string;
}

/**
 * Owner document upload: multipart POST (server persists + emails the
 * customer). Unlike the other sync helpers this one reports back: the
 * promise resolves with the route's result so the admin panel can confirm
 * the save (or show the failure) instead of guessing.
 */
export async function syncDocument(
  orderId: string,
  order: SyncOrderInfo,
  slotKey: string,
  slotLabel: string,
  file: File
): Promise<SyncDocumentResult> {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('slotKey', slotKey);
    form.append('slotLabel', slotLabel);
    form.append('orderInfo', JSON.stringify(order));
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/documents`, {
      method: 'POST',
      headers: { ...adminKeyHeaders() },
      body: form,
      keepalive: true,
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; persisted?: boolean; emailed?: boolean; error?: string }
      | null;
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error ?? 'We could not save that document. Please try again.',
      };
    }
    return { ok: true, persisted: data.persisted, emailed: data.emailed };
  } catch {
    return { ok: false, error: 'We could not save that document. Please try again.' };
  }
}

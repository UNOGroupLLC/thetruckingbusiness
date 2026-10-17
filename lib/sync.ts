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

export interface SyncBookingResult {
  ok: boolean;
  error?: string;
}

/**
 * Kickoff-call booking: unlike the other sync helpers this one reports
 * back, because the server enforces one client per hour and can refuse
 * a slot that was just taken (409). The scheduler must not show a
 * success card for a booking that was never saved.
 */
export async function syncBooking(
  orderId: string,
  order: SyncOrderInfo,
  date: string,
  time: string
): Promise<SyncBookingResult> {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/call-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminKeyHeaders() },
      body: JSON.stringify({ order, date, time }),
      keepalive: true,
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error ?? 'We could not reach the server. Please try again.',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'We could not reach the server. Please try again.' };
  }
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
 * Owner document upload (Oct 17, 2026, F9): three steps. A signed upload
 * URL from our server, the file straight from the browser to Storage,
 * then a register call that records it (server persists the row and
 * emails the customer). The file never passes through our own server,
 * so neither the host's 4.5 MB function body cap nor the old 64 KB
 * keepalive cap (F7) can refuse it. Unlike the other sync helpers this
 * one reports back: the promise resolves with the register result so
 * the admin panel can confirm the save (or show the failure) instead
 * of guessing.
 */
export async function syncDocument(
  orderId: string,
  order: SyncOrderInfo,
  slotKey: string,
  slotLabel: string,
  file: File
): Promise<SyncDocumentResult> {
  try {
    if (file.size > 50 * 1024 * 1024) {
      return { ok: false, error: 'That file is too large. The limit is 50 MB per file.' };
    }
    // Step 1: ask our server for a signed upload URL for this file.
    const signRes = await fetch(
      `/api/orders/${encodeURIComponent(orderId)}/documents/sign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminKeyHeaders() },
        body: JSON.stringify({ slotKey, fileName: file.name, size: file.size }),
      }
    );
    const signData = (await signRes.json().catch(() => null)) as {
      ok?: boolean;
      path?: string;
      uploadUrl?: string;
      error?: string;
    } | null;
    if (!signRes.ok || !signData?.ok || !signData.path || !signData.uploadUrl) {
      return {
        ok: false,
        error: signData?.error ?? 'We could not save that document. Please try again.',
      };
    }
    // Step 2: send the file straight to Storage. The signed URL is the
    // authorization, so no admin key goes along, and never keepalive:
    // browsers cap keepalive bodies at about 64 KB (finding F7).
    const put = await fetch(signData.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: file,
    });
    if (!put.ok) {
      return { ok: false, error: 'We could not upload that document. Please try again.' };
    }
    // Step 3: register the stored file so the server records it and
    // emails the customer.
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminKeyHeaders() },
      body: JSON.stringify({
        slotKey,
        slotLabel,
        storagePath: signData.path,
        fileName: file.name,
        orderInfo: order,
      }),
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

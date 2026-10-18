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

/** Steps a document upload passes through, reported to the caller so
 *  the admin panel can show where an upload is (and where it stopped). */
export type SyncStep = 'server' | 'start' | 'send' | 'record';

/**
 * fetch with a hard ceiling. An upload step must never wait forever:
 * when the ceiling hits, the request aborts and the caller's catch
 * names the step that timed out.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
/** Files up to this size travel through our own server (the proven
 *  road); larger files go straight to Storage (the direct road). The
 *  boundary sits safely under the host's 4.5 MB function body cap. */
const SERVER_ROAD_MAX = 4 * 1024 * 1024;

type RegisterResult = {
  ok?: boolean;
  persisted?: boolean;
  emailed?: boolean;
  error?: string;
} | null;

/**
 * Owner document upload (Oct 17, 2026, F9, repaired the same night).
 * Two roads, chosen by size:
 * - Everyday files (4 MB and under) take the proven road: one
 *   multipart POST to our own server, the path staff uploads used
 *   successfully with real files before the direct rebuild.
 * - Large files take the direct road: a signed upload URL from our
 *   server, the file straight from the browser to Storage, then a
 *   register call that records it. The file never passes through our
 *   server, so the host's 4.5 MB function body cap cannot refuse it.
 * Every step is timed and named (see onStep), and every failure
 * message names its step, after the first live direct upload stalled
 * for minutes inside a generic "Uploading..." and the step could not
 * be told apart. Unlike the other sync helpers this one reports back:
 * the promise resolves with the save result so the admin panel can
 * confirm the save (or show the failure) instead of guessing.
 */
export async function syncDocument(
  orderId: string,
  order: SyncOrderInfo,
  slotKey: string,
  slotLabel: string,
  file: File,
  onStep?: (step: SyncStep) => void
): Promise<SyncDocumentResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'That file is too large. The limit is 50 MB per file.' };
  }

  if (file.size <= SERVER_ROAD_MAX) {
    onStep?.('server');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('slotKey', slotKey);
      form.append('slotLabel', slotLabel);
      form.append('orderInfo', JSON.stringify(order));
      // No keepalive here, ever: browsers cap keepalive bodies at
      // about 64 KB, so any real document was refused before it left
      // the browser (finding F7).
      const res = await fetchWithTimeout(
        `/api/orders/${encodeURIComponent(orderId)}/documents/server`,
        { method: 'POST', headers: { ...adminKeyHeaders() }, body: form },
        60_000
      );
      const data = (await res.json().catch(() => null)) as RegisterResult;
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

  // Step 1: ask our server for a signed upload URL for this file.
  onStep?.('start');
  let signData: { ok?: boolean; path?: string; uploadUrl?: string; error?: string } | null;
  try {
    const signRes = await fetchWithTimeout(
      `/api/orders/${encodeURIComponent(orderId)}/documents/sign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminKeyHeaders() },
        body: JSON.stringify({ slotKey, fileName: file.name, size: file.size }),
      },
      20_000
    );
    signData = (await signRes.json().catch(() => null)) as typeof signData;
    if (!signRes.ok || !signData?.ok || !signData.path || !signData.uploadUrl) {
      return {
        ok: false,
        error: signData?.error ?? 'We could not start the upload. Please try again.',
      };
    }
  } catch {
    return { ok: false, error: 'We could not start the upload. Please try again.' };
  }

  // Step 2: send the file straight to Storage. The signed URL is the
  // authorization, so no admin key goes along, and never keepalive
  // (finding F7). The 240 second ceiling turns an endless stall into
  // a named timeout; 50 MB fits inside it on any connection faster
  // than about 1.7 Mbps.
  onStep?.('send');
  let put: Response;
  try {
    put = await fetchWithTimeout(
      signData.uploadUrl,
      {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'false',
        },
        body: file,
      },
      240_000
    );
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === 'AbortError';
    return {
      ok: false,
      error: timedOut
        ? 'The upload timed out. Please check your connection and try again.'
        : 'We could not upload that document. Please check your connection and try again.',
    };
  }
  if (!put.ok) {
    return { ok: false, error: 'We could not upload that document. Please try again.' };
  }

  // Step 3: register the stored file so the server records it and
  // emails the customer.
  onStep?.('record');
  try {
    const res = await fetchWithTimeout(
      `/api/orders/${encodeURIComponent(orderId)}/documents`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminKeyHeaders() },
        body: JSON.stringify({
          slotKey,
          slotLabel,
          storagePath: signData.path,
          fileName: file.name,
          orderInfo: order,
        }),
      },
      30_000
    );
    const data = (await res.json().catch(() => null)) as RegisterResult;
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

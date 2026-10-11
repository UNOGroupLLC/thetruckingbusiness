/**
 * Server-only backend helpers — Phase 2 plumbing.
 *
 * Everything here degrades gracefully: if the Supabase / Resend env vars are
 * not set (demo mode), the API routes fall back to localStorage-only behavior
 * and skip owner emails. No new npm dependencies — Supabase REST and the
 * Resend HTTP API are called with fetch().
 *
 * Required env vars (see .env.example):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  -> database
 *   RESEND_API_KEY, OWNER_EMAIL, EMAIL_FROM   -> owner notifications
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const RESEND_KEY = process.env.RESEND_API_KEY ?? '';
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'orders@thetruckingbusiness.com';

export function backendConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export function emailConfigured(): boolean {
  return Boolean(RESEND_KEY && OWNER_EMAIL);
}

export function ownerEmail(): string {
  return OWNER_EMAIL;
}

interface DbResult {
  ok: boolean;
  status: number;
  error?: string;
}

async function supa(path: string, init?: RequestInit): Promise<DbResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: text.slice(0, 300) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'fetch failed' };
  }
}

/** Insert one row. Returns ok=false when the backend isn't configured. */
export async function dbInsert(table: string, row: Record<string, unknown>): Promise<DbResult> {
  if (!backendConfigured()) return { ok: false, status: 0, error: 'backend not configured' };
  return supa(table, { method: 'POST', body: JSON.stringify(row) });
}

/** Upsert one row on a conflict column (used for id-keyed orders). */
export async function dbUpsert(
  table: string,
  row: Record<string, unknown>,
  onConflict: string
): Promise<DbResult> {
  if (!backendConfigured()) return { ok: false, status: 0, error: 'backend not configured' };
  return supa(`${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    body: JSON.stringify(row),
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
  });
}

/** Send an email via Resend. No-op when email isn't configured. */
async function sendEmail(to: string, subject: string, html: string): Promise<DbResult> {
  if (!emailConfigured()) return { ok: false, status: 0, error: 'email not configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: text.slice(0, 300) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'fetch failed' };
  }
}

/** Notify the owner. */
export async function sendOwnerEmail(subject: string, html: string): Promise<DbResult> {
  return sendEmail(OWNER_EMAIL, subject, html);
}

/** Notify the customer. */
export async function sendClientEmail(
  to: string,
  subject: string,
  html: string
): Promise<DbResult> {
  if (!to || !to.includes('@')) return { ok: false, status: 0, error: 'bad recipient' };
  return sendEmail(to.trim(), subject, html);
}

/**
 * Upload bytes to the private Supabase Storage bucket.
 * Returns the storage path on success. Service-role key bypasses RLS.
 */
export async function storageUpload(
  bucket: string,
  path: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<DbResult> {
  if (!backendConfigured()) return { ok: false, status: 0, error: 'backend not configured' };
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': contentType,
      },
      body: bytes,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: text.slice(0, 300) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'fetch failed' };
  }
}

/** Notify the customer. */
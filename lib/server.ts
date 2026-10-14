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
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
const RESEND_KEY = process.env.RESEND_API_KEY ?? '';
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'orders@thetruckingbusiness.com';

export function backendConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/** Supabase Auth (OTP codes) is usable when the anon key is set. */
export function authConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
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


/**
 * Headers for Supabase REST / Storage / Auth calls.
 * New sb_* keys are opaque (not JWTs) and must travel on the `apikey`
 * header only — sending one as `Authorization: Bearer` is rejected (401).
 * Legacy eyJ... JWT keys carry the role inside the token, so they keep
 * both headers for backward compatibility.
 */
export function supabaseRestHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key };
  if (key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

async function supa(path: string, init?: RequestInit): Promise<DbResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        ...supabaseRestHeaders(SUPABASE_KEY),
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

/**
 * Supabase Auth (GoTrue) call with the anon key — used for OTP login codes.
 * The anon key is public by design; RLS still protects the data.
 */
async function supaAuth(path: string, body: unknown): Promise<DbResult> {
  if (!authConfigured()) return { ok: false, status: 0, error: 'auth not configured' };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

/** Send a 6-digit login code to the email via Supabase Auth. */
export async function sendOtpCode(email: string): Promise<DbResult> {
  return supaAuth('otp', { email });
}

/** Verify a 6-digit login code via Supabase Auth. */
export async function verifyOtpCode(email: string, token: string): Promise<DbResult> {
  return supaAuth('verify', { email, token, type: 'email' });
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

/** Select rows via Supabase REST. Returns rows on success (empty when unconfigured). */
export async function dbSelect<T = Record<string, unknown>>(
  path: string
): Promise<{ ok: boolean; status: number; error?: string; rows: T[] }> {
  if (!backendConfigured()) return { ok: false, status: 0, error: 'backend not configured', rows: [] };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { ...supabaseRestHeaders(SUPABASE_KEY), 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: text.slice(0, 300), rows: [] };
    }
    const rows = (await res.json()) as T[];
    return { ok: true, status: res.status, rows };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'fetch failed', rows: [] };
  }
}

/** Send an email via Resend. No-op when email isn't configured. */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  replyTo?: string
): Promise<DbResult> {
  if (!emailConfigured()) return { ok: false, status: 0, error: 'email not configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
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

/** Notify the owner. Pass `replyTo` to let the owner answer the sender in one click. */
export async function sendOwnerEmail(
  subject: string,
  html: string,
  replyTo?: string
): Promise<DbResult> {
  return sendEmail(OWNER_EMAIL, subject, html, replyTo);
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
        ...supabaseRestHeaders(SUPABASE_KEY),
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
/**
 * Append one row to the order activity trail (order_events).
 * Best-effort by design: a missing table (migration-007 not run yet) or a
 * transient failure must never break the action that caused the event.
 */
export async function logOrderEvent(
  orderId: string,
  actor: string,
  action: string,
  detail?: string
): Promise<void> {
  if (!backendConfigured()) return;
  try {
    await dbInsert('order_events', {
      order_id: orderId,
      actor,
      action,
      ...(detail ? { detail } : {}),
    });
  } catch {
    /* activity trail is best-effort */
  }
}

/**
 * Portal session token — issued by /api/auth/verify-code after a successful
 * OTP login and presented by the portal as `x-portal-token`. It binds the
 * verified email into an HMAC-signed, expiring token so portal API routes
 * can serve that customer's own orders/documents without trusting a bare
 * email parameter. Signed with the service-role key (server-only secret).
 */
import { createHmac, timingSafeEqual } from 'crypto';

const PORTAL_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function signPortalToken(email: string): string {
  const payload = `${email.toLowerCase()}|${Date.now() + PORTAL_TOKEN_TTL_MS}`;
  const sig = createHmac('sha256', SUPABASE_KEY).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

/** Returns the token's email when valid and unexpired, otherwise null. */
export function verifyPortalToken(token: string | null | undefined): string | null {
  if (!token || !SUPABASE_KEY) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(body, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = createHmac('sha256', SUPABASE_KEY).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [email, expRaw] = payload.split('|');
  const exp = Number(expRaw);
  if (!email || !exp || Date.now() > exp) return null;
  return email;
}

/**
 * Create a short-lived signed download URL for a private Storage object.
 * Returns the absolute URL, or null when storage isn't configured/fails.
 */
export async function storageSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!backendConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path}`, {
      method: 'POST',
      headers: { ...supabaseRestHeaders(SUPABASE_KEY), 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { signedURL?: string };
    if (!data.signedURL) return null;
    return `${SUPABASE_URL}/storage/v1${data.signedURL}`;
  } catch {
    return null;
  }
}

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

/* Every email the site sends shows the sender name "The Trucking Business"
 * in the inbox, never the bare address (owner ruling, Oct 16, 2026: the
 * inbox was showing "hello", "orders", "inquiry"). A From value that
 * already carries a display name is left untouched. */
const FROM_DISPLAY_NAME = 'The Trucking Business';
function withFromName(from: string): string {
  const v = from.trim();
  return v.includes('<') ? v : `${FROM_DISPLAY_NAME} <${v}>`;
}

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

/** An email attachment for Resend: file name + base64-encoded content. */
export interface EmailAttachment {
  filename: string;
  content: string;
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

/**
 * Update rows matching one column value (PATCH). Use this instead of
 * dbUpsert when only some columns change: an upsert first builds a full
 * insertion row, so it fails on tables whose other columns are NOT NULL
 * without defaults (order_documents is one) even when the row exists.
 */
export async function dbUpdate(
  table: string,
  matchColumn: string,
  matchValue: string,
  patch: Record<string, unknown>
): Promise<DbResult> {
  if (!backendConfigured()) return { ok: false, status: 0, error: 'backend not configured' };
  return supa(`${table}?${matchColumn}=eq.${encodeURIComponent(matchValue)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** Delete rows matching one column value. Returns ok=false when unconfigured. */
export async function dbDelete(
  table: string,
  matchColumn: string,
  matchValue: string
): Promise<DbResult> {
  if (!backendConfigured()) return { ok: false, status: 0, error: 'backend not configured' };
  return supa(`${table}?${matchColumn}=eq.${encodeURIComponent(matchValue)}`, {
    method: 'DELETE',
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
  replyTo?: string,
  attachments?: EmailAttachment[],
  from?: string
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
        from: withFromName(from ?? EMAIL_FROM),
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments && attachments.length ? { attachments } : {}),
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

/** Notify the owner. Pass `replyTo` to let the owner answer the sender in one click.
 *  Pass `from` only where the owner has ruled a different sender for that
 *  kind of notification (contact form notifications use inquiry@). */
export async function sendOwnerEmail(
  subject: string,
  html: string,
  replyTo?: string,
  attachments?: EmailAttachment[],
  from?: string
): Promise<DbResult> {
  return sendEmail(OWNER_EMAIL, subject, html, replyTo, attachments, from);
}

/** Notify the customer. Pass `from` only where the owner has ruled a
 *  different sender for that kind of email (calculator results use hello@). */
export async function sendClientEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
  from?: string
): Promise<DbResult> {
  if (!to || !to.includes('@')) return { ok: false, status: 0, error: 'bad recipient' };
  return sendEmail(to.trim(), subject, html, undefined, attachments, from);
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
        // Upsert so a rebuilt object (the stored case file and its
        // manifest) replaces the previous copy at the same path.
        // Callers with one-shot unique paths are unaffected.
        'x-upsert': 'true',
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
 * Create a short-lived signed URL for a private Storage object.
 * Returns the absolute URL, or null when storage isn't configured/fails.
 * Pass downloadName to make Storage serve the file as an attachment with
 * that file name (a real download). Without it the file opens inline,
 * which is what a View link wants. The HTML download attribute alone
 * cannot do this: browsers ignore it for cross-origin URLs.
 */
export async function storageSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600,
  downloadName?: string
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
    const url = `${SUPABASE_URL}/storage/v1${data.signedURL}`;
    if (!downloadName) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}download=${encodeURIComponent(downloadName)}`;
  } catch {
    return null;
  }
}

/**
 * Create a signed UPLOAD URL for one Storage object (Oct 17, 2026, F9).
 * The browser sends the file straight to Storage with this URL, so the
 * bytes never pass through our Vercel function. That removes the host's
 * 4.5 MB function body cap, which silently limited every upload even
 * where our own code allowed more. Returns the absolute URL, or null
 * when storage isn't configured or the signing fails.
 */
export async function storageSignedUploadUrl(
  bucket: string,
  path: string
): Promise<string | null> {
  if (!backendConfigured()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/upload/sign/${bucket}/${path}`,
      {
        method: 'POST',
        headers: { ...supabaseRestHeaders(SUPABASE_KEY), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string; signedURL?: string; signedUrl?: string };
    const rel = data.url ?? data.signedURL ?? data.signedUrl;
    if (!rel) return null;
    return rel.startsWith('http') ? rel : `${SUPABASE_URL}/storage/v1${rel}`;
  } catch {
    return null;
  }
}

/**
 * Read one Storage object's real size in bytes without downloading it:
 * a one-byte Range request whose Content-Range (or Content-Length)
 * header carries the total. Returns null when the object is missing or
 * the check fails. The register step of a direct upload uses this to
 * prove the file actually arrived and to enforce the size cap against
 * the stored object rather than the client's claim.
 */
export async function storageObjectSize(bucket: string, path: string): Promise<number | null> {
  if (!backendConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${bucket}/${path}`, {
      method: 'GET',
      headers: { ...supabaseRestHeaders(SUPABASE_KEY), Range: 'bytes=0-0' },
    });
    if (!res.ok) return null;
    const range = res.headers.get('content-range');
    const total = range ? Number(range.split('/').pop()) : NaN;
    const length = Number(res.headers.get('content-length') ?? '');
    await res.body?.cancel().catch(() => undefined);
    if (Number.isFinite(total)) return total;
    if (Number.isFinite(length) && length > 1) return length;
    // A one-byte object legitimately reports length 1 with no range.
    if (res.status === 206 || res.status === 200) return length === 1 ? 1 : null;
    return null;
  } catch {
    return null;
  }
}

/**
 * Best-effort removal of one Storage object. Used to clean up the file
 * when its database row could not be recorded, so a failed upload never
 * leaves an orphaned file behind. Never throws.
 */
export async function storageRemove(bucket: string, path: string): Promise<void> {
  if (!backendConfigured()) return;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: { ...supabaseRestHeaders(SUPABASE_KEY), 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [path] }),
    });
  } catch {
    /* best effort only */
  }
}

/**
 * The one master copy of the Audit Assistance Kit file. The kit is a
 * digital product: the portal's automatic kit slot serves this single
 * stored file to every buyer whose package includes it (the Complete
 * Package, the standalone kit, and Audit Assistance Plus). Staff set or
 * replace it by uploading the finished kit file into the kit slot on
 * any order; the document routes copy that upload here. Oct 18, 2026.
 */
export const AUDIT_KIT_MASTER_PATH = 'products/audit-kit/audit-assistance-kit.zip';

/**
 * Copy one Storage object to another path in the same bucket, replacing
 * any object already there. Best effort: returns whether the copy is in
 * place. Used to refresh the master kit file from a staff upload.
 */
export async function storageCopy(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<boolean> {
  if (!backendConfigured()) return false;
  try {
    await storageRemove(bucket, toPath);
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/copy`, {
      method: 'POST',
      headers: { ...supabaseRestHeaders(SUPABASE_KEY), 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId: bucket, sourceKey: fromPath, destinationKey: toPath }),
    });
    if (!res.ok) return false;
    return (await storageObjectSize(bucket, toPath)) !== null;
  } catch {
    return false;
  }
}

import { NextRequest, NextResponse, connection } from 'next/server';
import JSZip from 'jszip';
import {
  backendConfigured,
  dbSelect,
  logOrderEvent,
  storageSignedUrl,
  storageUpload,
} from '@/lib/server';
import { formatUSD } from '@/lib/packages';
import { intakeFieldMeta } from '@/lib/intake-fields';

/**
 * The order's sealed case file, stored in Supabase Storage (Oct 17, 2026).
 *
 * The case file is built ONCE and stored, not rebuilt on every download:
 *   <orderId>/case-file/<orderId>-case-file.zip   (or .html fallback)
 *   <orderId>/case-file/manifest.json             (build record)
 * Downloads hand out a short-lived signed URL to that stored file, so
 * every download is the identical file and the bytes never pass through
 * this function. That removes the host's response-size cap that limited
 * the old build-on-download route, and it matches the record-keeping
 * model: a finished order's case file is a sealed artifact, built at
 * completion, rebuilt only when staff ask (a document added later marks
 * it stale here, never silently different).
 *
 * The ZIP holds:
 *  - case-file.html: a self-contained summary (order, payment, intake
 *    answers, activity trail) that opens in any browser.
 *  - every order_documents file for the order (both directions), under
 *    client/ (uploaded by the client) or office/ (our deliverables).
 * A document that cannot be fetched is named in the summary and in the
 * manifest, never silently dropped. If ZIP building itself fails, the
 * summary is stored on its own as the case file.
 *
 * GET  -> status: { state: 'ready' | 'stale' | 'missing', builtAt,
 *         docCount, format, url } (url only when ready). ADMIN_KEY lock.
 * POST -> build or rebuild now, store, then answer with the same status.
 */

const BUCKET = 'order-documents';

function unauthorized(req: NextRequest): NextResponse | null {
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey && (req.headers.get('x-admin-key') ?? '').trim() !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  return null;
}

interface OrderRow {
  id: string;
  package_slug: string;
  package_name: string;
  amount_cents: number | null;
  buyer_name: string;
  buyer_email: string;
  intake_service: string;
  filing_status: string | null;
  filing_started_at: string | null;
  pay_status: string | null;
  refunded_cents: number | null;
  completed_at?: string | null;
  stripe_payment_id?: string | null;
  created_at: string;
}

interface DocRow {
  id: string;
  slot_key: string;
  slot_label: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
  direction?: string | null;
}

interface CaseManifest {
  builtAt: string;
  format: 'zip' | 'html';
  docIds: string[];
  missing: string[];
}

function zipPath(id: string): string {
  return `${id}/case-file/${id}-case-file.zip`;
}
function htmlPath(id: string): string {
  return `${id}/case-file/${id}-case-file.html`;
}
function manifestPath(id: string): string {
  return `${id}/case-file/manifest.json`;
}
function storedPath(id: string, format: 'zip' | 'html'): string {
  return format === 'zip' ? zipPath(id) : htmlPath(id);
}
function downloadName(id: string, format: 'zip' | 'html'): string {
  return `${id}-case-file.${format}`;
}

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dateLabel(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Storage paths are server-made, but a file name goes into the ZIP:
 *  strip anything that could climb out of its folder. */
function safeName(name: string): string {
  const base = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return base || 'document';
}

async function loadDocRows(id: string): Promise<DocRow[]> {
  const enc = encodeURIComponent(id);
  const docsRes = await dbSelect<DocRow>(
    `order_documents?select=id,slot_key,slot_label,file_name,storage_path,uploaded_at,direction&order_id=eq.${enc}&order=uploaded_at.asc`
  );
  if (docsRes.ok) return docsRes.rows;
  // If the migration-008 direction column is missing the documents query
  // failed; retry without it rather than ship a case file with no files.
  const fallback = await dbSelect<DocRow>(
    `order_documents?select=id,slot_key,slot_label,file_name,storage_path,uploaded_at&order_id=eq.${enc}&order=uploaded_at.asc`
  );
  return fallback.rows;
}

async function readManifest(id: string): Promise<CaseManifest | null> {
  try {
    const url = await storageSignedUrl(BUCKET, manifestPath(id), 60);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as CaseManifest;
    if (!data || typeof data.builtAt !== 'string' || !Array.isArray(data.docIds)) return null;
    return data;
  } catch {
    return null;
  }
}

function sameDocSet(a: string[], rows: DocRow[]): boolean {
  if (a.length !== rows.length) return false;
  const sorted = [...a].sort();
  const ids = rows.map((r) => r.id).sort();
  return sorted.every((v, i) => v === ids[i]);
}

/** The status answer shared by GET and POST. A stored file counts as
 *  ready only while the manifest's document set still matches the
 *  order's live documents; any difference reports 'stale' so the admin
 *  offers a rebuild instead of a quietly outdated download. */
async function statusFor(id: string) {
  const manifest = await readManifest(id);
  if (!manifest) {
    return { ok: true as const, state: 'missing' as const, docCount: 0 };
  }
  const rows = await loadDocRows(id);
  const base = {
    ok: true as const,
    builtAt: manifest.builtAt,
    format: manifest.format,
    docCount: manifest.docIds.length,
    missing: manifest.missing,
  };
  if (!sameDocSet(manifest.docIds, rows)) {
    return { ...base, state: 'stale' as const };
  }
  const url = await storageSignedUrl(
    BUCKET,
    storedPath(id, manifest.format),
    600,
    downloadName(id, manifest.format)
  );
  if (!url) return { ...base, state: 'missing' as const, docCount: 0 };
  return { ...base, state: 'ready' as const, url };
}

/** Assemble the summary and fetch the document bytes. Unchanged record
 *  content from the original build-on-download route. */
async function assemble(id: string) {
  const enc = encodeURIComponent(id);
  const [orderRes, intakeRes, docRows, eventsRes] = await Promise.all([
    dbSelect<OrderRow>(`orders?select=*&id=eq.${enc}&limit=1`),
    dbSelect<{ data: Record<string, string>; status: string | null; version: number | null; created_at: string }>(
      `intake_submissions?select=data,status,version,created_at&order_id=eq.${enc}&order=version.desc&limit=1`
    ),
    loadDocRows(id),
    dbSelect<{ actor: string; action: string; detail: string | null; created_at: string }>(
      `order_events?select=actor,action,detail,created_at&order_id=eq.${enc}&order=created_at.asc&limit=200`
    ),
  ]);
  const o = orderRes.rows[0];
  if (!o) return null;
  const intake = intakeRes.rows[0];

  // Fetch the document bytes first, so the summary can name any file
  // that could not be included. Entries are named slot-file so two
  // uploads that share a file name never overwrite each other in the ZIP.
  const files: { folder: string; name: string; bytes: ArrayBuffer }[] = [];
  const missing: string[] = [];
  for (const d of docRows) {
    const folder = d.direction === 'from_client' ? 'client' : 'office';
    try {
      const url = await storageSignedUrl(BUCKET, d.storage_path, 600);
      if (!url) throw new Error('no signed url');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`storage ${res.status}`);
      files.push({
        folder,
        name: `${safeName(d.slot_key)}-${safeName(d.file_name)}`,
        bytes: await res.arrayBuffer(),
      });
    } catch {
      missing.push(`${d.file_name} (${folder})`);
    }
  }

  const intakeRows = intake?.data
    ? Object.entries(intake.data)
        .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
        .map(
          ([k, v]) =>
            `<tr><td style="padding:7px 10px;border:1px solid #dde3ec;color:#5b6a82;">${esc(intakeFieldMeta(o.intake_service, k).label)}</td><td style="padding:7px 10px;border:1px solid #dde3ec;">${esc(v)}</td></tr>`
        )
        .join('')
    : '';
  const docRowsHtml = docRows
    .map(
      (d) =>
        `<tr><td style="padding:7px 10px;border:1px solid #dde3ec;">${esc(d.slot_label)}</td><td style="padding:7px 10px;border:1px solid #dde3ec;">${esc(d.file_name)}</td><td style="padding:7px 10px;border:1px solid #dde3ec;">${d.direction === 'from_client' ? 'From client' : 'From the office'}</td><td style="padding:7px 10px;border:1px solid #dde3ec;">${esc(dateLabel(d.uploaded_at))}</td></tr>`
    )
    .join('');
  const eventRows = eventsRes.rows
    .map(
      (e) =>
        `<tr><td style="padding:7px 10px;border:1px solid #dde3ec;">${esc(dateLabel(e.created_at))}</td><td style="padding:7px 10px;border:1px solid #dde3ec;">${esc(e.actor)}</td><td style="padding:7px 10px;border:1px solid #dde3ec;">${esc(e.action)}${e.detail ? `: ${esc(e.detail)}` : ''}</td></tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Case file ${esc(o.id)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0e1728; margin: 32px; }
  h1 { font-size: 22px; color: #0a1a36; margin: 0 0 4px; }
  h2 { font-size: 16px; color: #0a1a36; margin: 28px 0 8px; }
  p.sub { color: #5b6a82; margin: 0 0 8px; }
  table { border-collapse: collapse; width: 100%; max-width: 760px; }
  td.k { padding: 7px 10px; border: 1px solid #dde3ec; color: #5b6a82; width: 200px; }
  td.v { padding: 7px 10px; border: 1px solid #dde3ec; }
  th { text-align: left; padding: 7px 10px; border: 1px solid #dde3ec; background: #f6f7f9; color: #0a1a36; }
</style>
</head>
<body>
<h1>Case file: ${esc(o.id)}</h1>
<p class="sub">The Trucking Business · UNO Group LLC. Exported ${esc(dateLabel(new Date().toISOString()))}.</p>
<h2>Order</h2>
<table>
  <tr><td class="k">Order</td><td class="v">${esc(o.id)}</td></tr>
  <tr><td class="k">Package</td><td class="v">${esc(o.package_name)}</td></tr>
  <tr><td class="k">Buyer</td><td class="v">${esc(o.buyer_name)} (${esc(o.buyer_email)})</td></tr>
  ${intake?.data?.companyName ? `<tr><td class="k">Company</td><td class="v">${esc(intake.data.companyName)}</td></tr>` : ''}
  <tr><td class="k">Amount</td><td class="v">${esc(formatUSD((o.amount_cents ?? 0) / 100))}</td></tr>
  <tr><td class="k">Payment status</td><td class="v">${esc(o.pay_status ?? 'paid')}${o.refunded_cents ? ` · refunded ${esc(formatUSD(o.refunded_cents / 100))}` : ''}</td></tr>
  ${o.stripe_payment_id ? `<tr><td class="k">Stripe payment reference</td><td class="v">${esc(o.stripe_payment_id)}</td></tr>` : ''}
  <tr><td class="k">Ordered</td><td class="v">${esc(dateLabel(o.created_at))}</td></tr>
  ${o.filing_started_at ? `<tr><td class="k">Filing started</td><td class="v">${esc(dateLabel(o.filing_started_at))}</td></tr>` : ''}
  ${o.completed_at ? `<tr><td class="k">Completed</td><td class="v">${esc(dateLabel(o.completed_at))}</td></tr>` : ''}
</table>
<h2>Intake answers</h2>
${intakeRows ? `<table><tr><th>Question</th><th>Answer</th></tr>${intakeRows}</table>` : '<p class="sub">No intake was submitted for this order.</p>'}
<h2>Documents</h2>
${docRowsHtml ? `<table><tr><th>Document</th><th>File</th><th>Direction</th><th>Uploaded</th></tr>${docRowsHtml}</table>` : '<p class="sub">No documents on this order.</p>'}
${missing.length ? `<p class="sub">Could not be included in this download: ${esc(missing.join(', '))}.</p>` : ''}
<h2>Activity trail</h2>
${eventRows ? `<table><tr><th>When</th><th>Who</th><th>What happened</th></tr>${eventRows}</table>` : '<p class="sub">Nothing recorded yet.</p>'}
</body>
</html>`;

  return { order: o, html, files, missing, docRows };
}

/** Build the case file and store it with its manifest. */
async function buildAndStore(id: string) {
  const built = await assemble(id);
  if (!built) return null;
  const { html, files, missing, docRows } = built;

  let format: 'zip' | 'html' = 'zip';
  let bytes: ArrayBuffer;
  let contentType = 'application/zip';
  try {
    const zip = new JSZip();
    zip.file('case-file.html', html);
    for (const f of files) {
      zip.file(`${f.folder}/${f.name}`, f.bytes);
    }
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    // Fallback: the summary on its own still carries the full record.
    format = 'html';
    contentType = 'text/html; charset=utf-8';
    bytes = new TextEncoder().encode(html).buffer as ArrayBuffer;
  }

  const stored = await storageUpload(BUCKET, storedPath(id, format), bytes, contentType);
  if (!stored.ok) return { error: 'We could not store the case file. Please try again.' };

  const manifest: CaseManifest = {
    builtAt: new Date().toISOString(),
    format,
    docIds: docRows.map((d) => d.id),
    missing,
  };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2))
    .buffer as ArrayBuffer;
  const manifestStored = await storageUpload(
    BUCKET,
    manifestPath(id),
    manifestBytes,
    'application/json'
  );
  if (!manifestStored.ok) return { error: 'We could not store the case file. Please try again.' };

  await logOrderEvent(id, 'Staff', 'case_file_built', `${files.length} document${files.length === 1 ? '' : 's'} included`);
  return { manifest };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Run at request time: the answer depends on the caller's admin key and
  // on live database and storage state, so it must never be prerendered.
  await connection();
  const denied = unauthorized(req);
  if (denied) return denied;
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing order id.' }, { status: 400 });
  if (!backendConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Case files are available on database orders only.' },
      { status: 400 }
    );
  }
  return NextResponse.json(await statusFor(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const denied = unauthorized(req);
  if (denied) return denied;
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing order id.' }, { status: 400 });
  if (!backendConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Case files are available on database orders only.' },
      { status: 400 }
    );
  }
  const result = await buildAndStore(id);
  if (!result) return NextResponse.json({ ok: false, error: 'Order not found.' }, { status: 404 });
  if ('error' in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json(await statusFor(id));
}

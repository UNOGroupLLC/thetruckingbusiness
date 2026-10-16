import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbSelect,
  dbUpsert,
  logOrderEvent,
  storageSignedUrl,
} from '@/lib/server';
import { getPackage } from '@/lib/packages';

/**
 * /api/orders/[id] — single-order detail + admin workflow updates.
 *
 * GET: everything the admin order page needs: the order row, the latest
 * intake submission (answers, status, version), uploaded documents, the
 * call booking, and the activity trail. ADMIN_KEY required (same lock as
 * GET /api/orders).
 *
 * PATCH: { priority?: boolean, assignee?: string } — workflow fields.
 * Every change is written to the activity trail (order_events).
 */

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
  priority: boolean | null;
  assignee: string | null;
  pay_status: string | null;
  refunded_cents: number | null;
  created_at: string;
}

interface IntakeRow {
  order_id: string;
  data: Record<string, string>;
  status: string | null;
  version: number | null;
  certified: { name: string; date: string } | null;
  created_at: string;
}

interface DocRow {
  id: string;
  slot_key: string;
  slot_label: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
  /** Migration-008 columns; absent until that migration has run. */
  direction?: string | null;
  status?: string | null;
  staff_note?: string | null;
}

const DOC_COLUMNS = 'id,slot_key,slot_label,file_name,storage_path,uploaded_at';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = unauthorized(req);
  if (denied) return denied;
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing order id.' }, { status: 400 });
  if (!backendConfigured()) {
    return NextResponse.json({ ok: true, configured: false, order: null });
  }
  // Documents: prefer the migration-008 column list (direction, status,
  // staff_note); fall back to the old list if it has not run yet.
  let docsRes = await dbSelect<DocRow>(
    `order_documents?select=${DOC_COLUMNS},direction,status,staff_note&order_id=eq.${encodeURIComponent(id)}&order=uploaded_at.asc`
  );
  if (!docsRes.ok) {
    docsRes = await dbSelect<DocRow>(
      `order_documents?select=${DOC_COLUMNS}&order_id=eq.${encodeURIComponent(id)}&order=uploaded_at.asc`
    );
  }
  const [orderRes, intakeRes, bookingRes, eventsRes] = await Promise.all([
    dbSelect<OrderRow>(`orders?select=*&id=eq.${encodeURIComponent(id)}&limit=1`),
    dbSelect<IntakeRow>(
      `intake_submissions?select=order_id,data,status,version,certified,created_at&order_id=eq.${encodeURIComponent(id)}&order=version.desc&limit=1`
    ),
    dbSelect<{ date: string; time: string }>(
      `call_bookings?select=date,time&order_id=eq.${encodeURIComponent(id)}&limit=1`
    ),
    dbSelect<{ actor: string; action: string; detail: string | null; created_at: string }>(
      `order_events?select=actor,action,detail,created_at&order_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=50`
    ),
  ]);
  const o = orderRes.rows[0];
  if (!o) return NextResponse.json({ ok: false, error: 'Order not found.' }, { status: 404 });
  const intake = intakeRes.rows[0];
  // Client uploads (direction 'from_client') get a short-lived signed URL
  // so the team can view/download them here; office deliverables keep the
  // exact shape they have always had in this response.
  interface DocOut {
    id: string;
    slotKey: string;
    slotLabel: string;
    fileName: string;
    uploadedAt: string;
    direction?: string;
    status?: string;
    staffNote?: string;
    url?: string;
    downloadUrl?: string;
  }
  const documents: DocOut[] = [];
  const uploads: DocOut[] = [];
  for (const d of docsRes.rows) {
    const base = {
      id: String(d.id),
      slotKey: String(d.slot_key),
      slotLabel: String(d.slot_label),
      fileName: String(d.file_name),
      uploadedAt: String(d.uploaded_at),
      direction: d.direction ?? undefined,
      status: d.status ?? undefined,
      staffNote: d.staff_note ?? undefined,
    };
    if (d.direction === 'from_client') {
      // 12-hour links in the admin: the page can sit open through a work
      // session, and a one-hour link expiring mid-session looks broken.
      const url = await storageSignedUrl('order-documents', d.storage_path, 43200);
      // Separate download URL: Storage serves it as an attachment, so the
      // Download button saves the file instead of opening it like View.
      const downloadUrl = await storageSignedUrl(
        'order-documents',
        d.storage_path,
        43200,
        String(d.file_name)
      );
      const withUrl = { ...base, url: url ?? undefined, downloadUrl: downloadUrl ?? undefined };
      documents.push(withUrl);
      uploads.push(withUrl);
    } else {
      documents.push(base);
    }
  }
  const requestedDocuments = getPackage(o.package_slug)?.requestedDocuments ?? [];
  return NextResponse.json({
    ok: true,
    configured: true,
    order: {
      id: o.id,
      packageSlug: o.package_slug,
      packageName: o.package_name,
      amount: (o.amount_cents ?? 0) / 100,
      buyerName: o.buyer_name,
      buyerEmail: o.buyer_email,
      createdAt: o.created_at,
      intakeService: o.intake_service,
      isRealPayment: true,
      source: 'database' as const,
      intakeStatus:
        o.filing_status === 'filing'
          ? 'filing'
          : (intake?.status ?? undefined),
      filingStartedAt: o.filing_started_at ?? undefined,
      priority: o.priority ?? false,
      assignee: o.assignee ?? undefined,
      payStatus: o.pay_status ?? 'paid',
      refundedCents: o.refunded_cents ?? undefined,
      booking: bookingRes.rows[0]
        ? { date: bookingRes.rows[0].date, time: bookingRes.rows[0].time }
        : undefined,
      documentCount: docsRes.rows.length,
    },
    intake: intake
      ? {
          data: intake.data ?? {},
          status: intake.status,
          version: intake.version ?? 1,
          certified: intake.certified ?? undefined,
          submittedAt: intake.created_at,
        }
      : null,
    documents,
    uploads,
    requestedDocuments,
    events: eventsRes.rows.map((e) => ({
      actor: e.actor,
      action: e.action,
      detail: e.detail ?? undefined,
      createdAt: e.created_at,
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = unauthorized(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const patch: Record<string, unknown> = { id };
  const events: Array<{ action: string; detail?: string }> = [];
  if (typeof body?.priority === 'boolean') {
    patch.priority = body.priority;
    events.push({ action: body.priority ? 'priority_on' : 'priority_off' });
  }
  if (typeof body?.assignee === 'string') {
    patch.assignee = body.assignee || null;
    events.push({
      action: 'assigned',
      detail: body.assignee ? `Assigned to ${body.assignee}` : 'Unassigned',
    });
  }
  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ ok: false, error: 'Nothing to update.' }, { status: 400 });
  }
  let persisted = false;
  if (backendConfigured()) {
    persisted = (await dbUpsert('orders', patch, 'id')).ok;
    for (const e of events) await logOrderEvent(id, 'Owner', e.action, e.detail);
  }
  return NextResponse.json({ ok: true, persisted });
}

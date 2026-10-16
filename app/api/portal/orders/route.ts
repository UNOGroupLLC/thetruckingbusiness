import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbSelect,
  verifyPortalToken,
  storageSignedUrl,
} from '@/lib/server';
import type { OrderUpload } from '@/lib/store';

/**
 * GET /api/portal/orders — the signed-in customer's own orders, straight
 * from the database: payment state, latest intake (including edits the
 * team made for them), their kickoff booking, and their documents with
 * short-lived signed download URLs. This is what makes office-side
 * uploads and corrections visible in the client portal.
 * Auth: x-portal-token header (issued by /api/auth/verify-code).
 */

interface OrderRow {
  id: string;
  package_slug: string;
  package_name: string;
  amount_cents: number | null;
  buyer_name: string;
  buyer_email: string;
  intake_service: 'authority' | 'compliance';
  filing_status: string | null;
  filing_started_at: string | null;
  pay_status?: string | null;
  refunded_cents?: number | null;
  priority?: boolean | null;
  assignee?: string | null;
  /** Migration-010 column; absent until that migration has run. */
  completed_at?: string | null;
  created_at: string;
}

interface DocRow {
  id: string;
  order_id: string;
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

const DOC_COLUMNS = 'id,order_id,slot_key,slot_label,file_name,storage_path,uploaded_at';

export async function GET(req: NextRequest) {
  const email = verifyPortalToken(req.headers.get('x-portal-token') ?? '');
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  if (!backendConfigured()) {
    return NextResponse.json({ ok: true, configured: false, orders: [] });
  }

  const [ordersRes, intakeRes, bookingRes] = await Promise.all([
    dbSelect<OrderRow>(
      `orders?select=*&buyer_email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=100`
    ),
    dbSelect<{
      order_id: string;
      data: Record<string, string>;
      status: 'submitted' | 'corrected' | 'certified' | 'filing';
      version: number;
    }>('intake_submissions?select=order_id,data,status,version&order=version.desc'),
    dbSelect<{ order_id: string; date: string; time: string }>(
      'call_bookings?select=order_id,date,time'
    ),
  ]);

  // Documents: prefer the migration-008 column list (direction, status,
  // staff_note). If those columns do not exist yet, fall back to the old
  // list so the portal keeps working exactly as before the migration.
  let docsRes = await dbSelect<DocRow>(
    `order_documents?select=${DOC_COLUMNS},direction,status,staff_note&order=uploaded_at.asc`
  );
  if (!docsRes.ok) {
    docsRes = await dbSelect<DocRow>(
      `order_documents?select=${DOC_COLUMNS}&order=uploaded_at.asc`
    );
  }
  if (!ordersRes.ok) {
    return NextResponse.json(
      { ok: false, error: ordersRes.error ?? 'Order query failed.' },
      { status: 502 }
    );
  }

  const mine = new Set(ordersRes.rows.map((o) => o.id));
  // Intake rows arrive newest version first; first row per order wins.
  const intakeByOrder = new Map<string, (typeof intakeRes.rows)[number]>();
  for (const r of intakeRes.rows) {
    if (mine.has(r.order_id) && !intakeByOrder.has(r.order_id)) intakeByOrder.set(r.order_id, r);
  }
  const bookingByOrder = new Map(
    bookingRes.rows.filter((r) => mine.has(r.order_id)).map((r) => [r.order_id, r])
  );

  const docsByOrder = new Map<string, unknown[]>();
  const uploadsByOrder = new Map<string, OrderUpload[]>();
  for (const d of docsRes.rows) {
    if (!mine.has(d.order_id)) continue;
    if (d.direction === 'from_client' && d.slot_key !== 'limited-poa') {
      // Client uploads are reported separately and never carry a storage
      // path or a signed URL: the office opens those files from the admin.
      // Exception: the signed limited POA copy (slot 'limited-poa') is the
      // client's own copy of a document they signed, so it falls through
      // to the documents list below and renders with a download link.
      const list = uploadsByOrder.get(d.order_id) ?? [];
      list.push({
        id: d.id,
        slotKey: d.slot_key,
        slotLabel: d.slot_label,
        fileName: d.file_name,
        status:
          d.status === 'accepted' || d.status === 'needs_new_copy'
            ? d.status
            : 'in_review',
        staffNote: d.staff_note ?? undefined,
        createdAt: d.uploaded_at,
      });
      uploadsByOrder.set(d.order_id, list);
      continue;
    }
    // Minted with the file name as a download: Storage serves it as an
    // attachment, so the portal's Download link saves the file instead of
    // opening it (the HTML download attribute is ignored cross-origin).
    const url = await storageSignedUrl('order-documents', d.storage_path, 3600, d.file_name);
    const list = docsByOrder.get(d.order_id) ?? [];
    const docEntry = {
      id: d.id,
      slotKey: d.slot_key,
      slotLabel: d.slot_label,
      fileName: d.file_name,
      uploadedAt: d.uploaded_at,
      // The portal renders a Download link when dataUrl exists; here it
      // carries a one-hour signed URL for the real file.
      dataUrl: url ?? undefined,
    };
    // One entry per slot: rows arrive oldest first, so replacing an
    // existing slot entry keeps the NEWEST file. Without this, a replaced
    // deliverable would keep showing the client the old file.
    const prior = list.findIndex(
      (e) => (e as { slotKey?: string }).slotKey === d.slot_key
    );
    if (prior >= 0) list[prior] = docEntry;
    else list.push(docEntry);
    docsByOrder.set(d.order_id, list);
  }

  const orders = ordersRes.rows.map((o) => {
    const intake = intakeByOrder.get(o.id);
    const booking = bookingByOrder.get(o.id);
    return {
      id: o.id,
      packageSlug: o.package_slug,
      packageName: o.package_name,
      amount: (o.amount_cents ?? 0) / 100,
      buyerName: o.buyer_name,
      buyerEmail: o.buyer_email,
      createdAt: o.created_at,
      intakeService: o.intake_service,
      intakeStatus: o.filing_status === 'filing' ? 'filing' : intake?.status,
      intake: intake?.data,
      filingStartedAt: o.filing_started_at ?? undefined,
      booking: booking ? { date: booking.date, time: booking.time } : undefined,
      documents: docsByOrder.get(o.id) ?? [],
      uploads: uploadsByOrder.get(o.id) ?? [],
      payStatus:
        o.pay_status === 'refunded' || o.pay_status === 'cancelled' ? o.pay_status : 'paid',
      refundedCents: o.refunded_cents ?? undefined,
      priority: Boolean(o.priority),
      assignee: o.assignee ?? undefined,
      completedAt: o.completed_at ?? undefined,
    };
  });
  return NextResponse.json({ ok: true, configured: true, orders });
}

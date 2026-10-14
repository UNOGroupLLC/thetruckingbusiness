import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbSelect,
  verifyPortalToken,
  storageSignedUrl,
} from '@/lib/server';

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
  created_at: string;
}

export async function GET(req: NextRequest) {
  const email = verifyPortalToken(req.headers.get('x-portal-token') ?? '');
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  if (!backendConfigured()) {
    return NextResponse.json({ ok: true, configured: false, orders: [] });
  }

  const [ordersRes, intakeRes, bookingRes, docsRes] = await Promise.all([
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
    dbSelect<{
      id: string;
      order_id: string;
      slot_key: string;
      slot_label: string;
      file_name: string;
      storage_path: string;
      created_at: string;
    }>('order_documents?select=id,order_id,slot_key,slot_label,file_name,storage_path,created_at&order=created_at.asc'),
  ]);
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
  for (const d of docsRes.rows) {
    if (!mine.has(d.order_id)) continue;
    const url = await storageSignedUrl('order-documents', d.storage_path, 3600);
    const list = docsByOrder.get(d.order_id) ?? [];
    list.push({
      id: d.id,
      slotKey: d.slot_key,
      slotLabel: d.slot_label,
      fileName: d.file_name,
      uploadedAt: d.created_at,
      // The portal renders a Download link when dataUrl exists; here it
      // carries a one-hour signed URL for the real file.
      dataUrl: url ?? undefined,
    });
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
      payStatus:
        o.pay_status === 'refunded' || o.pay_status === 'cancelled' ? o.pay_status : 'paid',
      refundedCents: o.refunded_cents ?? undefined,
      priority: Boolean(o.priority),
      assignee: o.assignee ?? undefined,
    };
  });
  return NextResponse.json({ ok: true, configured: true, orders });
}

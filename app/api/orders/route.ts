import { NextRequest, NextResponse } from 'next/server';
import { getPackage, formatUSD } from '@/lib/packages';
import {
  backendConfigured,
  dbUpsert,
  dbSelect,
  sendOwnerEmail,
  sendClientEmail,
  emailConfigured,
  ownerEmail,
} from '@/lib/server';
import { purchaseEmail, clientPurchaseEmail } from '@/lib/email';

/**
 * POST /api/orders — record a purchase server-side + notify the owner.
 * Body: { id, packageSlug, buyerName, buyerEmail }
 * Always returns ok:true (the client already saved locally); `persisted` and
 * `emailed` report what the backend achieved. Demo mode: both false.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { id, packageSlug, buyerName, buyerEmail } = body ?? {};
  const pkg = typeof packageSlug === 'string' ? getPackage(packageSlug) : undefined;

  if (!id || !pkg || !buyerName || !buyerEmail) {
    return NextResponse.json({ ok: false, error: 'Missing order fields.' }, { status: 400 });
  }

  const amount = formatUSD(pkg.price);
  let persisted = false;
  let emailed = false;
  let clientEmailed = false;

  if (backendConfigured()) {
    const r = await dbUpsert(
      'orders',
      {
        id,
        package_slug: pkg.slug,
        package_name: pkg.name,
        amount_cents: Math.round(pkg.price * 100),
        buyer_name: String(buyerName).trim(),
        buyer_email: String(buyerEmail).trim(),
        intake_service: pkg.intake,
        created_at: new Date().toISOString(),
      },
      'id'
    );
    persisted = r.ok;
  }

  if (emailConfigured()) {
    const info = {
      id,
      packageName: pkg.name,
      amount: `${amount} ${pkg.billing === 'one-time' ? 'one-time' : pkg.billing}`,
      amountCents: Math.round(pkg.price * 100),
      billing: pkg.billing,
      buyerName: String(buyerName).trim(),
      buyerEmail: String(buyerEmail).trim(),
      createdAt: new Date().toLocaleString('en-US'),
    };
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host = req.headers.get('host') ?? 'thetruckingbusiness.vercel.app';
    const { subject, html } = purchaseEmail(info, `${proto}://${host}/admin`);
    emailed = (await sendOwnerEmail(subject, html)).ok;
    // Client confirmation with intake link.
    const intakeUrl = `${proto}://${host}/intake/${pkg.intake}?order=${encodeURIComponent(id)}`;
    const logoUrl = `${proto}://${host}/logo-receipt.png`;
    const client = clientPurchaseEmail(info, intakeUrl, pkg.inclusions, logoUrl);
    clientEmailed = (await sendClientEmail(info.buyerEmail, client.subject, client.html)).ok;
  }

  // Phase 2 hardening: verify payment via Stripe webhook before notifying.
  return NextResponse.json({ ok: true, persisted, emailed, ownerNotified: emailed, clientEmailed });
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
  priority?: boolean | null;
  assignee?: string | null;
  pay_status?: string | null;
  refunded_cents?: number | null;
  created_at: string;
}

/**
 * GET /api/orders — order inbox feed for the admin panel.
 * Demo: { configured:false, orders:[] } (admin falls back to localStorage).
 * Production: lists real orders from Supabase (newest first) with intake,
 * booking, and document presence merged in. Set ADMIN_KEY and pass
 * ?key=... or x-admin-key header to lock it down.
 */
export async function GET(req: NextRequest) {
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey) {
    const provided =
      req.headers.get('x-admin-key') ?? req.nextUrl.searchParams.get('key') ?? '';
    if (provided.trim() !== adminKey) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }
  }
  if (!backendConfigured()) {
    return NextResponse.json({ ok: true, configured: false, orders: [] });
  }
  const [ordersRes, intakeRes, bookingRes, docsRes] = await Promise.all([
    dbSelect<OrderRow>(
      'orders?select=*&order=created_at.desc&limit=200'
    ),
    dbSelect<{
      order_id: string;
      status: 'submitted' | 'corrected' | 'certified' | 'filing';
      version: number;
      certified?: { name?: string; date?: string } | null;
    }>('intake_submissions?select=order_id,status,version,certified&order=version.desc'),
    dbSelect<{ order_id: string; date: string; time: string }>(
      'call_bookings?select=order_id,date,time'
    ),
    dbSelect<{ order_id: string }>('order_documents?select=order_id'),
  ]);
  if (!ordersRes.ok) {
    return NextResponse.json(
      { ok: false, error: ordersRes.error ?? 'Order query failed.' },
      { status: 502 }
    );
  }
  const intakeOrders = new Set(intakeRes.rows.map((r) => r.order_id));
  // Rows arrive newest version first; the first row per order is the latest.
  const intakeByOrder = new Map<string, (typeof intakeRes.rows)[number]>();
  for (const r of intakeRes.rows) {
    if (!intakeByOrder.has(r.order_id)) intakeByOrder.set(r.order_id, r);
  }
  const bookingByOrder = new Map(bookingRes.rows.map((r) => [r.order_id, r]));
  const docCount = new Map<string, number>();
  for (const d of docsRes.rows) docCount.set(d.order_id, (docCount.get(d.order_id) ?? 0) + 1);

  const orders = ordersRes.rows.map((o) => {
    const booking = bookingByOrder.get(o.id);
    const latestIntake = intakeByOrder.get(o.id);
    return {
      id: o.id,
      packageSlug: o.package_slug,
      packageName: o.package_name,
      amount: (o.amount_cents ?? 0) / 100,
      buyerName: o.buyer_name,
      buyerEmail: o.buyer_email,
      createdAt: o.created_at,
      intakeService: o.intake_service,
      // Shape matches OrderRecord; `source` marks these as database rows so
      // the admin UI renders them distinctly from localStorage demo orders.
      isRealPayment: true,
      source: 'database' as const,
      intakeStatus: o.filing_status === 'filing' ? ('filing' as const) : latestIntake ? latestIntake.status : (intakeOrders.has(o.id) ? ('submitted' as const) : undefined),
      intakeVersion: latestIntake?.version,
      intakeCertified: latestIntake?.certified ?? undefined,
      filingStartedAt: o.filing_started_at ?? undefined,
      priority: Boolean(o.priority),
      assignee: o.assignee ?? undefined,
      payStatus:
        o.pay_status === 'refunded' || o.pay_status === 'cancelled' ? o.pay_status : ('paid' as const),
      refundedCents: o.refunded_cents ?? undefined,
      booking: booking ? { date: booking.date, time: booking.time } : undefined,
      documentCount: docCount.get(o.id) ?? 0,
    };
  });
  return NextResponse.json({ ok: true, configured: true, orders });
}

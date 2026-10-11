import { NextRequest, NextResponse } from 'next/server';
import { getPackage, formatUSD } from '@/lib/packages';
import {
  backendConfigured,
  dbUpsert,
  sendOwnerEmail,
  emailConfigured,
  ownerEmail,
} from '@/lib/server';
import { purchaseEmail } from '@/lib/email';

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
    const { subject, html } = purchaseEmail({
      id,
      packageName: pkg.name,
      amount: `${amount} ${pkg.billing === 'one-time' ? 'one-time' : pkg.billing}`,
      buyerName: String(buyerName).trim(),
      buyerEmail: String(buyerEmail).trim(),
      createdAt: new Date().toLocaleString('en-US'),
    });
    emailed = (await sendOwnerEmail(subject, html)).ok;
  }

  // Phase 2 hardening: verify payment via Stripe webhook before notifying.
  return NextResponse.json({ ok: true, persisted, emailed, ownerNotified: emailed });
}

/**
 * GET /api/orders — order inbox feed for the admin panel.
 * Demo: { configured:false, orders:[] } (admin falls back to localStorage).
 * Production: set ADMIN_KEY and pass ?key=... or x-admin-key header.
 */
export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY ?? '';
  if (adminKey) {
    const provided =
      req.headers.get('x-admin-key') ?? req.nextUrl.searchParams.get('key') ?? '';
    if (provided !== adminKey) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }
  }
  if (!backendConfigured()) {
    return NextResponse.json({ ok: true, configured: false, orders: [] });
  }
  // NOTE: production hardening would page + join intake/bookings here.
  // For the Phase 2 start, the admin inbox reads via this feed; full joins
  // arrive with the owner-auth milestone.
  return NextResponse.json({ ok: true, configured: true, orders: [], note: 'order detail feed ships with owner auth' });
}

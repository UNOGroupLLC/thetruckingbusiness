import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  backendConfigured,
  dbUpsert,
  sendOwnerEmail,
  sendClientEmail,
  emailConfigured,
} from '@/lib/server';
import { getPackage } from '@/lib/packages';
import { purchaseEmail, clientPurchaseEmail, type OrderInfo } from '@/lib/email';

/**
 * POST /api/webhooks/stripe — Stripe event webhook.
 * Verifies the signature with STRIPE_WEBHOOK_SECRET, then on
 * checkout.session.completed: creates the order row in Supabase and sends
 * the owner + customer emails. Always 200 (Stripe retries otherwise).
 *
 * Dashboard setup: Developers → Webhooks → Add endpoint →
 * https://thetruckingbusiness.com/api/webhooks/stripe →
 * select "checkout.session.completed".
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json({ ok: false, error: 'Stripe not configured.' }, { status: 500 });
  }
  const stripe = new Stripe(secret);
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? '', webhookSecret);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Bad signature' },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const m = session.metadata ?? {};
    const orderId = m.orderId || `TTB-${Date.now().toString().slice(-6)}`;
    const pkg = m.packageSlug ? getPackage(m.packageSlug) : undefined;
    const packageName = m.packageName || pkg?.name || 'Package';
    const amountCents = Number(m.amountCents ?? session.amount_total ?? 0);
    const buyerName = m.buyerName || '';
    const buyerEmail = m.buyerEmail || session.customer_email || '';
    const billing = m.billing || pkg?.billing || 'one-time';
    const intakeService = pkg?.intake ?? 'authority';

    // 1) Persist the order (Supabase).
    if (backendConfigured() && buyerEmail) {
      await dbUpsert(
        'orders',
        {
          id: orderId,
          package_slug: m.packageSlug || 'unknown',
          package_name: packageName,
          amount_cents: amountCents,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          intake_service: intakeService,
        },
        'id'
      );
    }

    // 2) Emails (owner + customer), same templates as the rest of the app.
    if (emailConfigured() && buyerEmail) {
      const amountLabel = `$${(amountCents / 100).toLocaleString('en-US')}${
        billing === 'one-time' ? ' one-time' : billing
      }`;
      const info: OrderInfo = {
        id: orderId,
        packageName,
        amount: amountLabel,
        buyerName,
        buyerEmail,
        createdAt: new Date().toLocaleString('en-US'),
      };
      const proto = req.headers.get('x-forwarded-proto') ?? 'https';
      const host = req.headers.get('host') ?? 'thetruckingbusiness.com';
      const adminUrl = `${proto}://${host}/admin`;
      const owner = purchaseEmail(info, adminUrl);
      await sendOwnerEmail(owner.subject, owner.html);

      const intakeUrl = `${proto}://${host}/intake/${intakeService}?order=${encodeURIComponent(orderId)}`;
      const client = clientPurchaseEmail(info, intakeUrl, pkg?.inclusions ?? []);
      await sendClientEmail(buyerEmail, client.subject, client.html);
    }
  }

  return NextResponse.json({ ok: true });
}

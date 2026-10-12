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
/**
 * Look up the real payment method used for a Checkout Session (e.g. "Visa •••• 4242").
 * Returns '' when it can't be determined — the receipt simply omits the row.
 * Never fabricated: only what Stripe reports.
 */
async function getPaymentMethodLabel(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<string> {
  try {
    let pmId: string | null = null;
    const piRef = session.payment_intent;
    if (typeof piRef === 'string') {
      const pi = await stripe.paymentIntents.retrieve(piRef);
      pmId =
        typeof pi.payment_method === 'string'
          ? pi.payment_method
          : pi.payment_method?.id ?? null;
    } else if (piRef?.payment_method) {
      const pm = piRef.payment_method;
      pmId = typeof pm === 'string' ? pm : pm.id;
    }
    // Subscription mode: the payment intent lives on the first invoice.
    if (!pmId && session.subscription) {
      const subId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subId, {
        expand: ['latest_invoice.payment_intent'],
      });
      const inv = sub.latest_invoice as unknown as {
        payment_intent?: unknown;
        payments?: { data?: Array<{ payment_intent?: unknown }> };
      } | null;
      const invPi = inv?.payment_intent ?? inv?.payments?.data?.[0]?.payment_intent;
      const invPiId = typeof invPi === 'string' ? invPi : (invPi as { id?: string } | undefined)?.id;
      if (invPiId) {
        const pi = await stripe.paymentIntents.retrieve(invPiId);
        pmId =
          typeof pi.payment_method === 'string'
            ? pi.payment_method
            : pi.payment_method?.id ?? null;
      }
    }
    if (!pmId) return '';
    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (pm.type === 'card' && pm.card) {
      const brand = pm.card.brand
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return `${brand} \u2022\u2022\u2022\u2022 ${pm.card.last4}`;
    }
    const labels: Record<string, string> = {
      afterpay_clearpay: 'Afterpay',
      klarna: 'Klarna',
      affirm: 'Affirm',
      us_bank_account: 'Bank account',
      link: 'Link',
      cashapp: 'Cash App',
    };
    return labels[pm.type] ?? pm.type;
  } catch {
    return '';
  }
}

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
      const payMethod = await getPaymentMethodLabel(stripe, session);
      const info: OrderInfo = {
        id: orderId,
        packageName,
        amount: amountLabel,
        amountCents,
        billing,
        payMethod: payMethod || undefined,
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
      const logoUrl = `${proto}://${host}/logo-receipt.png`;
      const client = clientPurchaseEmail(info, intakeUrl, pkg?.inclusions ?? [], logoUrl);
      await sendClientEmail(buyerEmail, client.subject, client.html);
    }
  }

  return NextResponse.json({ ok: true });
}

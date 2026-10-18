import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPackage } from '@/lib/packages';

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function originOf(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? 'thetruckingbusiness.com';
  return `${proto}://${host}`;
}

/**
 * POST /api/checkout/session — create a Stripe Checkout Session.
 * Body: { packageSlug, buyerName, buyerEmail, priceOverride?, optionLabel? }
 * Returns { url } to redirect the buyer to Stripe's hosted checkout.
 * When Stripe isn't configured: { ok:false, error:'stripe-not-configured' }
 * so the checkout page can fall back to the simulated flow.
 */
export async function POST(req: NextRequest) {
  const stripe = stripeClient();
  if (!stripe) {
    return NextResponse.json({ ok: false, error: 'stripe-not-configured' });
  }
  const body = await req.json().catch(() => null);
  const { packageSlug, buyerName, buyerEmail, priceOverride, optionLabel } = (body ?? {}) as {
    packageSlug?: string;
    buyerName?: string;
    buyerEmail?: string;
    priceOverride?: number;
    optionLabel?: string;
  };
  const pkg = packageSlug ? getPackage(packageSlug) : undefined;
  if (!pkg || !buyerName?.trim() || !buyerEmail?.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Missing checkout fields.' }, { status: 400 });
  }

  const price = Math.round(priceOverride ?? pkg.price);
  const amountCents = Math.round(price * 100);
  const isSubscription = pkg.billing === '/month' || pkg.billing === '/year';
  // One TTB order id, generated once — webhook (Supabase) and receipt page
  // (localStorage) both use it so the order matches everywhere.
  const orderId = `TTB-${Date.now().toString().slice(-6)}`;
  const origin = originOf(req);
  const itemName = `${pkg.name}${optionLabel ? ` — ${optionLabel}` : ''}`;

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isSubscription ? 'subscription' : 'payment',
      customer_email: buyerEmail.trim(),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            tax_behavior: 'exclusive',
            product_data: { name: itemName, description: pkg.tagline },
            ...(isSubscription
              ? { recurring: { interval: pkg.billing === '/year' ? 'year' : 'month' } }
              : {}),
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId,
        packageSlug: pkg.slug,
        packageName: pkg.name,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        optionLabel: optionLabel ?? '',
        billing: pkg.billing,
        amountCents: String(amountCents),
      },
      success_url: `${origin}/receipt?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      // Stripe Tax is dormant until STRIPE_TAX_ENABLED=1 is set in Vercel.
      // Dashboard Tax setup and the Florida collection decision come first;
      // with the flag off, checkout behaves exactly as it does today.
      ...(process.env.STRIPE_TAX_ENABLED === '1'
        ? { automatic_tax: { enabled: true } }
        : {}),
      // Payment methods (cards + BNPL like Affirm/Afterpay/Klarna) are
      // controlled in the Stripe Dashboard → Settings → Payment methods.
    };
    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ ok: true, url: session.url, orderId });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 502 }
    );
  }
}

/**
 * GET /api/checkout/session?session_id=... — retrieve a completed session
 * so the receipt page can render the order. Returns the metadata we stored.
 */
export async function GET(req: NextRequest) {
  const stripe = stripeClient();
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!stripe || !sessionId) {
    return NextResponse.json({ ok: false, error: 'Missing session.' }, { status: 400 });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ ok: false, error: 'Payment not completed.' }, { status: 402 });
    }
    const m = session.metadata ?? {};
    return NextResponse.json({
      ok: true,
      order: {
        id: m.orderId ?? session.id,
        packageSlug: m.packageSlug ?? '',
        packageName: m.packageName ?? 'Package',
        amountCents: Number(m.amountCents ?? session.amount_total ?? 0),
        buyerName: m.buyerName ?? '',
        buyerEmail: m.buyerEmail ?? session.customer_email ?? '',
        optionLabel: m.optionLabel ?? '',
        billing: m.billing ?? 'one-time',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 502 }
    );
  }
}

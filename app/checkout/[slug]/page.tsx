'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTtb, createOrder, formatUSD } from '@/lib/store';
import { syncOrder } from '@/lib/sync';
import Field from '@/components/Field';

/**
 * Checkout — Stripe hosted Checkout when configured, simulated flow otherwise.
 * Real payments: buyer is redirected to Stripe (cards + BNPL once enabled in
 * the Stripe Dashboard); the webhook creates the order server-side.
 */
function CheckoutInner() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const slug = params.slug as string;
  const { packages } = useTtb();
  const pkg = packages.find((p) => p.slug === slug);
  // Purchasable variant (e.g. State Permit: all 3 states vs single state).
  const option = pkg?.options?.find((o) => o.id === search.get('opt')) ?? pkg?.options?.[0];
  const price = option?.price ?? pkg?.price ?? 0;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!pkg) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[20px] font-extrabold text-navy">Package not found</h1>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }

  /** Simulated fallback — used only until Stripe keys are set in Vercel. */
  function simulatedCheckout() {
    const order = createOrder({
      packageSlug: pkg!.slug,
      buyerName: name.trim(),
      buyerEmail: email.trim(),
      priceOverride: price,
      optionLabel: option?.label,
    });
    syncOrder({ id: order.id, packageSlug: pkg!.slug, buyerName: name.trim(), buyerEmail: email.trim() });
    router.push(`/receipt?id=${order.id}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !email.includes('@')) {
      setError('Please fill in your name and a valid email.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageSlug: pkg!.slug,
          buyerName: name.trim(),
          buyerEmail: email.trim(),
          priceOverride: price,
          optionLabel: option?.label,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok && data.url) {
        // Real payment — off to Stripe's secure checkout.
        window.location.href = data.url;
        return;
      }
      // Stripe not configured (or error) — fall back to the simulated flow.
      simulatedCheckout();
    } catch {
      simulatedCheckout();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-mist py-14">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 md:grid-cols-2">
        <div className="card h-fit">
          <p className="eyebrow">Order summary</p>
          <h1 className="mt-2 text-[20px] font-extrabold text-navy">{pkg.name}</h1>
          <p className="mt-1 text-[13.5px] text-steel">{pkg.tagline}</p>
          {option && (
            <p className="mt-2 inline-block rounded-full bg-navy/10 px-3 py-1 text-[11px] font-bold text-navy">
              {option.label}
            </p>
          )}
          <div className="mt-4 border-t border-[#dde3ec] pt-4">
            <p className="text-[13.5px] font-bold text-navy">What&apos;s included</p>
            <ul className="mt-2 space-y-1.5">
              {pkg.inclusions.map((item) => (
                <li key={item} className="flex gap-2 text-[13.5px] text-steel">
                  <span aria-hidden="true" className="font-bold text-[#15803d]">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 border-t border-[#dde3ec] pt-4">
            <div className="flex justify-between text-[13.5px]">
              <span>Package price (all-in)</span>
              <span className="font-bold">{formatUSD(price)} {pkg.billing}</span>
            </div>
            <p className="mt-2 text-[12.5px] text-steel">
              Includes our service fee and government filing fees, remitted on your behalf.
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-[20px] font-extrabold text-navy">Checkout</h2>
          <p className="mt-1 rounded-lg bg-[#e8effa] px-3 py-2 text-[12.5px] font-semibold text-navy">
            Secure checkout — you&rsquo;ll complete payment on Stripe&rsquo;s encrypted page. Cards
            and financing options (Afterpay, Klarna) accepted where available.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Full name">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Owner" autoComplete="name" />
            </Field>
            <Field label="Email" hint="Used for your receipt, intake follow-ups, and client portal login.">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </Field>
            {error && <p role="alert" className="text-[13.5px] font-semibold text-[#dc2626]">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Redirecting to secure payment…' : `Continue to payment — ${formatUSD(price)}${pkg.billing === '/month' ? '/month' : pkg.billing === '/year' ? '/year' : ''}`}
            </button>
            <p className="text-center text-[11px] text-steel">
              No payment details are entered or stored on this site.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center">Loading checkout…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}

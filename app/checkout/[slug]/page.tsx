'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTtb, createOrder, formatUSD } from '@/lib/store';
import { syncOrder } from '@/lib/sync';
import Field from '@/components/Field';

/**
 * MOCK CHECKOUT — Phase 1.
 * No real payment is processed. Phase 2 replaces the submit handler with a
 * Stripe PaymentIntent flow (see lib/store.ts seams).
 */
function CheckoutInner() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { packages } = useTtb();
  const pkg = packages.find((p) => p.slug === slug);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [card, setCard] = useState('');
  const [error, setError] = useState('');

  if (!pkg) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">Package not found</h1>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !card.trim()) {
      setError('Please fill in your name, email, and card details.');
      return;
    }
    const order = createOrder({ packageSlug: pkg!.slug, buyerName: name.trim(), buyerEmail: email.trim() });
    // Phase 2: persist server-side + notify the owner (best-effort; demo keeps working offline).
    syncOrder({ id: order.id, packageSlug: pkg!.slug, buyerName: name.trim(), buyerEmail: email.trim() });
    router.push(`/receipt?id=${order.id}`);
  }

  return (
    <div className="bg-mist py-14">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 md:grid-cols-2">
        <div className="card h-fit">
          <p className="eyebrow">Order summary</p>
          <h1 className="mt-2 text-2xl font-extrabold text-navy">{pkg.name}</h1>
          <p className="mt-1 text-sm text-steel">{pkg.tagline}</p>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-sm font-bold text-navy">What&apos;s included</p>
            <ul className="mt-2 space-y-1.5">
              {pkg.inclusions.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-steel">
                  <span aria-hidden="true" className="font-bold text-green-600">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-sm">
              <span>Package price (all-in)</span>
              <span className="font-bold">{formatUSD(pkg.price)} {pkg.billing}</span>
            </div>
            <p className="mt-2 text-xs text-steel">
              Includes our service fee and government filing fees, remitted on your behalf.
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-extrabold text-navy">Checkout</h2>
          <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Demo checkout — no real payment is processed and no card is charged.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Full name">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Owner" autoComplete="name" />
            </Field>
            <Field label="Email" hint="Used for your receipt, intake follow-ups, and client portal login.">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </Field>
            <Field label="Card number (mock)">
              <input className="input" inputMode="numeric" value={card} onChange={(e) => setCard(e.target.value)} placeholder="4242 4242 4242 4242" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Expiry (mock)">
                <input className="input" placeholder="12/28" />
              </Field>
              <Field label="CVC (mock)">
                <input className="input" inputMode="numeric" placeholder="123" />
              </Field>
            </div>
            {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              Pay {formatUSD(pkg.price)} {pkg.billing === '/mo' ? 'per month' : ''}
            </button>
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

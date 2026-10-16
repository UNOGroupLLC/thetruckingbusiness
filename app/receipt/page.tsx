'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getOrder, createOrder, formatUSD, formatDate, type OrderRecord } from '@/lib/store';

interface SessionOrder {
  id: string;
  packageSlug: string;
  packageName: string;
  amountCents: number;
  buyerName: string;
  buyerEmail: string;
  optionLabel: string;
  billing: string;
}

/**
 * Receipt — two flows:
 *  - ?session_id= : real Stripe payment. Verifies the session server-side,
 *    mirrors the order into this browser's store (same TTB id the webhook
 *    used), then shows the receipt.
 *  - ?id= : simulated checkout fallback (until Stripe keys are set).
 */
function ReceiptInner() {
  const search = useSearchParams();
  const sessionId = search.get('session_id');
  const legacyId = search.get('id');
  const [order, setOrder] = useState<OrderRecord | undefined>(() =>
    legacyId ? getOrder(legacyId) : undefined
  );
  const [realPayment, setRealPayment] = useState(false);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          order?: SessionOrder;
          error?: string;
        };
        if (cancelled) return;
        if (!data?.ok || !data.order) {
          setError(data?.error || 'We could not confirm your payment.');
          setLoading(false);
          return;
        }
        const s = data.order;
        // Mirror into this browser's store with the same TTB id the webhook used.
        let local = getOrder(s.id);
        if (!local) {
          try {
            local = createOrder({
              id: s.id,
              packageSlug: s.packageSlug,
              buyerName: s.buyerName,
              buyerEmail: s.buyerEmail,
              priceOverride: s.amountCents / 100,
              optionLabel: s.optionLabel || undefined,
              isRealPayment: true,
            });
          } catch {
            local = undefined;
          }
        }
        setOrder(local);
        setRealPayment(true);
      } catch {
        if (!cancelled) setError('We could not confirm your payment. Please contact us.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[20px] font-extrabold text-navy">Confirming your payment…</h1>
        <p className="mt-2 text-steel">One moment while we verify with Stripe.</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[20px] font-extrabold text-navy">No receipt found</h1>
        <p className="mt-2 text-steel">{error || 'We couldn\u2019t find that order.'}</p>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }

  return (
    <div className="bg-mist py-14">
      <div className="mx-auto max-w-2xl px-4">
        <div className="card text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-none bg-green-100 text-[20px] font-extrabold text-green-700" aria-hidden="true">✓</span>
          <h1 className="mt-4 text-[28px] font-extrabold text-navy">Payment successful</h1>
          {!realPayment && (
            <p className="mt-1 text-[13.5px] font-semibold text-steel">SIMULATED — no real payment was processed</p>
          )}
        </div>

        <div className="card mt-6">
          <p className="eyebrow">Receipt</p>
          <dl className="mt-3 space-y-2 text-[13.5px]">
            <div className="flex justify-between"><dt className="text-steel">Order</dt><dd className="font-bold">{order.id}</dd></div>
            <div className="flex justify-between"><dt className="text-steel">Date</dt><dd className="font-semibold">{formatDate(order.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-steel">Package</dt><dd className="font-semibold">{order.packageName}{order.optionLabel ? ` — ${order.optionLabel}` : ''}</dd></div>
            <div className="flex justify-between"><dt className="text-steel">Buyer</dt><dd className="font-semibold">{order.buyerName} ({order.buyerEmail})</dd></div>
            <div className="flex justify-between border-t border-[#dde3ec] pt-2 text-[15px]"><dt className="font-bold">Charged</dt><dd className="font-extrabold text-navy">{formatUSD(order.amount)}</dd></div>
          </dl>
        </div>

        <div className="card mt-6 bg-navy text-white">
          <h2 className="text-[20px] font-extrabold">Next: tell us about your company</h2>
          <p className="mt-2 text-[13.5px] text-[#cbd8f0]">
            To start your {order.intakeService === 'authority' ? 'operating authority filing' : 'compliance setup'}, we need a few details. It takes about two minutes.
          </p>
          <Link href={`/intake/${order.intakeService}?order=${order.id}`} className="btn-primary mt-5 w-full">
            Continue to intake
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center">Loading receipt…</div>}>
      <ReceiptInner />
    </Suspense>
  );
}

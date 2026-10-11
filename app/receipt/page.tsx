'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getOrder, formatUSD, formatDate } from '@/lib/store';

function ReceiptInner() {
  const search = useSearchParams();
  const order = getOrder(search.get('id'));

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">No receipt found</h1>
        <p className="mt-2 text-steel">We couldn&apos;t find that order in this demo session.</p>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }

  return (
    <div className="bg-mist py-14">
      <div className="mx-auto max-w-2xl px-4">
        <div className="card text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl font-extrabold text-green-700" aria-hidden="true">✓</span>
          <h1 className="mt-4 text-3xl font-extrabold text-navy">Payment successful</h1>
          <p className="mt-1 text-sm font-semibold text-steel">SIMULATED — no real payment was processed</p>
        </div>

        <div className="card mt-6">
          <p className="eyebrow">Receipt</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-steel">Order</dt><dd className="font-bold">{order.id}</dd></div>
            <div className="flex justify-between"><dt className="text-steel">Date</dt><dd className="font-semibold">{formatDate(order.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-steel">Package</dt><dd className="font-semibold">{order.packageName}{order.optionLabel ? ` — ${order.optionLabel}` : ''}</dd></div>
            <div className="flex justify-between"><dt className="text-steel">Buyer</dt><dd className="font-semibold">{order.buyerName} ({order.buyerEmail})</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><dt className="font-bold">Charged</dt><dd className="font-extrabold text-navy">{formatUSD(order.amount)}</dd></div>
          </dl>
        </div>

        <div className="card mt-6 bg-navy text-white">
          <h2 className="text-xl font-extrabold">Next: tell us about your company</h2>
          <p className="mt-2 text-sm text-slate-300">
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

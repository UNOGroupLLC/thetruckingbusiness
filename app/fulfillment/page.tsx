'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getOrder, getCallBooking, formatUSD, formatDate } from '@/lib/store';

function FulfillmentInner() {
  const search = useSearchParams();
  const order = getOrder(search.get('order'));
  const booking = getCallBooking(search.get('order'));

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[20px] font-extrabold text-navy">Nothing to show</h1>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }

  const intakeEntries = order.intake ? Object.entries(order.intake) : [];

  return (
    <div className="bg-mist py-14">
      <div className="mx-auto max-w-3xl px-4">
        <div className="card bg-navy text-white">
          <p className="eyebrow text-highway!">Fulfillment summary</p>
          <h1 className="mt-2 text-[28px] font-extrabold">We&apos;ve got everything we need</h1>
          <p className="mt-2 text-[13.5px] text-[#cbd8f0]">
            This is exactly what our team receives to start your {order.intakeService === 'authority' ? 'filing' : 'setup'}.
            In production this is delivered to the owner&apos;s email/CRM the moment you submit.
          </p>
        </div>

        <div className="card mt-6">
          <h2 className="text-[17px] font-extrabold text-navy">Order</h2>
          <dl className="mt-3 grid gap-2 text-[13.5px] sm:grid-cols-2">
            <div><dt className="text-steel">Order ID</dt><dd className="font-bold">{order.id}</dd></div>
            <div><dt className="text-steel">Date</dt><dd className="font-semibold">{formatDate(order.createdAt)}</dd></div>
            <div><dt className="text-steel">Package</dt><dd className="font-semibold">{order.packageName}</dd></div>
            <div><dt className="text-steel">Amount</dt><dd className="font-semibold">{formatUSD(order.amount)}{order.isRealPayment ? '' : ' (simulated)'}</dd></div>
            <div><dt className="text-steel">Customer</dt><dd className="font-semibold">{order.buyerName}</dd></div>
            <div><dt className="text-steel">Email</dt><dd className="font-semibold">{order.buyerEmail}</dd></div>
          </dl>
        </div>

        {booking && (
          <div className="card mt-6 border-green-200 bg-green-50">
            <h2 className="text-[17px] font-extrabold text-navy">📅 Kickoff call scheduled</h2>
            <p className="mt-2 text-[13.5px] text-steel">
              <span className="font-bold text-charcoal">
                {new Date(`${booking.date}T12:00:00`).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>{' '}
              at <span className="font-bold text-charcoal">{booking.time} Eastern</span> — we&apos;ll call
              the number from your intake form.
            </p>
          </div>
        )}

        <div className="card mt-6">
          <h2 className="text-[17px] font-extrabold text-navy">Submitted intake details</h2>
          {intakeEntries.length === 0 ? (
            <p className="mt-2 text-[13.5px] text-steel">No intake submitted yet.</p>
          ) : (
            <dl className="mt-3 divide-y divide-[#dde3ec] text-[13.5px]">
              {intakeEntries.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="font-semibold text-steel">{k}</dt>
                  <dd className="text-right font-medium">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/portal/login" className="btn-dark">View client portal</Link>
          <Link href="/" className="btn-outline-dark">Back home</Link>
        </div>
      </div>
    </div>
  );
}

export default function FulfillmentPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center">Loading summary…</div>}>
      <FulfillmentInner />
    </Suspense>
  );
}

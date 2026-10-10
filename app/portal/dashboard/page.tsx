'use client';

import Link from 'next/link';
import { useTtb, formatUSD, formatDate } from '@/lib/store';

/** Sample documents shown in the demo portal. Phase 2: rows from a `documents` table + Storage. */
const SAMPLE_DOCS = [
  { name: 'Operating Authority Grant Letter', detail: 'Delivered after FMCSA filing' },
  { name: 'BOC-3 Filing Confirmation', detail: 'Process agent designation' },
  { name: 'UCR Registration Receipt', detail: 'Annual registration' },
];

export default function PortalDashboardPage() {
  const { portalEmail, orders } = useTtb();

  if (!portalEmail) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">Please log in</h1>
        <p className="mt-2 text-steel">Your client portal needs an email login first.</p>
        <Link href="/portal/login" className="btn-dark mt-6">Go to login</Link>
      </div>
    );
  }

  const myOrders = orders.filter(
    (o) => o.buyerEmail.toLowerCase() === portalEmail.toLowerCase()
  );

  return (
    <div className="bg-mist py-12">
      <div className="mx-auto max-w-5xl px-4">
        <p className="eyebrow">Client portal</p>
        <h1 className="mt-2 text-3xl font-extrabold text-navy md:text-4xl">
          Welcome back
        </h1>
        <p className="mt-1 text-steel">{portalEmail}</p>

        <h2 className="mt-10 text-xl font-extrabold text-navy">Your purchases &amp; receipts</h2>
        {myOrders.length === 0 ? (
          <div className="card mt-4">
            <p className="text-sm text-steel">
              No orders in this demo session yet. Try the purchase flow to see receipts, intake
              details, and documents appear here.
            </p>
            <Link href="/pricing" className="btn-dark mt-4">View packages</Link>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {myOrders.map((o) => (
              <div key={o.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-navy">{o.packageName}</h3>
                    <p className="text-sm text-steel">
                      Order {o.id} · {formatDate(o.createdAt)} · {formatUSD(o.amount)} (simulated)
                    </p>
                  </div>
                  <span className="badge-sample">Receipt</span>
                </div>
                {o.intake && Object.keys(o.intake).length > 0 ? (
                  <div className="mt-4 rounded-xl bg-mist p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-steel">
                      Intake details you submitted
                    </p>
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      {Object.entries(o.intake).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 border-b border-slate-200 py-1">
                          <dt className="text-steel">{k}</dt>
                          <dd className="font-medium">{v || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-steel">
                    Intake not submitted yet.{' '}
                    <Link href={`/intake/${o.intakeService}?order=${o.id}`} className="font-bold text-dotblue hover:underline">
                      Complete intake →
                    </Link>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <h2 className="mt-10 text-xl font-extrabold text-navy">Your documents</h2>
        <div className="card mt-4">
          <p className="text-sm text-steel">
            Documents we prepare for you appear here. <span className="badge-sample">Samples below — demo only</span>
          </p>
          <ul className="mt-4 divide-y divide-slate-100">
            {SAMPLE_DOCS.map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{d.name} <span className="badge-sample">Sample</span></p>
                  <p className="text-xs text-steel">{d.detail}</p>
                </div>
                <span className="text-sm font-bold text-dotblue">PDF</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

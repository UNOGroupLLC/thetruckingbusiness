'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTtb, formatUSD } from '@/lib/store';
import type { Package } from '@/lib/store';

/** Package card with purchasable-variant pills (e.g. State Permit 1 vs 3 states). */
function PackageCard({ pkg }: { pkg: Package }) {
  const [optId, setOptId] = useState(pkg.options?.[0]?.id);
  const option = pkg.options?.find((o) => o.id === optId) ?? pkg.options?.[0];
  const price = option?.price ?? pkg.price;
  const checkoutHref = option ? `/checkout/${pkg.slug}?opt=${option.id}` : `/checkout/${pkg.slug}`;

  return (
    <div className="card flex flex-col">
      <h2 className="text-xl font-extrabold text-navy">{pkg.name}</h2>
      <p className="mt-1 text-sm text-steel">{pkg.tagline}</p>
      <p className="mt-4">
        <span className="text-4xl font-extrabold text-navy">{formatUSD(price)}</span>
        <span className="text-sm font-semibold text-steel"> {pkg.billing}</span>
      </p>

      {pkg.options && (
        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Choose an option">
          {pkg.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={o.id === option?.id}
              onClick={() => setOptId(o.id)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                o.id === option?.id
                  ? 'border-navy bg-navy text-white'
                  : 'border-slate-300 bg-white text-steel hover:border-navy'
              }`}
            >
              {o.label} — {formatUSD(o.price)}
            </button>
          ))}
        </div>
      )}

              <div className="mt-5 rounded-xl bg-mist p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-steel">
                  All-in breakdown
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {pkg.fees.map((fee) => (
                    <li key={fee.label} className="flex items-start justify-between gap-3">
                      <span>
                        {fee.label}
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            fee.kind === 'government'
                              ? 'bg-dotblue/10 text-dotblue'
                              : 'bg-navy/10 text-navy'
                          }`}
                        >
                          {fee.kind === 'government' ? 'Gov fee' : 'Our fee'}
                        </span>
                        {fee.note && <span className="block text-xs text-steel">{fee.note}</span>}
                      </span>
                      <span className="font-bold">
                        {fee.amount > 0 ? formatUSD(fee.amount) : fee.note ? 'Included' : 'Varies'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="mt-5 flex-1 space-y-2">
                {pkg.inclusions.map((inc) => (
                  <li key={inc} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 font-bold text-dotblue" aria-hidden="true">✓</span>
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>

              <Link href={checkoutHref} className="btn-primary mt-6 w-full">
                {pkg.cta}
              </Link>
            </div>
  );
}

export default function PricingPage() {
  const { packages } = useTtb();
  const bundles = packages.filter((p) => p.category === 'package');
  const alacarte = packages.filter((p) => p.category === 'alacarte');

  return (
    <div className="bg-mist py-14">
      <div className="mx-auto max-w-6xl px-4">
        <p className="eyebrow text-center">All-in pricing</p>
        <h1 className="mt-2 text-center text-4xl font-extrabold text-navy md:text-5xl">
          Pick your package. We start today.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-steel">
          One price covers our service fee <em>and</em> the government filing fees — we remit them
          on your behalf. Every package below shows exactly where the money goes.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {bundles.map((pkg) => (
            <PackageCard key={pkg.slug} pkg={pkg} />
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <h2 className="text-center text-2xl font-extrabold text-navy md:text-3xl">
            Pay-as-you-go services
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-steel">
            Individual services for customers who need only one item rather than a full package.
          </p>
          <div className="card mt-6 overflow-hidden p-0">
            <table className="w-full text-sm">
              <tbody>
                {alacarte.map((item) => (
                  <tr key={item.slug} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-bold text-navy">{item.name}</p>
                      <p className="text-xs text-steel">{item.tagline}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-extrabold text-navy">
                      {formatUSD(item.price)}
                      <span className="text-xs font-semibold text-steel"> {item.billing}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <Link href={`/checkout/${item.slug}`} className="btn-primary px-4 py-2 text-sm">
                        {item.cta}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-steel">
          Prefer to talk first? <a href="mailto:hello@thetruckingbusiness.com" className="font-bold text-dotblue hover:underline">Talk to us</a> — but most
          customers check out online in minutes, then tell us about their company on the next
          screen.
        </p>
      </div>
    </div>
  );
}

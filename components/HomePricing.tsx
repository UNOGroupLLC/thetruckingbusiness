'use client';

import Link from 'next/link';
import { useTtb } from '@/lib/store';

/* Homepage pricing section — prototype header ("Buy Online — No Call Required")
   with the final approved pricing pulled from the store. */
const FEATURED = ['authority-startup', 'complete', 'compliance'];
const POP_SLUG = 'complete';

function billingLabel(billing: string) {
  return billing === 'one-time' ? 'one-time' : billing;
}

export default function HomePricing() {
  const { packages } = useTtb();
  const cards = FEATURED.map((slug) => packages.find((p) => p.slug === slug)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );

  return (
    <section className="py-16">
      <div className="wrap">
        <div className="sec-head center">
          <div className="kicker">Buy Online — No Call Required</div>
          <h2>
            Pick your package.
            <br />
            <em>We start today.</em>
          </h2>
          <p>
            Buy in about 2 minutes, answer a short intake form, and our team starts your filings.
            100% all-in pricing — our fee and government fees included.
          </p>
        </div>
        <div className="price-grid">
          {cards.map((p) => (
            <article key={p.slug} className={'price' + (p.slug === POP_SLUG ? ' pop' : '')}>
              {p.slug === POP_SLUG && <span className="pop-badge">Most Complete</span>}
              <h3>{p.name}</h3>
              <div className="amt">
                ${p.price.toLocaleString()}
                <span>{billingLabel(p.billing)}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>{p.tagline}</p>
              <ul>
                {p.inclusions.map((inc) => (
                  <li key={inc}>{inc}</li>
                ))}
              </ul>
              <Link
                href={`/checkout/${p.slug}`}
                className={'btn ' + (p.slug === POP_SLUG ? 'btn-y' : 'btn-o')}
              >
                {p.cta} →
              </Link>
              <div className="fee-note">
                100% all-in — government filing fees included in the price above.
              </div>
            </article>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13.5, marginTop: 22 }}>
          Need something else?{' '}
          <Link href="/pricing" style={{ fontWeight: 700, color: 'var(--blue)' }}>
            See all packages &amp; a-la-carte →
          </Link>
        </p>
      </div>
    </section>
  );
}

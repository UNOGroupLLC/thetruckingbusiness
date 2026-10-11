'use client';

import Link from 'next/link';
import { STEPS } from './roadmap-steps';

interface HeroRoadmapCardProps {
  active: number;
  explored: boolean[];
  onSelect: (i: number) => void;
}

/* "Your startup roadmap" progress card shown in the hero — from the approved prototype. */
export default function HeroRoadmapCard({ active, explored, onSelect }: HeroRoadmapCardProps) {
  const n = explored.filter(Boolean).length;
  const pct = Math.round((n / STEPS.length) * 100);

  return (
    <div className="hero-card" aria-label="Startup progress tracker preview">
      <div className="hc-head">
        <b>Your startup roadmap</b>
        <span className="live">
          <i aria-hidden="true" />
          Interactive
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12.5,
          color: 'var(--muted)',
        }}
      >
        <span>
          {n} of {STEPS.length} steps explored
        </span>
        <b style={{ color: 'var(--text)' }}>{pct}%</b>
      </div>
      <div className="progress-track">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="steps-list">
        {STEPS.map((s, i) => (
          <button
            key={s.t}
            type="button"
            onClick={() => onSelect(i)}
            className={
              'step-row' + (explored[i] ? ' done' : '') + (i === active ? ' active' : '')
            }
            aria-label={`Preview step ${i + 1}: ${s.t}`}
          >
            <span className="step-num">{explored[i] ? '✓' : i + 1}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>
              <b>{s.t}</b>
              <span className="step-sub">{s.s}</span>
            </span>
            <span className="step-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
      <Link className="btn btn-n" style={{ width: '100%', marginTop: 14 }} href="/checkout/complete">
        Get the Complete Startup Package →
      </Link>
      <p
        style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', margin: '10px 0 0' }}
      >
        Tap any step to preview what&rsquo;s involved. Checkout takes about 2 minutes.
      </p>
    </div>
  );
}

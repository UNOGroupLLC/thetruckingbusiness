'use client';

import Link from 'next/link';
import { STEPS } from './roadmap-steps';

interface RoadmapProps {
  active: number;
  explored: boolean[];
  onSelect: (i: number) => void;
}

/* Interactive "How it works" roadmap — from the approved prototype. */
export default function Roadmap({ active, explored, onSelect }: RoadmapProps) {
  const step = STEPS[active];
  const fillPct = (active / (STEPS.length - 1)) * 86 + 7;

  return (
    <section style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="sec-head center">
          <div className="kicker">How it works</div>
          <h2>
            The road to <em>operating legally</em>
          </h2>
          <p>Tap each mile marker. This is the exact sequence we walk every new carrier through.</p>
        </div>
        <div className="roadmap-wrap">
          <div className="roadmap-inner">
            <div className="road-nodes">
              <div className="road-line" aria-hidden="true">
                <div className="road-line-fill" style={{ width: `${fillPct}%` }} />
              </div>
              {STEPS.map((s, i) => (
                <button
                  key={s.t}
                  type="button"
                  onClick={() => onSelect(i)}
                  className={
                    'node' +
                    (i === active ? ' active' : '') +
                    (explored[i] && i !== active ? ' done' : '')
                  }
                  aria-label={`Step ${i + 1}: ${s.t}`}
                  aria-current={i === active ? 'step' : undefined}
                >
                  <span className="node-dot">{i + 1}</span>
                  <span>
                    <b>{s.t}</b>
                    <span className="node-sub">{s.s}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="road-detail">
              <div>
                <h4>
                  Step {active + 1}: {step.t}
                </h4>
                <p>{step.d}</p>
              </div>
              <div className="checks">
                {step.c.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <Link className="btn btn-y btn-s" href="/pricing">
                Get This Done For Me — See Packages
              </Link>
              <Link
                className="btn btn-s btn-ghost"
                style={{ borderColor: 'rgba(255,255,255,.2)' }}
                href="/calculators/startup-cost"
              >
                Estimate My Startup Costs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

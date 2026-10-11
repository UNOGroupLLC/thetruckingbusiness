'use client';

import Link from 'next/link';
import { useState } from 'react';

const QUESTIONS = [
  { q: 'Are your Driver Qualification (DQ) files complete for every driver?', pts: 25 },
  { q: 'Is your DOT drug & alcohol program active with a consortium/TPA?', pts: 20 },
  { q: 'Are vehicle inspection & maintenance records up to date?', pts: 20 },
  { q: 'Is your UCR registration current for this year?', pts: 15 },
  { q: 'Do you track Hours of Service / ELD records and review them weekly?', pts: 20 },
];

const OPTS = [
  { label: 'Yes, current', v: 1 },
  { label: 'Partially', v: 0.5 },
  { label: 'No / Not sure', v: 0 },
];

const RING_C = 351.8;

/* Interactive 60-second audit-readiness self-check — from the approved prototype. */
export default function AuditChecker() {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const max = QUESTIONS.reduce((a, q) => a + q.pts, 0);
  const got = Object.entries(answers).reduce(
    (a, [i, v]) => a + v * QUESTIONS[Number(i)].pts,
    0,
  );
  const pct = Math.round((got / max) * 100);
  const answered = Object.keys(answers).length > 0;

  const ringColor = !answered ? '#ffc61a' : pct >= 80 ? '#22c55e' : pct >= 50 ? '#ffc61a' : '#dc2626';
  const label = !answered
    ? 'Answer to see your level'
    : pct >= 80
      ? '🟢 Low Risk — Audit-Ready'
      : pct >= 50
        ? '🟡 Moderate Risk — Gaps to Close'
        : '🔴 High Risk — Act Before an Audit';
  const desc = !answered
    ? 'Tap an answer for each item. We’ll highlight your highest-impact fix first.'
    : pct >= 80
      ? 'Strong foundation. Keep your review cadence and document everything — consistency is what investigators reward.'
      : pct >= 50
        ? 'You have the basics, but incomplete files and programs are the most common audit findings. Close the “Partially” items first.'
        : 'Missing DQ files, testing programs, or maintenance records can become violations quickly. Start with question 1 and work down.';

  return (
    <section id="checker" style={{ background: 'var(--bg2)' }} className="py-16">
      <div className="wrap">
        <div className="sec-head">
          <div className="kicker">60-Second Self-Check</div>
          <h2>
            How audit-ready
            <br />
            <em>are you today?</em>
          </h2>
          <p>
            Answer honestly. This is education, not a scare tactic — you&rsquo;ll get a
            plain-English risk level and what to fix first.
          </p>
        </div>
        <div className="checker">
          <div>
            {QUESTIONS.map((item, i) => (
              <div key={item.q} className="q-card">
                <b>
                  {i + 1}. {item.q}
                </b>
                <div className="q-opts" role="group" aria-label={`Question ${i + 1}`}>
                  {OPTS.map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      className={'q-opt' + (answers[i] === o.v ? ' sel' : '')}
                      onClick={() => setAnswers((prev) => ({ ...prev, [i]: o.v }))}
                      aria-pressed={answers[i] === o.v}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <aside className="score-card" aria-live="polite">
            <div
              style={{
                fontSize: 11,
                letterSpacing: '.14em',
                fontWeight: 800,
                color: 'var(--muted)',
              }}
            >
              COMPLIANCE READINESS
            </div>
            <div className="ring">
              <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
                <circle className="ring-bg" cx="66" cy="66" r="56" />
                <circle
                  className="ring-fg"
                  cx="66"
                  cy="66"
                  r="56"
                  strokeDasharray={RING_C}
                  strokeDashoffset={answered ? RING_C - (RING_C * pct) / 100 : RING_C}
                  style={{ stroke: ringColor }}
                />
              </svg>
              <div className="ring-num">{answered ? `${pct}%` : '—'}</div>
            </div>
            <b style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 19 }}>{label}</b>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6 }}>{desc}</p>
            <Link className="btn btn-n" style={{ width: '100%' }} href="/checkout/compliance">
              Fix This For Me — Get Compliance Help →
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}

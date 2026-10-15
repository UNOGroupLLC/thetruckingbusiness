'use client';

import { useState } from 'react';

type Block = { h: number; label: string; kind: 'drive' | 'sleeper' | 'off' | 'onduty' };

interface Scenario {
  id: string;
  name: string;
  tag: string;
  blocks: Block[];
  what: string[];
  note: string;
}

const KIND_STYLE: Record<Block['kind'], { bg: string; fg: string; name: string }> = {
  drive: { bg: '#0a1a36', fg: '#fff', name: 'Driving' },
  sleeper: { bg: '#ffc61a', fg: '#0a1a36', name: 'Sleeper berth' },
  off: { bg: '#9fb3c8', fg: '#0a1a36', name: 'Off duty' },
  onduty: { bg: '#5b6a82', fg: '#fff', name: 'On duty (not driving)' },
};

const SCENARIOS: Scenario[] = [
  {
    id: 'eight-two',
    name: '8 / 2 split',
    tag: 'Most common',
    blocks: [
      { h: 4, label: 'Drive 4h', kind: 'drive' },
      { h: 8, label: 'Sleeper 8h', kind: 'sleeper' },
      { h: 3, label: 'Drive 3h', kind: 'drive' },
      { h: 2, label: 'Off duty 2h', kind: 'off' },
    ],
    what: [
      'The 8-hour sleeper break pauses your 14-hour window — those 8 hours don\u2019t count against it.',
      'After the 2-hour break, your 14-hour window restarts from the end of the 8-hour break.',
      'Your drive time going forward: 11 hours minus the 3 you drove between the breaks = 8 hours available.',
    ],
    note: 'Both breaks together total 10 hours, with one break of at least 7 in the sleeper berth — so the split is legal.',
  },
  {
    id: 'seven-three',
    name: '7 / 3 split',
    tag: 'Flexible',
    blocks: [
      { h: 5, label: 'Drive 5h', kind: 'drive' },
      { h: 7, label: 'Sleeper 7h', kind: 'sleeper' },
      { h: 2, label: 'Drive 2h', kind: 'drive' },
      { h: 3, label: 'Sleeper 3h', kind: 'sleeper' },
    ],
    what: [
      'Same idea as 8/2: the two breaks total 10 hours, one is at least 7 in the sleeper berth.',
      'The 3-hour second break can be sleeper berth, off duty, or a mix of the two.',
      'After the second break, the 14-hour window restarts from the end of the 7-hour break.',
    ],
    note: 'The 7/3 split gives you a shorter first break — handy when you only need a partial rest.',
  },
  {
    id: 'straight-ten',
    name: 'Straight 10-hour reset',
    tag: 'Simplest',
    blocks: [
      { h: 8, label: 'Drive 8h', kind: 'drive' },
      { h: 10, label: 'Sleeper 10h', kind: 'sleeper' },
    ],
    what: [
      'One continuous 10-hour break in the sleeper berth.',
      'Both your 11-hour driving clock and 14-hour window fully reset.',
      'Simplest option — no math. The splits above exist for when a full 10 doesn\u2019t fit the day.',
    ],
    note: 'When in doubt, the straight 10 is always compliant.',
  },
];

export default function SleeperBerthVisualizer() {
  const [active, setActive] = useState(SCENARIOS[0]);
  const total = active.blocks.reduce((s, b) => s + b.h, 0);

  return (
    <div style={{ fontFamily: "'Public Sans', Arial, sans-serif", color: '#0e1728' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s)}
            style={{
              border: '2px solid #0a1a36',
              borderRadius: 999,
              padding: '8px 18px',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: 'pointer',
              background: active.id === s.id ? '#0a1a36' : '#fff',
              color: active.id === s.id ? '#fff' : '#0a1a36',
            }}
          >
            {s.name}
            {s.tag && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  background: active.id === s.id ? '#ffc61a' : '#f0f3f7',
                  color: '#0a1a36',
                  borderRadius: 999,
                  padding: '2px 8px',
                }}
              >
                {s.tag}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div
        style={{
          display: 'flex',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #dde3ec',
          minHeight: 84,
        }}
        role="img"
        aria-label={`${active.name} timeline`}
      >
        {active.blocks.map((b, i) => {
          const st = KIND_STYLE[b.kind];
          return (
            <div
              key={i}
              style={{
                flexGrow: b.h,
                flexBasis: 0,
                background: st.bg,
                color: st.fg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 4px',
                borderRight: i < active.blocks.length - 1 ? '2px solid #fff' : 'none',
                minWidth: 0,
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>{b.label}</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{b.h}h</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#5b6a82', marginTop: 6 }}>
        <span>Start of day</span>
        <span>{total} hours shown</span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 12.5 }}>
        {Object.entries(KIND_STYLE).map(([k, st]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: st.bg, display: 'inline-block' }} />
            {st.name}
          </span>
        ))}
      </div>

      {/* Explanation */}
      <div style={{ marginTop: 18, background: '#f6f7f9', borderRadius: 12, padding: '18px 20px' }}>
        <h3 style={{ margin: '0 0 10px', color: '#0a1a36', fontSize: 15, fontWeight: 800 }}>
          What just happened
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.65 }}>
          {active.what.map((w, i) => (
            <li key={i} style={{ marginBottom: 6 }}>{w}</li>
          ))}
        </ul>
        <p style={{ margin: '12px 0 0', fontSize: 13.5, color: '#0a1a36', fontWeight: 600 }}>{active.note}</p>
      </div>

      {/* Rules */}
      <div style={{ marginTop: 14, border: '1px dashed #9fb3c8', borderRadius: 12, padding: '16px 20px' }}>
        <h3 style={{ margin: '0 0 8px', color: '#0a1a36', fontSize: 15, fontWeight: 800 }}>
          The split-sleeper rules (49 CFR 395.1(g))
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.65, color: '#0e1728' }}>
          <li>Two breaks totaling <strong>at least 10 hours</strong>.</li>
          <li>One break must be <strong>at least 7 consecutive hours in the sleeper berth</strong>.</li>
          <li>The other must be <strong>at least 2 consecutive hours</strong> — sleeper berth, off duty, or a mix.</li>
          <li>Qualifying break time <strong>doesn&apos;t count</strong> against your 14-hour window.</li>
        </ul>
      </div>

      <p style={{ fontSize: 12, color: '#5b6a82', marginTop: 12 }}>
        Simplified illustration — your ELD computes the exact clocks. Verify current rules at 49 CFR 395.1(g).
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { STATE_PATHS } from './sos-map-paths';

/**
 * Interactive US map: UCR participation by state.
 * 41 states participate (blue). 9 do not (gray): carriers based in those
 * states register through a neighboring participating state.
 * A dropdown covers small states and mobile users.
 */
const NON_PARTICIPATING = new Set(['AZ', 'FL', 'HI', 'MD', 'NV', 'NJ', 'OR', 'VT', 'WY']);

export default function UcrMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState('');

  const statusOf = (abbr: string) =>
    NON_PARTICIPATING.has(abbr) ? 'Does not participate' : 'Participates in UCR';

  const hoveredState = hovered ? STATE_PATHS.find((s) => s.abbr === hovered) : null;

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: '#0a1a36' }}>
          <span style={{ width: 16, height: 16, borderRadius: 0, background: '#0a1a36', display: 'inline-block' }} />
          Participates (41 states)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: '#0a1a36' }}>
          <span style={{ width: 16, height: 16, borderRadius: 0, background: '#9aa5b1', display: 'inline-block' }} />
          Does not participate (9 states)
        </span>
      </div>

      <svg
        viewBox="0 0 975 600"
        role="img"
        aria-label="Map of the United States showing which states participate in UCR."
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {STATE_PATHS.map((s) => {
          const out = NON_PARTICIPATING.has(s.abbr);
          const base = out ? '#9aa5b1' : '#0a1a36';
          return (
            <path
              key={s.abbr}
              d={s.d}
              onMouseEnter={() => setHovered(s.abbr)}
              onMouseLeave={() => setHovered(null)}
              style={{ transition: 'fill 0.15s' }}
              fill={hovered === s.abbr ? (out ? '#7c8794' : '#1e6bd6') : base}
              stroke="#ffffff"
              strokeWidth={1.2}
            >
              <title>
                {s.name} — {statusOf(s.abbr)}
              </title>
            </path>
          );
        })}
      </svg>

      {hoveredState ? (
        <p style={{ textAlign: 'center', fontWeight: 700, color: '#0a1a36', margin: '8px 0 0', minHeight: 24 }}>
          {hoveredState.name} — {statusOf(hoveredState.abbr)}
          {NON_PARTICIPATING.has(hoveredState.abbr) && (
            <span style={{ fontWeight: 400 }}> (register through a neighboring state)</span>
          )}
        </p>
      ) : (
        <div style={{ minHeight: 24 }} />
      )}

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <label htmlFor="ucr-state" style={{ fontWeight: 700, color: '#0a1a36', marginRight: 8 }}>
          Or pick your state:
        </label>
        <select
          id="ucr-state"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            padding: '10px 12px',
            fontSize: 16,
            borderRadius: 0,
            border: '2px solid #0a1a36',
            color: '#0a1a36',
            fontWeight: 600,
            maxWidth: '100%',
          }}
        >
          <option value="">Choose a state…</option>
          {STATE_PATHS.map((s) => (
            <option key={s.abbr} value={s.abbr}>
              {s.name} — {statusOf(s.abbr)}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <p style={{ textAlign: 'center', fontWeight: 700, color: '#0a1a36', marginTop: 8 }}>
          {STATE_PATHS.find((s) => s.abbr === selected)?.name}: {statusOf(selected)}
          {NON_PARTICIPATING.has(selected) &&
            ' — you still must register, through a neighboring participating state.'}
        </p>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { STATE_PATHS } from './sos-map-paths';
import { SOS_URLS } from './sos-map-urls';

/**
 * Interactive US map: click/tap a state to open its Secretary of State
 * (or equivalent) business-entity filing page in a new tab.
 * A dropdown covers small states and mobile users.
 */
export default function SosMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState('');

  const openState = (abbr: string) => {
    const url = SOS_URLS[abbr];
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <div>
      <svg
        viewBox="0 0 975 600"
        role="img"
        aria-label="Map of the United States. Select a state to open its business filing office."
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {STATE_PATHS.map((s) => (
          <path
            key={s.abbr}
            d={s.d}
            onMouseEnter={() => setHovered(s.abbr)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => openState(s.abbr)}
            style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
            fill={hovered === s.abbr ? '#1565a8' : '#0b2e4f'}
            stroke="#ffffff"
            strokeWidth={1.2}
          >
            <title>{s.name}</title>
          </path>
        ))}
      </svg>

      {hovered && (
        <p style={{ textAlign: 'center', fontWeight: 700, color: '#0b2e4f', margin: '8px 0 0', minHeight: 24 }}>
          {STATE_PATHS.find((s) => s.abbr === hovered)?.name} — click to open filing office
        </p>
      )}
      {!hovered && <div style={{ minHeight: 24 }} />}

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <label htmlFor="sos-state" style={{ fontWeight: 700, color: '#0b2e4f', marginRight: 8 }}>
          Or pick your state:
        </label>
        <select
          id="sos-state"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            if (e.target.value) openState(e.target.value);
          }}
          style={{
            padding: '10px 12px',
            fontSize: 16,
            borderRadius: 8,
            border: '2px solid #0b2e4f',
            color: '#0b2e4f',
            fontWeight: 600,
            maxWidth: '100%',
          }}
        >
          <option value="">Choose a state…</option>
          {STATE_PATHS.map((s) => (
            <option key={s.abbr} value={s.abbr}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

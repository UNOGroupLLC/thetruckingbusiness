'use client';

import { useState } from 'react';

interface Marking {
  id: string;
  label: string;
  sample: string;
  required: boolean;
  d: string;
}

const MARKINGS: Marking[] = [
  {
    id: 'name',
    label: 'Company name',
    sample: 'ACME TRUCKING LLC',
    required: true,
    d: 'Your legal name or single trade name, exactly as listed on your MCS-150. If another name appears on the truck, yours must be marked "operated by."',
  },
  {
    id: 'usdot',
    label: 'USDOT number',
    sample: 'USDOT 1234567',
    required: true,
    d: 'The number FMCSA issued you, preceded by the letters USDOT.',
  },
  {
    id: 'mc',
    label: 'MC number',
    sample: 'MC 123456',
    required: false,
    d: 'Not required by 49 CFR 390.21, but many carriers display it anyway.',
  },
  {
    id: 'gvwr',
    label: 'Gross vehicle weight',
    sample: 'GVWR 80,000',
    required: false,
    d: 'Not federally required on the door. Useful at scales and in states that ask.',
  },
  {
    id: 'unit',
    label: 'Truck unit number',
    sample: 'UNIT 07',
    required: false,
    d: 'Your own fleet number. Helpful for paperwork, not required by law.',
  },
  {
    id: 'city',
    label: 'City, State',
    sample: 'MIAMI, FL',
    required: false,
    d: 'Required decades ago, no longer federal. Some carriers still show it out of habit.',
  },
];

const NAVY = '#0a1a36';
const BLUE = '#1755a8';
const GRAY = '#5b6a82';
const LINE = '#dde3ec';
const GREEN = '#15803d';

export default function TruckMarkings() {
  const [active, setActive] = useState<string>('name');
  const current = MARKINGS.find((m) => m.id === active) ?? MARKINGS[0];

  const lineY: Record<string, number> = { name: 88, usdot: 112, mc: 136, gvwr: 160, unit: 184, city: 208 };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: NAVY }}>
      <svg viewBox="0 0 420 250" style={{ width: '100%', height: 'auto', display: 'block', background: '#f6f7f9', borderRadius: 12, border: `1px solid ${LINE}` }} role="img" aria-label="Diagram of truck door markings">
        {/* cab body */}
        <rect x="20" y="30" width="240" height="150" rx="14" fill="#ffffff" stroke={NAVY} strokeWidth="3" />
        {/* hood */}
        <rect x="260" y="90" width="110" height="90" rx="10" fill="#ffffff" stroke={NAVY} strokeWidth="3" />
        {/* windshield */}
        <polygon points="200,44 248,44 248,90 178,90" fill="#cfe0f1" stroke={NAVY} strokeWidth="2" />
        {/* door outline */}
        <rect x="60" y="60" width="150" height="165" rx="6" fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="7 5" />
        <text x="135" y="52" textAnchor="middle" fontSize="11" fill={BLUE} fontWeight="700">DRIVER DOOR</text>
        {/* wheels */}
        <circle cx="110" cy="195" r="26" fill={NAVY} />
        <circle cx="110" cy="195" r="11" fill="#ffffff" />
        <circle cx="310" cy="195" r="26" fill={NAVY} />
        <circle cx="310" cy="195" r="11" fill="#ffffff" />
        {/* ground */}
        <line x1="10" y1="222" x2="410" y2="222" stroke={LINE} strokeWidth="3" />

        {MARKINGS.map((m) => {
          const y = lineY[m.id];
          const isActive = m.id === active;
          return (
            <g key={m.id} onClick={() => setActive(m.id)} style={{ cursor: 'pointer' }}>
              {isActive && <rect x="66" y={y - 17} width="138" height="22" rx="5" fill={m.required ? '#e2f3e8' : '#e8f1fa'} />}
              <text
                x="135"
                y={y}
                textAnchor="middle"
                fontSize="13"
                fontWeight={isActive ? '800' : '600'}
                fill={isActive ? NAVY : GRAY}
              >
                {m.sample}
              </text>
              {m.required && (
                <circle cx="212" cy={y - 5} r="7" fill={GREEN} />
              )}
              {m.required && (
                <text x="212" y={y - 1} textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff">✓</text>
              )}
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 12 }}>
        {MARKINGS.map((m) => {
          const isActive = m.id === active;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(m.id)}
              style={{
                textAlign: 'left',
                border: `2px solid ${isActive ? BLUE : LINE}`,
                borderRadius: 10,
                background: isActive ? '#f0f6fd' : '#fff',
                padding: '8px 10px',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: NAVY }}>{m.label}</span>
              </span>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  color: '#fff',
                  background: m.required ? GREEN : GRAY,
                  borderRadius: 99,
                  padding: '2px 8px',
                }}
              >
                {m.required ? 'REQUIRED' : 'OPTIONAL'}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 10,
          border: `1px solid ${LINE}`,
          borderRadius: 10,
          padding: '10px 12px',
          background: '#fff',
          fontSize: 13.5,
          lineHeight: 1.55,
          color: GRAY,
        }}
      >
        <strong style={{ color: NAVY }}>{current.label}</strong> — {current.d}
      </div>

      <p style={{ fontSize: 12.5, color: GRAY, lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
        Federal rule (49 CFR 390.21): markings go on <strong>both sides</strong> of the power unit, in letters that{' '}
        <strong>contrast sharply</strong> with the background and are <strong>legible from 50 feet</strong> in daylight.
        Paint or vinyl decals both count. Kentucky no longer requires the KYU number to be displayed on the truck.
      </p>
    </div>
  );
}

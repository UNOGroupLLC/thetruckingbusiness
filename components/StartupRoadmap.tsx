'use client';

import { useEffect, useState } from 'react';

interface Step {
  t: string;
  cost: string;
  d: string;
  link?: { label: string; href: string };
}

const STEPS: Step[] = [
  {
    t: 'Form your business',
    cost: 'State fee varies',
    d: 'Form an LLC or corporation in your state before any DOT filing. This is the legal entity everything else attaches to.',
  },
  {
    t: 'Get your EIN',
    cost: 'Free',
    d: 'Your federal tax ID from the IRS. The online application takes minutes.',
    link: { label: 'Apply for an EIN with the IRS', href: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online' },
  },
  {
    t: 'USDOT number + MC authority',
    cost: '$300',
    d: 'Apply through the FMCSA MOTUS portal. Your USDOT number is free; the $300 MC filing fee is non-refundable.',
    link: { label: 'File in the MOTUS portal', href: 'https://motus.dot.gov/' },
  },
  {
    t: 'BOC-3 process agent',
    cost: '$30 to $75, one time',
    d: 'Your blanket agent files this for you. Refile if you change your business name, address, or agent.',
    link: { label: "FMCSA's process agent list", href: 'https://www.fmcsa.dot.gov/registration/process-agents' },
  },
  {
    t: 'Trucking insurance',
    cost: '$8,000 to $25,000, year one',
    d: 'Your MC authority cannot go active until your insurer files proof with FMCSA. Shop trucking specialists, not generalists.',
  },
  {
    t: 'UCR registration',
    cost: '$55 for 2027 (0 to 2 units)',
    d: 'Annual registration at ucr.gov. Registration opens October 1, file by December 31.',
    link: { label: 'Register at ucr.gov', href: 'https://www.ucr.gov/' },
  },
  {
    t: 'File Form 2290 (HVUT)',
    cost: '$550 per vehicle per year',
    d: 'Pay the Heavy Highway Vehicle Use Tax with the IRS. Your base state needs the stamped Schedule 1 before it will issue IRP plates, so do this first.',
    link: { label: 'File Form 2290 with the IRS', href: 'https://www.irs.gov/forms-pubs/about-form-2290' },
  },
  {
    t: 'IRP apportioned plates',
    cost: '$1,500 to $2,500',
    d: 'Apportioned registration through your base state, priced by weight and where you run. Bring your stamped 2290 Schedule 1.',
  },
  {
    t: 'IFTA license + decals',
    cost: 'Varies by state',
    d: 'Fuel tax license from your base state, with two decals for the cab doors. Quarterly returns follow: Apr 30, Jul 31, Oct 31, Jan 31.',
  },
  {
    t: 'Drug & alcohol consortium',
    cost: '$80 to $300 per year',
    d: 'Required for owner-operators. Every driver passes a pre-employment test before operating, then random tests run all year.',
  },
  {
    t: 'ELD',
    cost: 'Around $40/month',
    d: 'An FMCSA-registered electronic logging device in every truck, on a monthly subscription.',
    link: { label: "FMCSA's registered ELD list", href: 'https://eld.fmcsa.dot.gov/' },
  },
  {
    t: 'Driver qualification files',
    cost: 'A few hundred dollars setup',
    d: 'A complete DQ file for every driver before anyone gets behind the wheel. Ten required documents.',
    link: { label: 'See the full DQ checklist', href: '/resources/blog/how-to-start-a-trucking-company' },
  },
  {
    t: 'Annual DOT inspection',
    cost: '$50 to $125',
    d: 'Every truck must pass a periodic inspection at least once every 12 months (49 CFR 396.17). Keep the report or decal on the truck. Some states also require a current inspection at IRP registration.',
  },
  {
    t: 'Mark your truck',
    cost: 'About $20 to $100',
    d: 'Company name and USDOT number on both doors, in contrasting letters legible from 50 feet. Required by 49 CFR 390.21 before you roll.',
  },
  {
    t: 'Pack your DOT folder',
    cost: 'Free (paperwork)',
    d: 'CDL, ELD packet with 8 blank logs, last DVIR, inspection reports, IRP cab card, IFTA license, lease or rental agreement, medical variance if any, BOLs, and state permits. Keep it in the cab.',
  },
];

const NAVY = '#0a1a36';
const BLUE = '#1755a8';
const GRAY = '#5b6a82';
const LINE = '#dde3ec';

export default function StartupRoadmap() {
  const [open, setOpen] = useState<number | null>(0);
  const [done, setDone] = useState<boolean[]>(() => STEPS.map(() => false));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('ttb-startup-roadmap');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length === STEPS.length) setDone(arr);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem('ttb-startup-roadmap', JSON.stringify(done));
    } catch {
      /* ignore */
    }
  }, [done, ready]);

  const count = done.filter(Boolean).length;
  const pct = Math.round((count / STEPS.length) * 100);

  const toggleDone = (i: number) => {
    setDone((prev) => prev.map((v, j) => (j === i ? !v : v)));
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: NAVY }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: GRAY }}>
            {count} of {STEPS.length} steps complete
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: BLUE }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 0, background: LINE, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 0,
              background: `linear-gradient(90deg, ${BLUE}, #15803d)`,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {STEPS.map((s, i) => {
          const isOpen = open === i;
          const isDone = done[i];
          return (
            <li
              key={s.t}
              style={{
                border: `1px solid ${LINE}`,
                borderRadius: 0,
                marginBottom: 8,
                background: isDone ? '#f0f7f2' : '#fff',
                overflow: 'hidden',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpen(isOpen ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setOpen(isOpen ? null : i);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <button
                  type="button"
                  aria-label={isDone ? `Mark step ${i + 1} not done` : `Mark step ${i + 1} done`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDone(i);
                  }}
                  style={{
                    flex: '0 0 auto',
                    width: 26,
                    height: 26,
                    borderRadius: 0,
                    border: isDone ? `2px solid #15803d` : `2px solid ${LINE}`,
                    background: isDone ? '#15803d' : '#fff',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isDone ? '✓' : ''}
                </button>
                <span
                  style={{
                    flex: '0 0 auto',
                    width: 26,
                    height: 26,
                    borderRadius: 0,
                    background: isDone ? '#d9e9de' : NAVY,
                    color: isDone ? '#15803d' : '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13.5,
                      fontWeight: 700,
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: isDone ? GRAY : NAVY,
                    }}
                  >
                    {s.t}
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 3,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: BLUE,
                      background: '#e8f1fa',
                      borderRadius: 0,
                      padding: '2px 8px',
                    }}
                  >
                    {s.cost}
                  </span>
                </span>
                <span style={{ color: GRAY, fontSize: 16, flex: '0 0 auto' }}>{isOpen ? '▾' : '▸'}</span>
              </div>
              {isOpen && (
                <div style={{ padding: '0 12px 12px 74px', fontSize: 13.5, color: GRAY, lineHeight: 1.5 }}>
                  <p style={{ margin: '0 0 8px' }}>{s.d}</p>
                  {s.link && (
                    <a
                      href={s.link.href}
                      target={s.link.href.startsWith('/') ? undefined : '_blank'}
                      rel="noopener"
                      style={{ color: BLUE, fontWeight: 700, textDecoration: 'underline' }}
                    >
                      {s.link.label} →
                    </a>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

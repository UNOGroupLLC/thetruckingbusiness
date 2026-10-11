'use client';

import { useMemo, useState } from 'react';
import { saveCallBooking } from '@/lib/store';

interface Props {
  orderId: string;
  /** Continue to the fulfillment summary (used after booking or skipping). */
  onDone: () => void;
}

/** Next N business days (Mon–Fri), starting tomorrow. */
function nextBusinessDays(count: number): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (days.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** 30-minute slots, 9:00 AM – 4:30 PM Eastern. */
const SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 16; h++) {
    for (const m of [0, 30]) {
      const hour12 = h > 12 ? h - 12 : h;
      out.push(`${hour12}:${m === 0 ? '00' : '30'} ${h >= 12 ? 'PM' : 'AM'}`);
    }
  }
  return out;
})();

function fmtDay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtLong(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function ScheduleCall({ orderId, onDone }: Props) {
  const days = useMemo(() => nextBusinessDays(10), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  const [booked, setBooked] = useState<{ date: string; time: string } | null>(null);

  function confirm() {
    if (slot === null) return;
    const day = days[dayIdx];
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
      day.getDate()
    ).padStart(2, '0')}`;
    const time = SLOTS[slot];
    saveCallBooking(orderId, iso, time);
    // Phase 2: also create a real calendar event + send the invite email here.
    setBooked({ date: iso, time });
  }

  if (booked) {
    return (
      <div className="card text-center">
        <p aria-hidden="true" className="text-4xl">📅</p>
        <h2 className="mt-3 text-xl font-extrabold text-navy">Your call is scheduled</h2>
        <p className="mt-2 text-steel">
          <span className="font-bold text-charcoal">{fmtLong(booked.date)}</span> at{' '}
          <span className="font-bold text-charcoal">{booked.time} Eastern</span>
        </p>
        <p className="mt-2 text-sm text-steel">
          We&apos;ll call you at the phone number from your intake form. A calendar invite is on its way to your email.
        </p>
        <button onClick={onDone} className="btn-primary mt-6 w-full">
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-extrabold text-navy">Pick a date</h2>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {days.map((d, i) => (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => {
              setDayIdx(i);
              setSlot(null);
            }}
            className={`min-w-[76px] rounded-xl border px-3 py-2 text-center transition ${
              i === dayIdx
                ? 'border-navy bg-navy text-white'
                : 'border-slate-200 bg-white text-charcoal hover:border-navy'
            }`}
            aria-pressed={i === dayIdx}
          >
            <span className="block text-xs font-semibold uppercase">{fmtDay(d)}</span>
            <span className="block text-sm font-bold">{fmtDate(d)}</span>
          </button>
        ))}
      </div>

      <h2 className="mt-6 text-xl font-extrabold text-navy">Pick a time <span className="text-sm font-semibold text-steel">(Eastern)</span></h2>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {SLOTS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setSlot(i)}
            className={`rounded-xl border px-2 py-2 text-sm font-semibold transition ${
              i === slot
                ? 'border-navy bg-navy text-white'
                : 'border-slate-200 bg-white text-charcoal hover:border-navy'
            }`}
            aria-pressed={i === slot}
          >
            {t}
          </button>
        ))}
      </div>

      <button onClick={confirm} disabled={slot === null} className="btn-primary mt-6 w-full disabled:opacity-40">
        Schedule my call
      </button>
      <button onClick={onDone} className="mt-3 w-full text-center text-sm font-semibold text-steel underline">
        Skip for now — no call needed
      </button>
      <p className="mt-3 text-center text-xs text-steel">
        Demo only — in production this books a real slot on our calendar and emails you an invite.
      </p>
    </div>
  );
}

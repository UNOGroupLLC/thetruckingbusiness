'use client';

import { useMemo, useState } from 'react';
import { saveCallBooking, getCallBooking } from '@/lib/store';
import { syncBooking, type SyncOrderInfo } from '@/lib/sync';

interface Props {
  orderId: string;
  /** Customer/order details for the owner notification email (optional in demo). */
  order?: SyncOrderInfo;
  /** Continue to the fulfillment summary (used after booking or skipping). */
  onDone: () => void;
}

/* ------------------------------------------------------------------ */
/* OWNER SETTINGS — change your availability here.                     */
/* ------------------------------------------------------------------ */
const DAY_START_HOUR = 9; // first slot shown each day (9 AM)
const DAY_END_HOUR = 17; // last slot shown each day (5 PM)
const AVAILABLE_FROM_HOUR = 11; // first bookable slot (11 AM)
const AVAILABLE_TO_HOUR = 15; // last bookable slot (3 PM)
const DAYS_AHEAD = 10; // number of bookable business days shown
/* ------------------------------------------------------------------ */

interface SlotDef {
  label: string;
  available: boolean;
}

/** Hourly slots across the day; only the owner's window is bookable. One client per slot. */
function buildSlots(): SlotDef[] {
  const out: SlotDef[] = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    const hour12 = h > 12 ? h - 12 : h;
    const label = `${hour12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    out.push({ label, available: h >= AVAILABLE_FROM_HOUR && h <= AVAILABLE_TO_HOUR });
  }
  return out;
}

/** Next N business days (Mon–Fri), starting tomorrow. */
function nextBusinessDays(count: number): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1); // tomorrow is the first available day
  while (days.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

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

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ScheduleCall({ orderId, order, onDone }: Props) {
  const days = useMemo(() => nextBusinessDays(DAYS_AHEAD), []);
  const slots = useMemo(() => buildSlots(), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [slotIdx, setSlotIdx] = useState<number | null>(null);
  const existing = useMemo(() => getCallBooking(orderId), [orderId]);
  const [booked, setBooked] = useState<{ date: string; time: string } | null>(
    existing ? { date: existing.date, time: existing.time } : null
  );

  function confirm() {
    if (slotIdx === null || !slots[slotIdx].available) return;
    const date = isoDay(days[dayIdx]);
    const time = slots[slotIdx].label;
    saveCallBooking(orderId, date, time);
    // Phase 2: persist server-side + notify the owner (best-effort).
    if (order) syncBooking(orderId, order, date, time);
    // Phase 2: also create a real calendar event + send the invite email here.
    // The backend must enforce one booking per slot (no double-booking).
    setBooked({ date, time });
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
              setSlotIdx(null);
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

      <h2 className="mt-6 text-xl font-extrabold text-navy">
        Pick a time <span className="text-sm font-semibold text-steel">(Eastern — one client per hour)</span>
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((s, i) => (
          <button
            key={s.label}
            type="button"
            disabled={!s.available}
            onClick={() => setSlotIdx(i)}
            className={`rounded-xl border px-2 py-2 text-center transition ${
              !s.available
                ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                : i === slotIdx
                  ? 'border-navy bg-navy text-white'
                  : 'border-slate-200 bg-white text-charcoal hover:border-navy'
            }`}
            aria-pressed={i === slotIdx}
            aria-disabled={!s.available}
          >
            <span className="block text-sm font-semibold">{s.label}</span>
            {!s.available && <span className="block text-[11px] font-medium">Booked</span>}
          </button>
        ))}
      </div>

      <button onClick={confirm} disabled={slotIdx === null} className="btn-primary mt-6 w-full disabled:opacity-40">
        Schedule my call
      </button>
      <button onClick={onDone} className="mt-3 w-full text-center text-sm font-semibold text-steel underline">
        Skip for now — no call needed
      </button>
    </div>
  );
}

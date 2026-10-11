'use client';

import Link from 'next/link';
import { useTtb, formatUSD, formatDate, getCallBooking, getPackage } from '@/lib/store';
import type { IntakeStatus, OrderRecord } from '@/lib/store';

const STEPS = [
  'Order confirmed',
  'Intake submitted',
  'Certified final',
  'Filing in progress',
  'Complete',
];

function pillFor(status: IntakeStatus | undefined): { label: string; cls: string } {
  switch (status) {
    case 'submitted':
      return { label: 'Intake submitted', cls: 'bg-amber-100 text-amber-800' };
    case 'corrected':
      return { label: 'Correction saved', cls: 'bg-amber-100 text-amber-800' };
    case 'certified':
      return { label: 'Certified final', cls: 'bg-green-100 text-green-800' };
    case 'filing':
      return { label: 'Filing in progress', cls: 'bg-blue-100 text-blue-800' };
    default:
      return { label: 'Intake pending', cls: 'bg-amber-100 text-amber-800' };
  }
}

/** doneCount = steps fully complete; current = highlighted in-progress step index (-1 if none). */
function stepPlan(status: IntakeStatus | undefined): { doneCount: number; current: number } {
  switch (status) {
    case 'submitted':
    case 'corrected':
      return { doneCount: 2, current: -1 };
    case 'certified':
      return { doneCount: 3, current: -1 };
    case 'filing':
      return { doneCount: 3, current: 3 };
    default:
      return { doneCount: 1, current: -1 };
  }
}

function Timeline({ status }: { status: IntakeStatus | undefined }) {
  const { doneCount, current } = stepPlan(status);
  return (
    <div className="grid grid-cols-5" role="list" aria-label="Order progress">
      {STEPS.map((label, i) => {
        const done = i < doneCount;
        const isCurrent = i === current;
        const connectorDone = i < doneCount || i === current;
        return (
          <div key={label} role="listitem" className="relative flex flex-col items-center px-1">
            {i > 0 && (
              <div
                aria-hidden
                className={`absolute left-[-50%] right-1/2 top-4 h-0.5 ${
                  connectorDone ? 'bg-navy' : 'bg-slate-200'
                }`}
              />
            )}
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${
                done
                  ? 'bg-navy text-white'
                  : isCurrent
                    ? 'bg-[#FFC400] text-[#0A1830] ring-4 ring-[#FFC400]/25'
                    : 'bg-slate-200 text-slate-400'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span
              className={`mt-2 text-center text-[11px] font-semibold leading-tight ${
                done || isCurrent ? 'text-navy' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function parseTimeTo24h(time: string): { hh: number; mm: number } {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return { hh: 11, mm: 0 };
  let hh = parseInt(m[1], 10) % 12;
  const mm = parseInt(m[2], 10);
  if (/pm/i.test(m[3])) hh += 12;
  return { hh, mm };
}

/** Google Calendar template link for a 1-hour floating-time slot. */
function gcalLink(date: string, time: string, orderId: string): string {
  const { hh, mm } = parseTimeTo24h(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = date.replace(/-/g, '');
  const start = `${d}T${pad(hh)}${pad(mm)}00`;
  const endHh = hh + 1 < 24 ? hh + 1 : 23;
  const end = `${d}T${pad(endHh)}${pad(mm)}00`;
  const text = encodeURIComponent('TheTruckingBusiness.com kickoff call');
  const details = encodeURIComponent(
    `Kickoff call for order ${orderId}. We will call you at the phone number on your intake.`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
}

function CallCard({ orderId }: { orderId: string }) {
  const booking = getCallBooking(orderId);
  if (!booking) return null;
  return (
    <div className="mt-5 rounded-2xl bg-[#0A1830] p-6 text-white md:p-7">
      <p className="text-base font-extrabold">Your kickoff call</p>
      <p className="mt-2 text-2xl font-extrabold text-[#FFC400]">
        {formatDate(booking.date)} · {booking.time} ET
      </p>
      <p className="mt-2 text-sm text-slate-300">
        We&rsquo;ll call you at the phone number on your intake. Have your login.gov access ready.
      </p>
      <a
        href={gcalLink(booking.date, booking.time, orderId)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFC400] px-6 py-3 text-base font-bold text-[#0A1830] transition hover:brightness-95"
      >
        Add to Google Calendar
      </a>
    </div>
  );
}

function DocumentsCard({ order }: { order: OrderRecord }) {
  const pkg = getPackage(order.packageSlug);
  const expected = pkg?.expectedDocuments ?? [];
  if (expected.length === 0) return null;
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
      <h3 className="text-lg font-extrabold text-navy">Your documents</h3>
      <p className="mt-1 text-sm text-steel">
        Filed paperwork appears here as we complete each step.
      </p>
      <ul className="mt-3 divide-y divide-slate-100">
        {expected.map((slot) => {
          const doc = order.documents?.find((d) => d.slotKey === slot.key);
          return (
            <li key={slot.key} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-navy">{slot.label}</p>
                {doc && (
                  <p className="text-xs text-steel">
                    {doc.fileName} · uploaded {formatDate(doc.uploadedAt)}
                  </p>
                )}
              </div>
              {doc && doc.dataUrl ? (
                <a
                  href={doc.dataUrl}
                  download={doc.fileName}
                  className="shrink-0 text-sm font-bold text-dotblue hover:underline"
                >
                  Download
                </a>
              ) : slot.auto ? (
                <span className="shrink-0 text-sm text-steel">Included with your purchase</span>
              ) : (
                <span className="shrink-0 text-sm text-slate-400">Coming soon</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OrderCard({ order }: { order: OrderRecord }) {
  const pill = pillFor(order.intakeStatus);
  const locked = order.intakeStatus === 'certified' || order.intakeStatus === 'filing';
  const intakeHref = `/intake/${order.intakeService}?order=${order.id}`;
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-navy">{order.packageName}</h3>
          <p className="mt-1 text-sm text-steel">
            Order {order.id} · {formatDate(order.createdAt)} · {formatUSD(order.amount)}
            {order.optionLabel ? ` · ${order.optionLabel}` : ''}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${pill.cls}`}>{pill.label}</span>
      </div>

      <div className="mt-6">
        <Timeline status={order.intakeStatus} />
      </div>

      {locked ? (
        <div className="mt-6">
          <div className="rounded-xl border border-dashed border-slate-300 bg-mist px-4 py-3 text-sm text-steel">
            Your intake was certified final and is now locked while we file. Need a change? Contact
            us.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={intakeHref} className="btn-dark">
              View certified intake
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={intakeHref} className="btn-dark">
            Your intake form
          </Link>
        </div>
      )}

      <CallCard orderId={order.id} />
      <DocumentsCard order={order} />
    </div>
  );
}

export default function PortalDashboardPage() {
  const { portalEmail, orders } = useTtb();

  if (!portalEmail) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">Please log in</h1>
        <p className="mt-2 text-steel">Your client portal needs an email login first.</p>
        <Link href="/portal/login" className="btn-dark mt-6">
          Go to login
        </Link>
      </div>
    );
  }

  const myOrders = orders.filter(
    (o) => o.buyerEmail.toLowerCase() === portalEmail.toLowerCase()
  );
  const firstName = myOrders[0]?.buyerName?.split(' ')[0];

  return (
    <div className="bg-mist py-12">
      <div className="mx-auto max-w-5xl px-4">
        <p className="eyebrow">Client portal</p>
        <h1 className="mt-2 text-3xl font-extrabold text-navy md:text-4xl">
          Welcome back{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-2 text-steel">
          Everything about your trucking setup lives here — your orders, your intake, your call,
          and your filing documents.
        </p>

        {myOrders.length === 0 ? (
          <div className="card mt-8">
            <p className="text-sm text-steel">
              No orders linked to {portalEmail} yet. Complete a purchase and your orders, intake,
              and documents will appear here.
            </p>
            <Link href="/pricing" className="btn-dark mt-4">
              View packages
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {myOrders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

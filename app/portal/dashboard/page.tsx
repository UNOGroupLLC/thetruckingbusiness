'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  useTtb,
  formatUSD,
  formatDate,
  getCallBooking,
  getPackage,
  getPortalToken,
  setPortalToken,
  mergeServerOrders,
} from '@/lib/store';
import type { IntakeStatus, OrderRecord } from '@/lib/store';
import { fetchWithTimeout } from '@/lib/sync';

/**
 * CLIENT PORTAL: presentation rebuilt to the approved portal mockup v1
 * (order switcher rail, one order at a time, read-only filing information,
 * self-serve greeting name). All data logic is unchanged: orders come from
 * the local store merged with GET /api/portal/orders on mount.
 * Type system (v6, same as the admin): Libre Franklin, five sizes only:
 * 20 / 15 / 13.5 / 12.5 / 11. Weights 600 and 800 over a 400 base.
 */

const NAVY = '#0a1a36';
const MUTED = '#5b6a82';
const LINE = '#dde3ec';
const YELLOW = '#ffc61a';
const T_TITLE = 'text-[20px] font-extrabold tracking-[-0.01em]';
const T_CARD = 'text-[15px] font-extrabold';
const T_BODY = 'text-[13.5px]';
const T_SMALL = 'text-[12.5px]';
const T_LABEL = 'text-[11px] font-extrabold uppercase tracking-[0.08em]';
const PILL = 'rounded-none px-[10px] py-[3px] text-[11px] font-extrabold';

const SUPPORT_PHONE = '+1 (725) 244-6771';
const SUPPORT_EMAIL = 'hello@thetruckingbusiness.com';

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
      // The first submission is certified by the signature inside the form
      // itself, so a submitted intake reads as certified final. The
      // separate certification only exists after a correction.
      return { label: 'Certified final', cls: 'bg-green-100 text-green-800' };
    case 'corrected':
      return { label: 'Correction saved', cls: 'bg-amber-100 text-amber-800' };
    case 'certified':
      return { label: 'Certified final', cls: 'bg-green-100 text-green-800' };
    case 'filing':
      return { label: 'Filing in progress', cls: 'bg-sky-100 text-sky-800' };
    default:
      return { label: 'Intake pending', cls: 'bg-amber-100 text-amber-800' };
  }
}

function payPillFor(order: OrderRecord): { label: string; cls: string } {
  if (order.payStatus === 'refunded')
    return { label: 'Refunded', cls: 'bg-red-100 text-red-800' };
  if (order.payStatus === 'cancelled')
    return { label: 'Cancelled', cls: 'bg-slate-200 text-slate-700' };
  return { label: 'Paid', cls: 'bg-green-100 text-green-800' };
}

/** doneCount = steps fully complete; current = highlighted in-progress step index (-1 if none). */
function stepPlan(status: IntakeStatus | undefined): { doneCount: number; current: number } {
  switch (status) {
    case 'submitted':
      // Certified at submission (the form's own signature), so steps 1 to 3
      // are done and Filing in progress is the active step.
      return { doneCount: 3, current: 3 };
    case 'corrected':
      // A correction is saved; the client still owes the certification, so
      // Certified final is the step in progress.
      return { doneCount: 2, current: 2 };
    case 'certified':
      return { doneCount: 3, current: 3 };
    case 'filing':
      return { doneCount: 3, current: 3 };
    default:
      return { doneCount: 1, current: -1 };
  }
}

function Timeline({
  status,
  completed,
}: {
  status: IntakeStatus | undefined;
  completed?: boolean;
}) {
  // A completed order lights all five steps, including Complete.
  const { doneCount, current } = completed
    ? { doneCount: STEPS.length, current: -1 }
    : stepPlan(status);
  // The progress line runs between the first and last step centers. It fills
  // up to the furthest step reached: a finished step, or the step in
  // progress. Intake pending means only step one is done, so the fill is 0%.
  const furthest = current >= 0 ? current : doneCount - 1;
  const fillPct = Math.max(0, Math.min(100, (furthest / (STEPS.length - 1)) * 100));
  return (
    <div className="relative mt-5" role="list" aria-label="Order progress">
      <div
        aria-hidden
        className="absolute left-[10%] right-[10%] top-[15px] h-[3px] rounded-none bg-[#e6ebf2]"
      >
        <div
          className="h-full rounded-none"
          style={{ width: `${fillPct}%`, background: NAVY }}
        />
      </div>
      <div className="relative z-[1] grid grid-cols-5">
        {STEPS.map((label, i) => {
          const done = i < doneCount;
          const isCurrent = i === current;
          return (
            <div key={label} role="listitem" className="text-center">
              <span
                className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-full text-[12.5px] font-extrabold ${
                  done
                    ? 'text-white'
                    : isCurrent
                      ? 'shadow-[0_0_0_4px_rgba(255,198,26,0.25)]'
                      : 'bg-[#e6ebf2]'
                }`}
                style={
                  done
                    ? { background: NAVY }
                    : isCurrent
                      ? { background: YELLOW, color: NAVY }
                      : { color: MUTED }
                }
              >
                {done ? '✓' : i + 1}
              </span>
              <p
                className="mt-[6px] text-[11px]"
                style={{
                  fontWeight: done || isCurrent ? 800 : 600,
                  color: done || isCurrent ? NAVY : MUTED,
                }}
              >
                {label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- What happens next --------------------------- */

function NextSteps({ order }: { order: OrderRecord }) {
  const status = order.intakeStatus;
  const intakeHref = `/intake/${order.intakeService}?order=${order.id}`;
  let next: { title: string; text: string; cta?: { label: string; href: string } };
  let then: { title: string; text: string };
  const finallyStep = {
    title: 'Your documents land here',
    text: 'Finished paperwork appears under Your documents with a download, and we email you too.',
  };
  if (order.completedAt) {
    next = {
      title: 'Your order is complete',
      text: `Your ${order.packageName} is finished. Your documents are below, ready to download.`,
      cta: { label: 'View my documents', href: '#documents' },
    };
    then = {
      title: 'Everything is saved',
      text: 'Your order, your intake, and your documents stay here in your portal whenever you need them.',
    };
  } else if (!status) {
    next = {
      title: 'Complete your intake',
      text: 'A few minutes of questions so we can start on your order.',
      cta: { label: 'Go to my intake form', href: intakeHref },
    };
    then = {
      title: 'We prepare your filing',
      text: 'Our team checks your answers and prepares everything your package includes.',
    };
  } else if (status === 'submitted') {
    // The first submission is already authorized by the intake's own
    // confirm step, so there is nothing left for the client to certify.
    // Certification only exists after the client uses their correction.
    next = {
      title: 'We are preparing your filing',
      text: 'Your intake is in. Our team is putting your filing together now, and we will email you if we need anything else.',
      cta: { label: 'View my intake', href: intakeHref },
    };
    then = {
      title: 'We submit your filing',
      text: 'Once it is ready, our team sends your filing to the agency.',
    };
  } else if (status === 'corrected') {
    next = {
      title: 'Certify your answers',
      text: 'Review your intake and certify it as final so we can file for you.',
      cta: { label: 'Review my intake', href: intakeHref },
    };
    then = {
      title: 'We submit your filing',
      text: 'Once your answers are certified, our team sends your filing to the agency.',
    };
  } else if (status === 'certified') {
    next = {
      title: 'We are preparing your filing',
      text: 'Your answers are certified final. Our team is putting your filing together now.',
      cta: { label: 'View certified intake', href: intakeHref },
    };
    then = {
      title: 'We submit your filing',
      text: 'We send it to the agency and track it from there.',
    };
  } else {
    next = {
      title: 'Your filing is with the agency',
      text: 'We have submitted it, and we are tracking it for you.',
      cta: { label: 'View certified intake', href: intakeHref },
    };
    then = {
      title: 'We confirm the result',
      text: 'As soon as the agency finishes, we collect your confirmation documents.',
    };
  }
  const cells: {
    label: string;
    title: string;
    text: string;
    cta?: { label: string; href: string };
  }[] = [
    { label: 'NEXT STEP', ...next },
    { label: 'THEN', ...then },
    { label: 'FINALLY', ...finallyStep },
  ];
  return (
    <div
      className="mt-[18px] grid gap-3 border-t pt-[14px] sm:grid-cols-3"
      style={{ borderColor: '#eef1f6' }}
    >
      {cells.map((c) => (
        <div key={c.label}>
          <p className={T_LABEL} style={{ color: MUTED }}>
            {c.label}
          </p>
          <p className={`${T_BODY} mt-[5px] font-extrabold`} style={{ color: NAVY }}>
            {c.title}
          </p>
          <p className={`${T_SMALL} mt-[3px]`} style={{ color: MUTED }}>
            {c.text}
          </p>
          {c.cta && (
            <Link
              href={c.cta.href}
              className="mt-[9px] inline-block rounded-none px-[13px] py-2 text-[12.5px] font-extrabold text-white transition hover:brightness-125"
              style={{ background: NAVY }}
            >
              {c.cta.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Kickoff call ----------------------------- */

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

function bookingDayLabel(date: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return formatDate(date);
  }
}

function CallCard({ order }: { order: OrderRecord }) {
  const booking = order.booking ?? getCallBooking(order.id);
  if (!booking) return null;
  return (
    <div className="mt-[14px] rounded-none p-[18px]" style={{ background: NAVY }}>
      <p className={`${T_CARD} text-white`}>Your kickoff call</p>
      <p className={`${T_TITLE} mt-[6px]`} style={{ color: YELLOW }}>
        {bookingDayLabel(booking.date)} · {booking.time} ET
      </p>
      <p className={`${T_SMALL} mt-[6px]`} style={{ color: '#cbd8f0' }}>
        We will call you at the phone number on your intake. Have your login.gov access ready.
      </p>
      <a
        href={gcalLink(booking.date, booking.time, order.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block rounded-none px-[14px] py-[9px] text-[12.5px] font-extrabold transition hover:brightness-105"
        style={{ background: YELLOW, color: NAVY }}
      >
        Add to Google Calendar
      </a>
    </div>
  );
}

/* --------------------------- Filing information -------------------------- */

// Summary labels for intake answers, in the order the intake forms ask them.
// Confirmations, authorizations, and the signature itself are not filing
// data rows, so they stay out of this list on purpose.
const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Cell phone',
  legalName: 'Legal business name',
  companyName: 'Company name',
  dba: 'DBA / trade name',
  structure: 'Business structure',
  formationState: 'State where the business is registered',
  ein: 'EIN',
  street: 'Street address',
  city: 'City',
  state: 'State',
  zip: 'ZIP code',
  mailingSame: 'Mailing address same as above',
  mailingStreet: 'Mailing street address',
  mailingCity: 'Mailing city',
  mailingState: 'Mailing state',
  mailingZip: 'Mailing ZIP code',
  hasDot: 'Has a USDOT number',
  dotNumber: 'USDOT number',
  usdot: 'USDOT number',
  mc: 'MC number',
  cargoType: 'Cargo type',
  carrierType: 'Carrier type',
  operation: 'Operation type',
  trucks: 'Number of trucks (power units)',
  drivers: 'Number of drivers',
  driverDetails: 'Driver details for consortium enrollment',
  statesNeeded: 'State permits needed',
  hasAccount: 'Clearinghouse account established',
  driverName: 'Driver full name',
  cdlNumber: 'CDL number',
  cdlState: 'CDL issuing state',
  ucr: 'UCR registration status',
  ifta: 'IFTA account status',
  eld: 'ELD provider',
  audit: 'Safety audit history',
  affiliated: 'Connected to another trucking company in the last 3 years',
  affiliateName: 'Affiliated company name',
  affiliateMc: 'Affiliated MC number',
  insuranceStatus: 'Insurance status',
  operationState: 'State you operate in',
  mcNumber: 'MC number',
  reason: 'Why the DOT number was deactivated',
  stillOperating: 'Still operating',
  cargo: 'Cargo hauled',
  hazmat: 'Hazardous materials',
  annualMiles: 'Total miles driven last year',
  isContact: 'Is the compliance contact',
  contactName: 'Compliance contact name',
  contactEmail: 'Compliance contact email',
  driverRoster: 'Driver roster',
  chAccount: 'Clearinghouse account established',
  designationStatus: 'C/TPA designation status',
  queryPlan: 'Query plan or balance',
  driverDob: 'Driver date of birth',
  driverIs: 'This driver is',
  consentStatus: 'Driver consent signed',
  consentTimeframe: 'Driver consent timeframe',
  title: 'Officer title',
  logingov: 'Has a Login.gov account',
  bestTime: 'Best time to reach you',
  role: 'Your role',
  derSame: 'DER is the same person as you',
  derName: 'DER full name',
  derEmail: 'DER email',
  derPhone: 'DER phone',
  designationChoice: 'C/TPA designation',
  existingAccounts: 'Existing state account numbers',
  vehicles: 'Vehicle details (Oregon)',
  carrierOperation: 'Carrier operation',
  trailers: 'Number of trailers',
  cdlDrivers: 'Drivers holding a CDL',
  auditType: 'Type of audit',
  auditAgency: 'Auditing agency',
  auditDate: 'Audit date',
  recordsDq: 'Driver qualification files ready',
  recordsMaint: 'Vehicle maintenance records ready',
  recordsDa: 'Drug and alcohol records ready',
  recordsHos: 'Hours of service records ready',
  recordsNone: 'No records ready yet',
};
const FIELD_ORDER = Object.keys(FIELD_LABELS);
const HIDDEN_FIELDS = new Set([
  'confirmTrue',
  'poaAuth',
  'consortiumAuth',
  'permitAuth',
  'motusAuth',
  'queryAuth',
  'mcs150Auth',
  'feeNote',
  'verifyAck',
  'signature',
  'signDate',
  'intraAuth',
  'reinstateAuth',
  'ucrAuth',
  'auditPlusAuth',
  'setupAuth',
  'designationAck',
  'designationAckSetup',
  'consortiumEnrollAuth',
  'filingAuth',
]);

function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function displayValue(v: string): string {
  if (v === 'true') return 'Yes';
  if (v === 'false') return 'No';
  return v;
}

function FilingInfoCard({ order }: { order: OrderRecord }) {
  const intake = order.intake;
  const entries = intake
    ? Object.entries(intake)
        .filter(([k, v]) => !HIDDEN_FIELDS.has(k) && typeof v === 'string' && v.trim() !== '')
        .sort(([a], [b]) => {
          const ia = FIELD_ORDER.indexOf(a);
          const ib = FIELD_ORDER.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        })
    : [];
  const lastVersion = order.intakeVersions?.[order.intakeVersions.length - 1];
  const certifiedName = lastVersion?.certifiedName ?? intake?.signature;
  const certifiedDateRaw = lastVersion?.certifiedDate ?? intake?.signDate;
  // 'submitted' counts as certified: the intake's own signature certified
  // it (name and date fall back to that signature above). 'corrected' does
  // not count, because corrected answers are only certified once the client
  // certifies them on the review screen.
  const certified =
    (order.intakeStatus === 'submitted' ||
      order.intakeStatus === 'certified' ||
      order.intakeStatus === 'filing') &&
    entries.length > 0;
  return (
    <div
      className="mt-[14px] rounded-none border bg-white p-[18px]"
      style={{ borderColor: LINE }}
    >
      <h3 className={T_CARD} style={{ color: NAVY }}>
        Your filing information
      </h3>
      {entries.length === 0 ? (
        <p className={`${T_BODY} mt-2 leading-[1.6]`} style={{ color: MUTED }}>
          You have not sent your intake yet. Once you submit it, your answers live here so you
          can always see exactly what we are filing for you.
        </p>
      ) : (
        <>
          {certified && (
            <p
              className={`${T_SMALL} mt-2 rounded-none-[9px] border px-3 py-[9px] font-semibold`}
              style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
            >
              Certified final
              {certifiedName ? ` by ${certifiedName}` : ''}
              {certifiedDateRaw ? ` on ${formatDate(certifiedDateRaw)}` : ''}. This is exactly
              what we are filing.
            </p>
          )}
          <div className="mt-2">
            {entries.map(([k, v], i) => (
              <div
                key={k}
                className={`flex items-baseline justify-between gap-[14px] py-2 ${T_BODY}`}
                style={
                  i < entries.length - 1 ? { borderBottom: '1px solid #eef1f6' } : undefined
                }
              >
                <span className="font-semibold" style={{ color: MUTED }}>
                  {FIELD_LABELS[k] ?? humanizeKey(k)}
                </span>
                <span className="text-right font-extrabold" style={{ color: NAVY }}>
                  {displayValue(v)}
                </span>
              </div>
            ))}
          </div>
          <div
            className="mt-3 rounded-none-[10px] border-[1.5px] border-dashed px-[14px] py-3"
            style={{ borderColor: '#c3ccd9' }}
          >
            <p className={`${T_BODY} font-extrabold`} style={{ color: NAVY }}>
              Need to change something here?
            </p>
            <p className={`${T_SMALL} mt-1 leading-[1.6]`} style={{ color: MUTED }}>
              Call us at {SUPPORT_PHONE}. Changes to filing information are made by our team, so
              every change is checked and recorded. Light details, like how we greet you, you can
              update yourself under My information.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------- Documents ------------------------------- */

/**
 * Download control for the automatic Audit Assistance Kit slot. The kit
 * is one master file stored once (see /api/portal/products/audit-kit);
 * this checks on mount whether the master file exists yet. Until it
 * does, the slot keeps the plain "Included with your purchase" wording
 * rather than a button that leads nowhere. Oct 18, 2026.
 */
function KitDownloadButton() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch('/api/portal/products/audit-kit', {
          headers: { 'x-portal-token': getPortalToken() },
        });
        const j = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        if (live && j?.ok) setReady(true);
      } catch {
        /* stays not ready */
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  if (!ready) {
    return (
      <span className={`${T_SMALL} shrink-0`} style={{ color: MUTED }}>
        Included with your purchase
      </span>
    );
  }
  async function download() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/portal/products/audit-kit', {
        headers: { 'x-portal-token': getPortalToken() },
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; url?: string } | null;
      if (j?.ok && j.url) window.location.href = j.url;
    } catch {
      /* the button stays available to try again */
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="shrink-0 text-[12.5px] font-extrabold hover:underline"
      style={{ color: '#1755a8' }}
    >
      {busy ? 'Preparing…' : 'Download'}
    </button>
  );
}

function DocumentsCard({ order }: { order: OrderRecord }) {
  const pkg = getPackage(order.packageSlug);
  const expected = pkg?.expectedDocuments ?? [];
  // The signed limited POA copy lives outside the expected slots: it is
  // generated when the client signs the POA inside the authority intake.
  const poaDoc = order.documents?.find((d) => d.slotKey === 'limited-poa');
  if (expected.length === 0 && !poaDoc) return null;
  return (
    <div
      id="documents"
      className="mt-[14px] rounded-none border bg-white p-[18px]"
      style={{ borderColor: LINE }}
    >
      <h3 className={T_CARD} style={{ color: NAVY }}>
        Your documents
      </h3>
      <p className={`${T_SMALL} mt-1`} style={{ color: MUTED }}>
        Filed paperwork appears here as we complete each step.
      </p>
      <div className="mt-[6px]">
        {expected.map((slot, i) => {
          const doc = order.documents?.find((d) => d.slotKey === slot.key);
          return (
            <div
              key={slot.key}
              className="flex items-center justify-between gap-[10px] py-[11px]"
              style={
                i < expected.length - 1 ? { borderBottom: '1px solid #eef1f6' } : undefined
              }
            >
              <div>
                <p className={`${T_BODY} font-extrabold`} style={{ color: NAVY }}>
                  {slot.label}
                </p>
                {doc ? (
                  <p className={`${T_SMALL} mt-[2px]`} style={{ color: MUTED }}>
                    {doc.fileName} · added {formatDate(doc.uploadedAt)}
                  </p>
                ) : slot.auto ? (
                  <p className={`${T_SMALL} mt-[2px]`} style={{ color: MUTED }}>
                    Yours since the day you ordered.
                  </p>
                ) : (
                  <p className={`${T_SMALL} mt-[2px]`} style={{ color: MUTED }}>
                    Arrives here when it is ready.
                  </p>
                )}
              </div>
              {doc && doc.dataUrl ? (
                <a
                  href={doc.dataUrl}
                  download={doc.fileName}
                  className="shrink-0 text-[12.5px] font-extrabold hover:underline"
                  style={{ color: '#1755a8' }}
                >
                  Download
                </a>
              ) : slot.auto && slot.key === 'audit-kit' ? (
                <KitDownloadButton />
              ) : slot.auto ? (
                <span className={`${T_SMALL} shrink-0`} style={{ color: MUTED }}>
                  Included with your purchase
                </span>
              ) : (
                <span className={`${T_SMALL} shrink-0`} style={{ color: MUTED }}>
                  Not ready yet
                </span>
              )}
            </div>
          );
        })}
        {poaDoc && (
          <div
            className="flex items-center justify-between gap-[10px] py-[11px]"
            style={
              expected.length > 0 ? { borderTop: '1px solid #eef1f6' } : undefined
            }
          >
            <div>
              <p className={`${T_BODY} font-extrabold`} style={{ color: NAVY }}>
                Signed limited power of attorney
              </p>
              <p className={`${T_SMALL} mt-[2px]`} style={{ color: MUTED }}>
                {poaDoc.fileName} · added {formatDate(poaDoc.uploadedAt)}
              </p>
            </div>
            {poaDoc.dataUrl ? (
              <a
                href={poaDoc.dataUrl}
                download={poaDoc.fileName}
                className="shrink-0 text-[12.5px] font-extrabold hover:underline"
                style={{ color: '#1755a8' }}
              >
                Download
              </a>
            ) : (
              <span className={`${T_SMALL} shrink-0`} style={{ color: MUTED }}>
                On file
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------- Documents we need ------------------------- */

function UploadStateDot({ color, mark }: { color: string; mark: string }) {
  return (
    <span
      aria-hidden
      className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-none text-[11px] font-extrabold text-white"
      style={{ background: color }}
    >
      {mark}
    </span>
  );
}

function UploadsCard({
  order,
  onUploaded,
}: {
  order: OrderRecord;
  onUploaded?: () => void;
}) {
  const pkg = getPackage(order.packageSlug);
  const requested = pkg?.requestedDocuments ?? [];
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Last successful upload per slot. Kept in this card (which stays
  // mounted across the post-upload refetch) so the confirmation survives
  // the refresh; it clears when a new upload starts on the slot, and the
  // render below hides it once the team has reviewed the file (accepted
  // or clearer copy requested), since that state then speaks for itself.
  const [successes, setSuccesses] = useState<
    Record<string, { orderId: string; fileName: string }>
  >({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  if (requested.length === 0) return null;

  const uploads = order.uploads ?? [];
  // Files arrive oldest first; the newest row for a slot decides its state.
  const filesFor = (key: string) => uploads.filter((u) => u.slotKey === key);
  const statusFor = (key: string) => {
    const files = filesFor(key);
    return files.length === 0 ? 'none' : files[files.length - 1].status;
  };
  const acceptedCount = requested.filter((s) => statusFor(s.key) === 'accepted').length;
  const pct = Math.round((acceptedCount / requested.length) * 100);

  async function upload(slotKey: string, file: File) {
    const token = getPortalToken();
    if (!token) return;
    setBusySlot(slotKey);
    setErrors((prev) => ({ ...prev, [slotKey]: '' }));
    setSuccesses((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    try {
      // Proven road for everyday files (Oct 17, 2026, F9 repair): one
      // multipart POST through our own server, the path client uploads
      // used successfully before the direct rebuild. Files over 4 MB
      // take the direct road below, so the host's function body cap
      // never applies to them.
      if (file.size <= 4 * 1024 * 1024) {
        const form = new FormData();
        form.append('file', file);
        form.append('slotKey', slotKey);
        const res = await fetch(
          `/api/portal/orders/${encodeURIComponent(order.id)}/documents/server`,
          { method: 'POST', headers: { 'x-portal-token': token }, body: form }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setErrors((prev) => ({
            ...prev,
            [slotKey]: data?.error ?? 'Something went wrong. Please try again.',
          }));
          return;
        }
        setSuccesses((prev) => ({
          ...prev,
          [slotKey]: { orderId: order.id, fileName: file.name },
        }));
        onUploaded?.();
        return;
      }
      // Direct upload (Oct 17, 2026, F9): ask for a signed upload URL,
      // send the file straight to storage, then register it. The file
      // never passes through our server, so big phone photos and long
      // PDFs upload fine.
      const signRes = await fetchWithTimeout(
        `/api/portal/orders/${encodeURIComponent(order.id)}/documents/sign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-portal-token': token },
          body: JSON.stringify({
            slotKey,
            fileName: file.name,
            size: file.size,
            type: file.type,
          }),
        },
        20_000
      );
      const signData = await signRes.json().catch(() => null);
      if (!signRes.ok || !signData?.ok || !signData.uploadUrl || !signData.path) {
        setErrors((prev) => ({
          ...prev,
          [slotKey]: signData?.error ?? 'Something went wrong. Please try again.',
        }));
        return;
      }
      let put: Response;
      try {
        put = await fetchWithTimeout(
          signData.uploadUrl,
          {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'x-upsert': 'false',
            },
            body: file,
          },
          240_000
        );
      } catch {
        setErrors((prev) => ({
          ...prev,
          [slotKey]: 'We could not upload that file. Please check your connection and try again.',
        }));
        return;
      }
      if (!put.ok) {
        setErrors((prev) => ({
          ...prev,
          [slotKey]: 'Something went wrong. Please try again.',
        }));
        return;
      }
      const res = await fetchWithTimeout(
        `/api/portal/orders/${encodeURIComponent(order.id)}/documents`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-portal-token': token },
          body: JSON.stringify({
            slotKey,
            storagePath: signData.path,
            fileName: file.name,
          }),
        },
        30_000
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErrors((prev) => ({
          ...prev,
          [slotKey]: data?.error ?? 'Something went wrong. Please try again.',
        }));
        return;
      }
      setSuccesses((prev) => ({
        ...prev,
        [slotKey]: { orderId: order.id, fileName: file.name },
      }));
      onUploaded?.();
    } catch {
      setErrors((prev) => ({
        ...prev,
        [slotKey]: 'Something went wrong. Please try again.',
      }));
    } finally {
      setBusySlot(null);
    }
  }

  const navyButton =
    'shrink-0 cursor-pointer rounded-none px-[15px] py-2 text-[12.5px] font-extrabold text-white transition hover:brightness-125 disabled:cursor-wait disabled:opacity-60';

  return (
    <div
      className="mt-[14px] rounded-none border bg-white p-[18px]"
      style={{ borderColor: LINE }}
    >
      <h3 className={T_CARD} style={{ color: NAVY }}>
        Documents we need from you
      </h3>
      <p className={`${T_SMALL} mt-1 leading-[1.6]`} style={{ color: MUTED }}>
        Upload these so we can prepare your filings. A phone photo is fine as long as every
        word is clear. You can add more than one file to an item, for example the front and
        back of a license.
      </p>
      <div
        className="mt-[14px] h-[6px] overflow-hidden rounded-none"
        style={{ background: '#eef1f6' }}
        role="progressbar"
        aria-valuenow={acceptedCount}
        aria-valuemin={0}
        aria-valuemax={requested.length}
        aria-label="Documents accepted"
      >
        <div
          className="h-full rounded-none"
          style={{ width: `${pct}%`, background: YELLOW }}
        />
      </div>
      <p className={`${T_SMALL} mt-1`} style={{ color: MUTED }}>
        {acceptedCount} of {requested.length} accepted
      </p>
      <div className="mt-[6px]">
        {requested.map((slot, i) => {
          const files = filesFor(slot.key);
          const latest = files[files.length - 1];
          const status = statusFor(slot.key);
          const busy = busySlot === slot.key;
          const error = errors[slot.key];
          const success = successes[slot.key];
          const showSuccess =
            !!success &&
            success.orderId === order.id &&
            status !== 'accepted' &&
            status !== 'needs_new_copy';
          return (
            <div
              key={slot.key}
              className="py-[11px]"
              style={
                i < requested.length - 1
                  ? { borderBottom: '1px solid #eef1f6' }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-[10px]">
                <div className="min-w-0">
                  <p className={`${T_BODY} font-extrabold`} style={{ color: NAVY }}>
                    {slot.label}
                  </p>
                  {files.length > 0 ? (
                    files.map((f) => (
                      <p
                        key={f.id}
                        className={`${T_SMALL} mt-[2px]`}
                        style={{ color: MUTED }}
                      >
                        {f.fileName} · added {formatDate(f.createdAt)}
                      </p>
                    ))
                  ) : slot.hint ? (
                    <p className={`${T_SMALL} mt-[2px]`} style={{ color: MUTED }}>
                      {slot.hint}
                    </p>
                  ) : null}
                  {status === 'accepted' && (
                    <p className={`${T_SMALL} mt-[2px]`} style={{ color: MUTED }}>
                      Our team has checked this document. To change it, call us at{' '}
                      {SUPPORT_PHONE}.
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {status === 'accepted' ? (
                    <span className="flex items-center gap-[7px]">
                      <UploadStateDot color="#15803d" mark="✓" />
                      <span
                        className={`${T_SMALL} font-extrabold`}
                        style={{ color: '#15803d' }}
                      >
                        Accepted
                      </span>
                    </span>
                  ) : status === 'in_review' ? (
                    <span className="flex items-center gap-[12px]">
                      <span className="flex items-center gap-[7px]">
                        <UploadStateDot color="#b45309" mark="!" />
                        <span
                          className={`${T_SMALL} font-extrabold`}
                          style={{ color: '#b45309' }}
                        >
                          In review
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileInputs.current[slot.key]?.click()}
                        className="cursor-pointer text-[12.5px] font-extrabold hover:underline disabled:cursor-wait disabled:opacity-60"
                        style={{ color: '#1755a8' }}
                      >
                        {busy ? 'Uploading...' : 'Add a file'}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileInputs.current[slot.key]?.click()}
                      className={navyButton}
                      style={{ background: NAVY, fontFamily: 'inherit' }}
                    >
                      {busy
                        ? 'Uploading...'
                        : status === 'needs_new_copy'
                          ? 'Upload a clearer copy'
                          : 'Upload'}
                    </button>
                  )}
                </div>
              </div>
              {status === 'needs_new_copy' && (
                <div className="mt-[6px] flex items-center gap-[7px]">
                  <UploadStateDot color="#b91c1c" mark="!" />
                  <span
                    className={`${T_SMALL} font-extrabold`}
                    style={{ color: '#b91c1c' }}
                  >
                    We need a clearer copy
                  </span>
                </div>
              )}
              {status === 'needs_new_copy' && latest?.staffNote && (
                <div
                  className="mt-2 rounded-none-[9px] px-3 py-[9px]"
                  style={{
                    background: '#fdf3f3',
                    border: '1px solid #f3d2d2',
                    color: '#7f1d1d',
                  }}
                >
                  <p className={`${T_SMALL} leading-[1.55]`}>
                    <strong style={{ color: '#b91c1c' }}>From our team:</strong>{' '}
                    {latest.staffNote}
                  </p>
                </div>
              )}
              {error && (
                <p className={`${T_SMALL} mt-2`} style={{ color: '#b91c1c' }}>
                  {error}
                </p>
              )}
              {showSuccess && success && (
                <p
                  className={`${T_SMALL} mt-2 font-bold`}
                  style={{ color: '#15803d' }}
                  role="status"
                >
                  ✓ Upload complete: {success.fileName} is with our team for review.
                </p>
              )}
              <input
                ref={(el) => {
                  fileInputs.current[slot.key] = el;
                }}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
                className="hidden"
                aria-label={`Upload ${slot.label}`}
                multiple
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  if (picked.length > 0) {
                    void (async () => {
                      for (const f of picked) await upload(slot.key, f);
                    })();
                  }
                }}
              />
            </div>
          );
        })}
      </div>
      <p className={`${T_SMALL} mt-3 leading-[1.6]`} style={{ color: MUTED }}>
        PDF, JPG, PNG or HEIC (the format iPhones use), up to 50 MB each. Your files are
        private. They are stored securely and only our team can see them.
      </p>
    </div>
  );
}

/* -------------------------------- Payment -------------------------------- */

function renewalLabel(order: OrderRecord): string | null {
  const pkg = getPackage(order.packageSlug);
  if (!pkg || (pkg.billing !== '/year' && pkg.billing !== '/month')) return null;
  const d = new Date(order.createdAt);
  if (Number.isNaN(d.getTime())) return null;
  if (pkg.billing === '/year') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return formatDate(d.toISOString());
}

function priceLabel(order: OrderRecord): string {
  const pkg = getPackage(order.packageSlug);
  const base = formatUSD(order.amount);
  if (!pkg) return base;
  if (pkg.billing === 'one-time') return `${base} one-time`;
  return `${base}${pkg.billing}`;
}

function PaymentRow({
  label,
  value,
  topBorder,
}: {
  label: string;
  value: string;
  topBorder?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-[5px] ${T_BODY}`}
      style={topBorder ? { borderTop: '1px solid #eef1f6' } : undefined}
    >
      <span style={{ color: MUTED }}>{label}</span>
      <span className="font-extrabold" style={{ color: NAVY }}>
        {value}
      </span>
    </div>
  );
}

function PaymentCard({ order }: { order: OrderRecord }) {
  const pkg = getPackage(order.packageSlug);
  const pay = payPillFor(order);
  const renewal = renewalLabel(order);
  const isSubscription = renewal !== null;
  const oursTotal = pkg?.fees.filter((f) => f.kind === 'ours').reduce((s, f) => s + f.amount, 0);
  const govFees = pkg?.fees.filter((f) => f.kind === 'government') ?? [];
  const govTotal = govFees.reduce((s, f) => s + f.amount, 0);
  const hasBreakdown =
    !isSubscription && pkg !== undefined && pkg.fees.length > 1 && (oursTotal ?? 0) > 0 && govTotal > 0;
  const govLabel = govFees.some((f) => /fmcsa/i.test(f.label))
    ? 'FMCSA filing fee'
    : 'Government filing fees';
  return (
    <div
      className="mt-[14px] rounded-none border bg-white p-[18px]"
      style={{ borderColor: LINE }}
    >
      <h3 className={T_CARD} style={{ color: NAVY }}>
        Payment
      </h3>
      <div className="mt-[10px]">
        {isSubscription ? (
          <>
            <PaymentRow label="Amount" value={priceLabel(order)} />
            <PaymentRow label="Status" value={pay.label} />
            <PaymentRow label="Next renewal" value={renewal} />
          </>
        ) : hasBreakdown ? (
          <>
            <PaymentRow label="Our service fee" value={formatUSD(oursTotal ?? 0)} />
            <PaymentRow label={govLabel} value={formatUSD(govTotal)} />
            <PaymentRow label="Total paid" value={priceLabel(order)} topBorder />
          </>
        ) : (
          <>
            <PaymentRow label="Amount" value={priceLabel(order)} />
            <PaymentRow label="Status" value={pay.label} />
          </>
        )}
      </div>
      {isSubscription && (
        <p className={`${T_SMALL} mt-[10px]`} style={{ color: MUTED }}>
          To cancel, email us at least 7 days before the renewal date.
        </p>
      )}
    </div>
  );
}

/* ------------------------------ Order panel ------------------------------ */

function OrderPanel({
  order,
  onRefresh,
}: {
  order: OrderRecord;
  onRefresh?: () => void;
}) {
  const pay = payPillFor(order);
  const status = pillFor(order.intakeStatus);
  return (
    <div>
      <div
        className="rounded-none border bg-white p-[18px] shadow-[0_8px_24px_rgba(10,26,54,0.05)]"
        style={{ borderColor: LINE }}
      >
        <div className="flex flex-wrap items-start gap-[10px]">
          <div>
            <h2 className={T_TITLE} style={{ color: NAVY }}>
              {order.packageName}
            </h2>
            <p className={`${T_SMALL} mt-1`} style={{ color: MUTED }}>
              Order {order.id} · {formatDate(order.createdAt)} · {priceLabel(order)}
              {order.optionLabel ? ` · ${order.optionLabel}` : ''}
            </p>
          </div>
          <div className="ml-auto flex gap-[6px]">
            <span className={`${PILL} ${pay.cls}`}>{pay.label}</span>
            <span className={`${PILL} ${status.cls}`}>{status.label}</span>
          </div>
        </div>
        <Timeline status={order.intakeStatus} completed={Boolean(order.completedAt)} />
        <NextSteps order={order} />
      </div>
      <CallCard order={order} />
      <FilingInfoCard order={order} />
      <UploadsCard order={order} onUploaded={onRefresh} />
      <DocumentsCard order={order} />
      <PaymentCard order={order} />
    </div>
  );
}

/* -------------------------------- Left rail ------------------------------ */

function greetingStorageKey(email: string): string {
  return `ttb-greeting-name:${email.toLowerCase()}`;
}

export default function PortalDashboardPage() {
  const { portalEmail, orders } = useTtb();
  const [, setSynced] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');
  const [greetingDraft, setGreetingDraft] = useState('');
  const [greetingSaved, setGreetingSaved] = useState(false);
  // True once a stored greeting is loaded or the customer edits the field,
  // so a late order merge never overwrites what they chose.
  const greetingTouched = useRef(false);

  // Pull the customer's real orders from the server (documents the office
  // uploaded, intake answers, staff edits, payment state) and merge them
  // into the local store so this page shows the same truth as the office.
  useEffect(() => {
    const token = getPortalToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/portal/orders', {
          headers: { 'x-portal-token': token },
        });
        if (res.status === 401) {
          setPortalToken(null);
          return;
        }
        const data = await res.json().catch(() => null);
        if (!cancelled && data?.ok && Array.isArray(data.orders)) {
          mergeServerOrders(data.orders);
          setSynced((n) => n + 1);
        }
      } catch {
        /* local copy still renders */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Same fetch as the mount effect: after a document upload, pull the
  // server copy again so the new file and its review state show at once.
  function refreshOrders() {
    const token = getPortalToken();
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/portal/orders', {
          headers: { 'x-portal-token': token },
        });
        if (res.status === 401) {
          setPortalToken(null);
          return;
        }
        const data = await res.json().catch(() => null);
        if (data?.ok && Array.isArray(data.orders)) {
          mergeServerOrders(data.orders);
          setSynced((n) => n + 1);
        }
      } catch {
        /* local copy still renders */
      }
    })();
  }

  const myOrders = portalEmail
    ? orders.filter((o) => o.buyerEmail.toLowerCase() === portalEmail.toLowerCase())
    : [];
  const buyerFirstName = myOrders[0]?.buyerName?.split(' ')[0] ?? '';

  // The greeting name is the one light, self-serve detail in the portal. It
  // lives only in this browser and never feeds a filing or a document.
  useEffect(() => {
    if (!portalEmail || greetingTouched.current) return;
    let stored = '';
    try {
      stored = window.localStorage.getItem(greetingStorageKey(portalEmail)) ?? '';
    } catch {
      /* storage unavailable */
    }
    if (stored.trim()) {
      greetingTouched.current = true;
      setGreeting(stored.trim());
      setGreetingDraft(stored.trim());
    } else if (buyerFirstName) {
      setGreeting(buyerFirstName);
      setGreetingDraft(buyerFirstName);
    }
  }, [portalEmail, buyerFirstName]);

  function saveGreeting() {
    const value = greetingDraft.trim();
    if (!portalEmail || !value) return;
    greetingTouched.current = true;
    try {
      window.localStorage.setItem(greetingStorageKey(portalEmail), value);
    } catch {
      /* storage unavailable */
    }
    setGreeting(value);
    setGreetingSaved(true);
    window.setTimeout(() => setGreetingSaved(false), 2500);
  }

  const header = (
    <div>
      <span
        className="inline-flex items-center gap-[7px] rounded-none border bg-white px-3 py-[5px]"
        style={{ borderColor: LINE }}
      >
        <span
          className="h-[7px] w-[7px] rounded-none"
          style={{ background: YELLOW }}
          aria-hidden
        />
        <span className={T_LABEL} style={{ color: NAVY }}>
          CLIENT PORTAL
        </span>
      </span>
      {portalEmail && (
        <>
          <h1 className={`${T_TITLE} mt-3`} style={{ color: NAVY }}>
            Welcome back{greeting ? `, ${greeting}` : ''}.
          </h1>
          <p className={`${T_BODY} mt-[5px]`} style={{ color: MUTED }}>
            Your orders, your filing information, and your documents, all in one place.
          </p>
        </>
      )}
    </div>
  );

  if (!portalEmail) {
    return (
      <div className="sharp" style={{ background: '#f6f7f9', fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
        <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-[26px]">
          {header}
          <div
            className="mt-6 max-w-xl rounded-none border bg-white p-[18px]"
            style={{ borderColor: LINE }}
          >
            <h2 className={T_CARD} style={{ color: NAVY }}>
              Please log in
            </h2>
            <p className={`${T_BODY} mt-2`} style={{ color: MUTED }}>
              Your client portal needs an email login first.
            </p>
            <Link
              href="/portal/login"
              className="mt-4 inline-block rounded-none px-[13px] py-2 text-[12.5px] font-extrabold text-white transition hover:brightness-125"
              style={{ background: NAVY }}
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selected = myOrders.find((o) => o.id === selectedId) ?? myOrders[0];

  return (
    <div className="sharp" style={{ background: '#f6f7f9', fontFamily: "'Libre Franklin', Arial, sans-serif" }}>
      <div className="mx-auto max-w-[1180px] px-4 py-[26px] sm:px-[26px]">
        {header}

        {myOrders.length === 0 ? (
          <div
            className="mt-6 rounded-none border bg-white p-[18px]"
            style={{ borderColor: LINE }}
          >
            <p className={T_BODY} style={{ color: MUTED }}>
              No orders linked to {portalEmail} yet. Complete a purchase and your orders, intake,
              and documents will appear here.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-block rounded-none px-[13px] py-2 text-[12.5px] font-extrabold text-white transition hover:brightness-125"
              style={{ background: NAVY }}
            >
              View packages
            </Link>
          </div>
        ) : (
          <div className="mt-[18px] flex flex-col items-start gap-4 lg:flex-row">
            {/* Left rail */}
            <div className="w-full shrink-0 lg:w-[288px]">
              <p className={T_LABEL} style={{ color: MUTED }}>
                MY ORDERS
              </p>
              <div className="mt-2 space-y-2">
                {myOrders.map((o) => {
                  const isSel = selected?.id === o.id;
                  const st = pillFor(o.intakeStatus);
                  const pkg = getPackage(o.packageSlug);
                  const price =
                    formatUSD(o.amount) +
                    (pkg && pkg.billing !== 'one-time' ? pkg.billing : '');
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      aria-pressed={isSel}
                      className="block w-full cursor-pointer rounded-none border-2 px-[14px] py-3 text-left transition"
                      style={{
                        background: isSel ? '#ffffff' : '#eef1f6',
                        borderColor: isSel ? NAVY : LINE,
                        fontFamily: 'inherit',
                      }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={`${T_BODY} font-extrabold`} style={{ color: NAVY }}>
                          {o.id}
                        </span>
                        <span className={`${PILL} ${st.cls}`}>{st.label}</span>
                      </span>
                      <span
                        className={`${T_SMALL} mt-[3px] block`}
                        style={{ color: MUTED }}
                      >
                        {o.packageName} · {price}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* My information */}
              <div
                className="mt-4 rounded-none border bg-white p-[14px]"
                style={{ borderColor: LINE }}
              >
                <p className={T_LABEL} style={{ color: MUTED }}>
                  MY INFORMATION
                </p>
                <p className={`${T_SMALL} mt-3 font-extrabold`} style={{ color: NAVY }}>
                  How we greet you
                </p>
                <div className="mt-[5px] flex gap-[6px]">
                  <input
                    value={greetingDraft}
                    onChange={(e) => {
                      greetingTouched.current = true;
                      setGreetingDraft(e.target.value);
                    }}
                    aria-label="How we greet you"
                    className="min-w-0 flex-1 rounded-none border px-[9px] py-[7px] text-[13.5px]"
                    style={{ borderColor: LINE, color: NAVY, fontFamily: 'inherit' }}
                  />
                  <button
                    type="button"
                    onClick={saveGreeting}
                    className="shrink-0 cursor-pointer rounded-none px-3 py-[7px] text-[12.5px] font-extrabold text-white transition hover:brightness-125"
                    style={{ background: NAVY, fontFamily: 'inherit' }}
                  >
                    Save
                  </button>
                </div>
                <p className={`${T_SMALL} mt-[6px]`} style={{ color: MUTED }}>
                  {greetingSaved
                    ? 'Saved.'
                    : 'Light details like this one, you can update anytime.'}
                </p>
                <div className="mt-3 border-t pt-3" style={{ borderColor: '#eef1f6' }}>
                  <p className={`${T_SMALL} font-extrabold`} style={{ color: NAVY }}>
                    Email
                  </p>
                  <p
                    className={`${T_SMALL} mt-[2px] break-all`}
                    style={{ color: MUTED }}
                  >
                    {portalEmail}
                  </p>
                  <p
                    className={`${T_SMALL} mt-[10px] leading-[1.55]`}
                    style={{ color: MUTED }}
                  >
                    To change your email, your address, or anything that goes on a filing, call
                    us and our team updates it for you, so every change is checked and on record.
                  </p>
                </div>
              </div>

              {/* Need help */}
              <div className="mt-4 rounded-none p-[14px]" style={{ background: NAVY }}>
                <p className={T_LABEL} style={{ color: '#9db1d4' }}>
                  NEED HELP?
                </p>
                <p className={`${T_BODY} mt-[10px] font-extrabold text-white`}>
                  Call{' '}
                  <a href="tel:+17252446771" className="hover:underline">
                    {SUPPORT_PHONE}
                  </a>
                </p>
                <p className={`${T_SMALL} mt-1`} style={{ color: '#cbd8f0' }}>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </p>
                <Link
                  href="/contact"
                  className="mt-3 inline-block rounded-none px-3 py-2 text-[12.5px] font-extrabold transition hover:brightness-105"
                  style={{ background: YELLOW, color: NAVY }}
                >
                  Send us a message
                </Link>
              </div>
            </div>

            {/* Main panel */}
            <div className="min-w-0 flex-1">
              {selected && <OrderPanel order={selected} onRefresh={refreshOrders} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

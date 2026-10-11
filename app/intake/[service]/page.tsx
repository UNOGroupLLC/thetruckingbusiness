'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getOrder, saveIntake, formatUSD } from '@/lib/store';
import { syncIntake } from '@/lib/sync';
import Field from '@/components/Field';
import ScheduleCall from '@/components/ScheduleCall';

interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  options?: string[];
  required?: boolean;
  /** Section header shown above the first field of each group. */
  section?: string;
  /** Only show (and validate) this field when another field has this value. */
  showIf?: { key: string; value: string };
}

/**
 * MC AUTHORITY INTAKE — modeled on FMCSA Form OP-1 (Application for Motor
 * Property Carrier Authority), rewritten in plain language. Serves every
 * package that includes MC authority (Complete, Authority Plus, Authority
 * Startup). Section 6 captures the limited-POA + consortium/TPA authorizations.
 */
const AUTHORITY_FIELDS: FieldDef[] = [
  // Section 1 — About you
  { key: 'firstName', label: 'First name', section: 'About you' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email', hint: 'Filing confirmations and your receipt go here.' },
  { key: 'phone', label: 'Cell phone', type: 'tel', hint: 'For filing updates and your kickoff call.' },

  // Section 2 — Your business (OP-1 Section 1: Applicant Information)
  { key: 'legalName', label: 'Legal business name', section: 'Your business', hint: 'Exactly as it appears on your state registration and IRS records — filings are rejected over spelling differences.' },
  { key: 'dba', label: 'DBA / trade name', required: false, hint: 'Only if different from the legal name.' },
  { key: 'structure', label: 'Business structure', type: 'select', options: ['LLC', 'Corporation', 'Sole proprietorship', 'Partnership'] },
  { key: 'formationState', label: 'State where the business is registered' },
  { key: 'ein', label: 'EIN', hint: 'Your Employer Identification Number from the IRS (XX-XXXXXXX).' },

  // Section 3 — Business address (OP-1: Principal place of business)
  { key: 'street', label: 'Street address', section: 'Business address', hint: 'Physical address — no P.O. Box. FMCSA uses this for safety audits.' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP code' },
  { key: 'mailingSame', label: 'Is your mailing address the same as above?', type: 'select', options: ['Yes', 'No'] },
  { key: 'mailingStreet', label: 'Mailing street address', showIf: { key: 'mailingSame', value: 'No' } },
  { key: 'mailingCity', label: 'Mailing city', showIf: { key: 'mailingSame', value: 'No' } },
  { key: 'mailingState', label: 'Mailing state', showIf: { key: 'mailingSame', value: 'No' } },
  { key: 'mailingZip', label: 'Mailing ZIP code', showIf: { key: 'mailingSame', value: 'No' } },

  // Section 4 — Your operating authority (OP-1 Sections 2 & 3)
  { key: 'hasDot', label: 'Do you already have a USDOT number?', section: 'Your operating authority', type: 'select', options: ['No — I need one', 'Yes'] },
  { key: 'dotNumber', label: 'USDOT number', showIf: { key: 'hasDot', value: 'Yes' } },
  { key: 'cargoType', label: 'What will you haul?', type: 'select', options: ['General freight (non-hazardous)', 'Hazardous materials'], hint: 'This sets your required insurance level.' },
  { key: 'carrierType', label: 'How will you operate?', type: 'select', options: ['Haul for anyone — common carrier', 'Under contract with specific customers — contract carrier', 'Not sure — please advise me'] },
  { key: 'trucks', label: 'Number of trucks (power units)', type: 'number' },
  { key: 'drivers', label: 'Number of drivers (including yourself)', type: 'number' },
  { key: 'driverDetails', label: 'Driver details for consortium enrollment', type: 'textarea', required: false, hint: 'One driver per line: full name, CDL number, issuing state. We need this to enroll your drivers in the drug & alcohol consortium.' },

  // Section 5 — History check (OP-1 Section 5: Affiliations)
  { key: 'affiliated', label: 'In the last 3 years, have you owned, managed, or been connected to another trucking company?', section: 'History check', type: 'select', options: ['No', 'Yes'], hint: 'FMCSA requires us to disclose this on your application.' },
  { key: 'affiliateName', label: 'Company name', showIf: { key: 'affiliated', value: 'Yes' } },
  { key: 'affiliateMc', label: 'MC number (if known)', required: false, showIf: { key: 'affiliated', value: 'Yes' } },

  // Section 6 — Confirm & authorize (OP-1 Section 8: Applicant's Oath, adapted)
  { key: 'confirmTrue', label: 'I confirm that the information I provided is true and correct.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'poaAuth', label: 'I authorize The Trucking Business to prepare and submit my FMCSA operating authority application (OP-1), BOC-3 designation, UCR registration, and related state filings on my behalf under a limited power of attorney.', type: 'checkbox', hint: 'Our attorney-drafted limited power of attorney will be sent for your signature before anything is filed.' },
  { key: 'consortiumAuth', label: 'I authorize The Trucking Business to enroll my drivers in a DOT drug & alcohol consortium and coordinate my FMCSA Clearinghouse registration, including designation of a Third-Party Administrator to conduct required queries on my behalf.', type: 'checkbox' },
  { key: 'signature', label: 'Type your full legal name as your electronic signature' },
  { key: 'signDate', label: 'Date', type: 'date' },
];

const COMPLIANCE_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'companyName', label: 'Company name' },
  { key: 'usdot', label: 'USDOT number' },
  { key: 'mc', label: 'MC number', required: false },
  { key: 'trucks', label: 'Number of trucks', type: 'number' },
  { key: 'drivers', label: 'Number of drivers', type: 'number' },
  { key: 'ucr', label: 'UCR registration status', type: 'select', options: ['Not registered', 'Registered — current', 'Registered — expired', 'Not sure'] },
  { key: 'ifta', label: 'IFTA account status', type: 'select', options: ['No account yet', 'Active', 'Filing behind', 'Not sure'] },
  { key: 'eld', label: 'ELD provider', required: false, hint: 'If you already use one.' },
  { key: 'audit', label: 'Safety audit history', type: 'select', options: ['Never audited', 'New-entrant audit scheduled', 'New-entrant audit passed', 'Compliance review in past'] },
];

/**
 * STATE PERMIT INTAKE — for State Permit Application Filing (OR / NM / KY).
 * Asks only what a state permit filing needs.
 */
const STATE_PERMIT_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },
  { key: 'legalName', label: 'Legal business name', section: 'Your business' },
  { key: 'usdot', label: 'USDOT number' },
  { key: 'statesNeeded', label: 'Which state permit(s) do you need?', section: 'Your permits', type: 'select', options: ['Oregon — PUC permit', 'New Mexico — Weight-Distance Tax (WDT) permit', 'Kentucky — KYU number', 'All three states'] },
  { key: 'feeNote', label: 'I understand the service fee covers filing only — state permit fees, if any, are billed separately, and the Oregon surety bond must be provided by my company.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'permitAuth', label: 'I authorize The Trucking Business to prepare and submit my state permit application(s) on my behalf.', type: 'checkbox' },
  { key: 'signature', label: 'Type your full legal name as your electronic signature' },
  { key: 'signDate', label: 'Date', type: 'date' },
];

/**
 * MOTUS INTAKE — for MOTUS Set-up. The company official must be an owner or
 * officer; MOTUS identity (biometric) verification can only be done by them.
 */
const MOTUS_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'Company official', hint: 'Must be an owner or officer of the company — MOTUS requires it.' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email', hint: 'Used for the MOTUS account.' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },
  { key: 'legalName', label: 'Legal business name', section: 'Your business' },
  { key: 'usdot', label: 'USDOT number', required: false, hint: 'If you already have one.' },
  { key: 'verifyAck', label: 'I understand MOTUS requires identity verification (including biometric verification) completed by the company owner or officer themselves, and The Trucking Business cannot complete that verification step on my behalf.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'motusAuth', label: 'I authorize The Trucking Business to set up my carrier MOTUS account and guide me through the verification process.', type: 'checkbox' },
  { key: 'signature', label: 'Type your full legal name as your electronic signature' },
  { key: 'signDate', label: 'Date', type: 'date' },
];

/**
 * CLEARINGHOUSE ANNUAL QUERY INTAKE — for the $39 annual driver query.
 * Only for carriers with an established Clearinghouse account.
 */
const CLEARINGHOUSE_QUERY_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },
  { key: 'companyName', label: 'Company legal name', section: 'Your company' },
  { key: 'usdot', label: 'USDOT number' },
  { key: 'hasAccount', label: 'Is your FMCSA Clearinghouse account established?', type: 'select', options: ['Yes — established', 'No — I need help setting one up first'], hint: 'This service is only for carriers with an established FMCSA Clearinghouse account.' },
  { key: 'driverName', label: 'Driver full name', section: 'Driver for this query' },
  { key: 'cdlNumber', label: 'CDL number' },
  { key: 'cdlState', label: 'CDL issuing state' },
  { key: 'queryAuth', label: 'I authorize The Trucking Business to conduct the annual FMCSA Clearinghouse query for the driver listed above.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'signature', label: 'Type your full legal name as your electronic signature' },
  { key: 'signDate', label: 'Date', type: 'date' },
];

/**
 * MCS-150 INTAKE — for the Motor Carrier Identification Report biennial update.
 */
const MCS150_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },
  { key: 'legalName', label: 'Legal business name', section: 'Your business' },
  { key: 'usdot', label: 'USDOT number' },
  { key: 'street', label: 'Street address', section: 'Updated address', hint: 'Your current principal address as it should appear on file.' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP code' },
  { key: 'trucks', label: 'Number of trucks (power units)', section: 'Fleet', type: 'number' },
  { key: 'drivers', label: 'Number of drivers', type: 'number' },
  { key: 'operation', label: 'Operation type', type: 'select', options: ['Interstate', 'Intrastate'] },
  { key: 'mcs150Auth', label: 'I authorize The Trucking Business to prepare and submit my MCS-150 biennial update on my behalf.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'signature', label: 'Type your full legal name as your electronic signature' },
  { key: 'signDate', label: 'Date', type: 'date' },
];

/** Intake registry — each product's `intake` key maps to its dedicated form. */
const INTAKES: Record<string, { title: string; intro: string; fields: FieldDef[] }> = {
  authority: {
    title: 'Operating authority intake',
    intro:
      'These are the details we need to prepare your FMCSA operating authority filings — based on the official OP-1 application, in plain language. At the end you\u2019ll authorize us to file on your behalf. Double-check spelling: filings use exactly what you enter.',
    fields: AUTHORITY_FIELDS,
  },
  compliance: {
    title: 'Compliance intake',
    intro: 'These details let us set up your compliance program correctly from day one.',
    fields: COMPLIANCE_FIELDS,
  },
  'state-permit': {
    title: 'State permit intake',
    intro:
      'These are the details we need to file your Oregon, New Mexico, or Kentucky permit application. State permit fees, if any, are billed separately.',
    fields: STATE_PERMIT_FIELDS,
  },
  motus: {
    title: 'MOTUS setup intake',
    intro:
      'These are the details we need to set up your FMCSA MOTUS account. Note: MOTUS identity verification must be completed by a company owner or officer — we\u2019ll walk you through it.',
    fields: MOTUS_FIELDS,
  },
  'clearinghouse-query': {
    title: 'Clearinghouse annual query intake',
    intro:
      'These are the details we need to run your driver\u2019s annual FMCSA Clearinghouse query. This service is only for carriers with an established Clearinghouse account.',
    fields: CLEARINGHOUSE_QUERY_FIELDS,
  },
  mcs150: {
    title: 'MCS-150 update intake',
    intro:
      'These are the details we need to file your MCS-150 biennial update and keep your carrier record current.',
    fields: MCS150_FIELDS,
  },
};

function IntakeInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const service = params.service as string;
  const orderId = search.get('order');
  const order = getOrder(orderId);

  const fields = INTAKES[service]?.fields ?? [];
  const intakeMeta = INTAKES[service];
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState<Record<string, string>>({ signDate: today });
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'schedule'>('form');

  /** Fields currently visible (conditional fields only show when their trigger matches). */
  const visibleFields = fields.filter((f) => !f.showIf || values[f.showIf.key] === f.showIf.value);

  if (!intakeMeta) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">Unknown service</h1>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-navy">Order not found</h1>
        <p className="mt-2 text-steel">Please complete checkout first — intake is linked to your order.</p>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }

  const title = intakeMeta.title;
  const intro = intakeMeta.intro;

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const current = getOrder(orderId);
    if (!current) {
      setError('Order not found. Please restart checkout.');
      return;
    }
    const missing = visibleFields.filter((f) => f.required !== false && !values[f.key]?.trim());
    if (missing.length > 0) {
      setError(`Please complete: ${missing.map((f) => f.label).join(', ')}.`);
      return;
    }
    // Only persist answers to currently-visible questions.
    const visibleKeys = new Set(visibleFields.map((f) => f.key));
    const data = Object.fromEntries(Object.entries(values).filter(([k]) => visibleKeys.has(k)));
    saveIntake(current.id, data);
    // Phase 2: persist server-side + email answers to the owner (best-effort).
    syncIntake(
      current.id,
      {
        id: current.id,
        packageName: current.packageName,
        amount: formatUSD(current.amount),
        buyerName: current.buyerName,
        buyerEmail: current.buyerEmail,
        createdAt: current.createdAt,
      },
      data,
      Object.fromEntries(visibleFields.map((f) => [f.key, f.label]))
    );
    // Phase 2: POST to /api/orders/[id]/intake -> Supabase + owner email notification
    if (current.packageSlug === 'complete') {
      // Complete Package includes a kickoff call — offer scheduling before fulfillment.
      setStep('schedule');
      return;
    }
    router.push(`/fulfillment?order=${current.id}`);
  }

  if (step === 'schedule') {
    return (
      <div className="bg-mist py-14">
        <div className="mx-auto max-w-2xl px-4">
          <p className="eyebrow">Intake received ✓</p>
          <h1 className="mt-2 text-3xl font-extrabold text-navy md:text-4xl">Want a kickoff call?</h1>
          <p className="mt-2 text-steel">
            Your Complete Package includes a one-on-one walkthrough of your filings and next steps.
            Pick a time that works for you — or skip it and we&apos;ll handle everything by email.
          </p>
          <div className="mt-6">
            <ScheduleCall
              orderId={order!.id}
              order={{
                id: order!.id,
                packageName: order!.packageName,
                amount: formatUSD(order!.amount),
                buyerName: order!.buyerName,
                buyerEmail: order!.buyerEmail,
                createdAt: order!.createdAt,
              }}
              onDone={() => router.push(`/fulfillment?order=${order!.id}`)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-mist py-14">
      <div className="mx-auto max-w-2xl px-4">
        <p className="eyebrow">Step 3 of 3 — intake</p>
        <h1 className="mt-2 text-3xl font-extrabold text-navy md:text-4xl">{title}</h1>
        <p className="mt-2 text-steel">
          Order <span className="font-bold text-charcoal">{order.id}</span> · {order.packageName}
        </p>
        <p className="mt-2 text-sm text-steel">{intro}</p>

        <form onSubmit={submit} className="card mt-6 space-y-4">
          {visibleFields.map((f, i) => (
            <div key={f.key}>
              {f.section && (i === 0 || visibleFields[i - 1].section !== f.section) && (
                <h2 className="mb-3 border-b border-slate-200 pb-2 text-lg font-extrabold text-navy">
                  {f.section}
                </h2>
              )}
              {f.type === 'checkbox' ? (
                <div>
                  <label className="flex cursor-pointer gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-[#0f2a4a]"
                      checked={values[f.key] === 'yes'}
                      onChange={(e) => set(f.key, e.target.checked ? 'yes' : '')}
                    />
                    <span className="text-sm font-medium text-charcoal">{f.label}</span>
                  </label>
                  {f.hint && <p className="ml-7 mt-1 text-xs text-steel">{f.hint}</p>}
                </div>
              ) : (
                <Field label={f.label + (f.required === false ? ' (optional)' : '')} hint={f.hint}>
                  {f.type === 'select' ? (
                    <select className="input" value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                      <option value="">Select…</option>
                      {f.options!.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      className="input"
                      rows={3}
                      value={values[f.key] ?? ''}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder="Jane Doe, CDL 1234567, TX"
                    />
                  ) : (
                    <input
                      className="input"
                      type={f.type ?? 'text'}
                      value={values[f.key] ?? ''}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                </Field>
              )}
            </div>
          ))}
          {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Submit details
          </button>
          <p className="text-center text-xs text-steel">
            Demo only — in production this is delivered to our team to start your filing.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center">Loading intake…</div>}>
      <IntakeInner />
    </Suspense>
  );
}

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getOrder, saveIntake } from '@/lib/store';
import Field from '@/components/Field';
import ScheduleCall from '@/components/ScheduleCall';

interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  type?: string;
  options?: string[];
  required?: boolean;
}

const AUTHORITY_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'legalName', label: 'Company legal name', hint: 'Exactly as registered with the state.' },
  { key: 'dba', label: 'DBA / trade name', required: false, hint: 'If different from the legal name.' },
  { key: 'structure', label: 'Business structure', type: 'select', options: ['LLC', 'Corporation', 'Sole proprietorship', 'Partnership'] },
  { key: 'ein', label: 'EIN', hint: 'Employer Identification Number from the IRS.' },
  { key: 'street', label: 'Business street address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP code', type: 'text' },
  { key: 'trucks', label: 'Number of trucks', type: 'number' },
  { key: 'drivers', label: 'Number of drivers', type: 'number' },
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

function IntakeInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const service = params.service as string;
  const orderId = search.get('order');
  const order = getOrder(orderId);

  const fields = service === 'compliance' ? COMPLIANCE_FIELDS : AUTHORITY_FIELDS;
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'schedule'>('form');

  if (service !== 'authority' && service !== 'compliance') {
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

  const title = service === 'authority' ? 'Operating authority intake' : 'Compliance intake';
  const intro =
    service === 'authority'
      ? 'These are the details we need to prepare your FMCSA filings. Double-check spelling — filings use exactly what you enter.'
      : 'These details let us set up your compliance program correctly from day one.';

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
    const missing = fields.filter((f) => f.required !== false && !values[f.key]?.trim());
    if (missing.length > 0) {
      setError(`Please complete: ${missing.map((f) => f.label).join(', ')}.`);
      return;
    }
    saveIntake(current.id, values);
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
            <ScheduleCall orderId={order!.id} onDone={() => router.push(`/fulfillment?order=${order!.id}`)} />
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
          {fields.map((f) => (
            <Field key={f.key} label={f.label + (f.required === false ? ' (optional)' : '')} hint={f.hint}>
              {f.type === 'select' ? (
                <select className="input" value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">Select…</option>
                  {f.options!.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  type={f.type ?? 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </Field>
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

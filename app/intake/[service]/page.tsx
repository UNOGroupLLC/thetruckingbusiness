'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  getOrder,
  saveIntakeSubmission,
  saveIntakeCorrection,
  certifyIntake,
  formatUSD,
  type IntakeStatus,
} from '@/lib/store';
import { syncIntake } from '@/lib/sync';
import { POA_TITLE, POA_SECTIONS } from '@/lib/poa';
import { INTAKES, US_STATES, type FieldDef } from '@/lib/intake-fields';
import Field from '@/components/Field';
import ScheduleCall from '@/components/ScheduleCall';


/* ------------------------------ phone field ------------------------------ */

const PHONE_COUNTRIES: { label: string; code: string }[] = [
  { label: 'US +1', code: '1' },
  { label: 'Canada +1', code: '1' },
  { label: 'Mexico +52', code: '52' },
  { label: 'Spain +34', code: '34' },
  { label: 'UK +44', code: '44' },
  { label: 'Colombia +57', code: '57' },
  { label: 'Peru +51', code: '51' },
  { label: 'Chile +56', code: '56' },
  { label: 'Argentina +54', code: '54' },
  { label: 'Brazil +55', code: '55' },
];

/** Known dial codes, longest first so prefix matching is unambiguous. */
const PHONE_CODES = ['52', '34', '44', '57', '51', '56', '54', '55', '1'];

/**
 * Split a stored phone value into dial code + national digits. Accepts the
 * composed format ("+1 (478) 555-0134") and legacy raw values saved before
 * this control existed ("7252446771", "17252446771"): both read as +1.
 */
function parsePhone(value: string): { code: string; digits: string } {
  const raw = (value ?? '').trim();
  const allDigits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) {
    for (const code of PHONE_CODES) {
      if (allDigits.startsWith(code)) {
        return { code, digits: allDigits.slice(code.length) };
      }
    }
    return { code: '1', digits: allDigits };
  }
  if (allDigits.length === 11 && allDigits.startsWith('1')) {
    return { code: '1', digits: allDigits.slice(1) };
  }
  return { code: '1', digits: allDigits };
}

/** Progressive (XXX) XXX-XXXX formatting for +1 numbers; plain digits otherwise. */
function formatPhoneNational(code: string, digits: string): string {
  if (code !== '1') return digits;
  const d = digits.slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length > 0) return `(${d}`;
  return '';
}

/** The stored value: country code plus the formatted number. */
function composePhone(code: string, digits: string): string {
  if (!digits) return '';
  return `+${code} ${formatPhoneNational(code, digits)}`;
}

function PhoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parsed = parsePhone(value);
  // The picked code is remembered while the field is still empty, so
  // choosing a country before typing does not snap back to +1.
  const [picked, setPicked] = useState<string | null>(null);
  const code = value ? parsed.code : picked ?? '1';
  const digits = parsed.digits;
  return (
    <div className="flex gap-2">
      <select
        className="input w-[132px] flex-none"
        aria-label="Country code"
        value={code}
        onChange={(e) => {
          const next = e.target.value;
          setPicked(next);
          onChange(composePhone(next, digits));
        }}
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.label} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        className="input min-w-0 flex-1"
        type="tel"
        value={formatPhoneNational(code, digits)}
        placeholder="(555) 555-5555"
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          const nextDigits = code === '1' ? raw.slice(0, 10) : raw.slice(0, 15);
          onChange(composePhone(code, nextDigits));
        }}
      />
    </div>
  );
}

/* ------------------------------ field defs ------------------------------- */


/**
 * Group the visible fields into wizard steps, one section per step. A
 * field starts a new step when its section differs from the step in
 * progress, so consecutive fields carrying the same section name (the
 * authority form's final step) stay together.
 */
function groupSteps(fields: FieldDef[]): { name: string; fields: FieldDef[] }[] {
  const groups: { name: string; fields: FieldDef[] }[] = [];
  for (const f of fields) {
    const last = groups[groups.length - 1];
    if (f.section && (!last || last.name !== f.section)) {
      groups.push({ name: f.section, fields: [f] });
    } else if (last) {
      last.fields.push(f);
    } else {
      groups.push({ name: '', fields: [f] });
    }
  }
  return groups;
}

function IntakeInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const service = params.service as string;
  const orderId = search.get('order');
  const order = getOrder(orderId);

  // Slug-conditional fields (the authority form's consortium items) only
  // exist on the packages that include them.
  const fields = (INTAKES[service]?.fields ?? []).filter(
    (f) => !f.onlyForPackages || f.onlyForPackages.includes(order?.packageSlug ?? '')
  );
  const intakeMeta = INTAKES[service];
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Pre-fill name/email from checkout so nothing is typed twice.
    // Saved intake answers always win when present.
    const [first = '', ...rest] = (order?.buyerName ?? '').trim().split(/\s+/);
    return {
      signDate: today,
      firstName: first,
      lastName: rest.join(' '),
      email: order?.buyerEmail ?? '',
      ...(order?.intake ?? {}),
    };
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Completed view gate: a submitted intake reopens read-only until the
  // client explicitly chooses "Make a correction".
  const [editing, setEditing] = useState(false);
  // Snapshot of the answers exactly as loaded, so a correction save can
  // tell whether anything actually changed. An unchanged save must not
  // spend the one correction.
  const initialRef = useRef(values);
  // Lifecycle: form -> (correction) -> certify -> locked. 'schedule' is the
  // Complete Package kickoff-call offer shown right after first submission.
  const [step, setStep] = useState<'form' | 'certify' | 'schedule'>(() =>
    order?.intakeStatus === 'corrected' ? 'certify' : 'form'
  );
  // Wizard position (1-based). Named wstep to stay clear of `step`, the
  // lifecycle state above.
  const [wstep, setWstep] = useState(1);
  // Certification screen state.
  const [certChecked, setCertChecked] = useState(false);
  const [certSig, setCertSig] = useState('');
  const [certDate, setCertDate] = useState(today);

  /** Fresh order on every render (store persists synchronously). */
  const fresh = getOrder(orderId);
  const status: IntakeStatus | undefined =
    fresh?.intakeStatus ?? (fresh?.intake && Object.keys(fresh.intake).length > 0 ? 'submitted' : undefined);
  const alreadySubmitted = status !== undefined;
  const correctionsUsed = fresh?.correctionsUsed ?? 0;
  const canCorrect = alreadySubmitted && correctionsUsed === 0 && status === 'submitted';
  const isLocked = status === 'certified' || status === 'filing';

  /** Fields currently visible (conditional fields only show when their trigger matches). */
  const visibleFields = fields.filter(
    (f) =>
      (!f.showIf || values[f.showIf.key] === f.showIf.value) &&
      (!f.showIfIn || f.showIfIn.values.includes(values[f.showIfIn.key] ?? ''))
  );

  // Wizard steps built from the visible fields only, so a step whose
  // fields are all hidden (Oregon vehicles, for example) never appears.
  const stepGroups = groupSteps(visibleFields);
  const currentStep = Math.min(wstep, Math.max(stepGroups.length, 1));
  const currentGroup = stepGroups[currentStep - 1];

  if (!intakeMeta) {
    return (
      <div className="sharp mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[20px] font-extrabold text-navy">Unknown service</h1>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="sharp mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[20px] font-extrabold text-navy">Order not found</h1>
        <p className="mt-2 text-steel">Please complete checkout first — intake is linked to your order.</p>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }

  const title = intakeMeta.title;
  const intro = intakeMeta.intro;

  function set(key: string, value: string) {
    setNotice('');
    setValues((v) => ({ ...v, [key]: value }));
  }

  function orderInfo() {
    const current = getOrder(orderId)!;
    return {
      id: current.id,
      packageName: current.packageName,
      amount: formatUSD(current.amount),
      buyerName: current.buyerName,
      buyerEmail: current.buyerEmail,
      createdAt: current.createdAt,
    };
  }

  /** Required visible fields in a step that are still empty. */
  function missingIn(fs: FieldDef[]): FieldDef[] {
    return fs.filter(
      (f) => f.type !== 'note' && f.required !== false && !values[f.key]?.trim()
    );
  }

  function advance() {
    const missing = missingIn(currentGroup?.fields ?? []);
    if (missing.length > 0) {
      setError(`Please complete: ${missing.map((f) => f.label).join(', ')}.`);
      return;
    }
    setError('');
    setNotice('');
    setWstep(currentStep + 1);
    window.scrollTo(0, 0);
  }

  function goBack() {
    setError('');
    setNotice('');
    setWstep(Math.max(currentStep - 1, 1));
    window.scrollTo(0, 0);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // The submit button only renders on the final step; pressing Enter
    // submits the form from any step, so advance instead of saving.
    if (currentStep < stepGroups.length) {
      advance();
      return;
    }
    const current = getOrder(orderId);
    if (!current) {
      setError('Order not found. Please restart checkout.');
      return;
    }
    const missing = missingIn(visibleFields);
    if (missing.length > 0) {
      setError(`Please complete: ${missing.map((f) => f.label).join(', ')}.`);
      return;
    }
    // Only persist answers to currently-visible questions.
    const visibleKeys = new Set(visibleFields.map((f) => f.key));
    const data = Object.fromEntries(Object.entries(values).filter(([k]) => visibleKeys.has(k)));
    const labels = Object.fromEntries(visibleFields.map((f) => [f.key, f.label]));

    const doingCorrection =
      canCorrect && current.intake && Object.keys(current.intake).length > 0;

    if (doingCorrection) {
      // An unchanged save must not spend the one correction: if every
      // answer still matches the loaded snapshot, say so and stop here.
      const changed = Object.entries(data).some(
        ([k, v]) => (v ?? '') !== (initialRef.current[k] ?? '')
      );
      if (!changed) {
        setError('');
        setNotice(
          'You did not change anything, so your answers stay exactly as you submitted them. Your one correction is still available whenever you need it.'
        );
        return;
      }
      // The one allowed correction -> v2, then certification.
      saveIntakeCorrection(current.id, data);
      syncIntake(current.id, orderInfo(), data, labels, { status: 'corrected', version: 2 });
      setError('');
      setStep('certify');
      window.scrollTo(0, 0);
      return;
    }

    saveIntakeSubmission(current.id, data);
    // Phase 2: persist server-side + email answers to the owner (best-effort).
    syncIntake(current.id, orderInfo(), data, labels, { status: 'submitted', version: 1 });
    // Phase 2: POST to /api/orders/[id]/intake -> Supabase + owner email notification
    if (current.packageSlug === 'complete') {
      // Complete Package includes a kickoff call — offer scheduling before fulfillment.
      setStep('schedule');
      return;
    }
    router.push(`/fulfillment?order=${current.id}`);
  }

  function certify(e: React.FormEvent) {
    e.preventDefault();
    const current = getOrder(orderId);
    if (!current) {
      setError('Order not found. Please restart checkout.');
      return;
    }
    if (!certChecked) {
      setError('Please check the certification box to continue.');
      return;
    }
    if (!certSig.trim() || !certDate) {
      setError('Please type your full legal name and the date.');
      return;
    }
    certifyIntake(current.id, certSig.trim(), certDate);
    const latest = getOrder(orderId);
    const data = latest?.intake ?? {};
    const labels = Object.fromEntries(fields.map((f) => [f.key, f.label]));
    const version = latest?.intakeVersions?.length ?? 2;
    syncIntake(current.id, orderInfo(), data, labels, {
      status: 'certified',
      version,
      certified: { name: certSig.trim(), date: certDate },
    });
    setError('');
    setStep('form'); // re-render -> locked view
    window.scrollTo(0, 0);
  }

  if (step === 'schedule') {
    return (
      <div className="sharp bg-mist py-14">
        <div className="mx-auto max-w-2xl px-4">
          <p className="eyebrow">Intake received ✓</p>
          <h1 className="mt-2 text-[28px] font-extrabold text-navy md:text-[36px]">Want a kickoff call?</h1>
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
                buyerPhone: values.phone ?? '',
              }}
              onDone={() => router.push(`/fulfillment?order=${order!.id}`)}
            />
          </div>
        </div>
      </div>
    );
  }

  const latestVersion = fresh?.intakeVersions?.[fresh.intakeVersions.length - 1];
  const reviewData = fresh?.intake ?? {};
  const reviewRows = fields
    .filter((f) => reviewData[f.key]?.trim())
    .map((f) => ({ label: f.label, value: reviewData[f.key] === 'yes' ? 'Yes — agreed/signed' : reviewData[f.key] }));

  if (isLocked) {
    const cert = latestVersion?.certifiedAt
      ? `${latestVersion.certifiedName} · ${latestVersion.certifiedDate}`
      : 'Certified final';
    return (
      <div className="sharp bg-mist py-14">
        <div className="mx-auto max-w-2xl px-4">
          <p className="eyebrow">Intake locked</p>
          <h1 className="mt-2 text-[28px] font-extrabold text-navy md:text-[36px]">Your intake is certified final</h1>
          <p className="mt-2 text-steel">
            Order <span className="font-bold text-charcoal">{order.id}</span> · {order.packageName}
          </p>
          <div className="mt-4 rounded-none border border-navy/20 bg-white px-4 py-3">
            <p className="text-[13.5px] font-bold text-navy">
              {status === 'certified' ? `✓ Certified · ${cert}` : `🔒 ${cert}`}
            </p>
            <p className="mt-1 text-[13.5px] text-steel">
              {status === 'filing'
                ? 'We have started your filing — your information can no longer be changed. Need a change? Contact us and we’ll handle it.'
                : 'You certified these answers as final, so they are locked and can no longer be changed. If something changes, call us at +1 (725) 244-6771 and we will help.'}
            </p>
          </div>
          <div className="card mt-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-steel">Your certified answers</p>
            <dl className="mt-3 space-y-1">
              {reviewRows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-[#dde3ec] py-2 text-[13.5px]">
                  <dt className="text-steel">{r.label}</dt>
                  <dd className="text-right font-medium text-charcoal">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    );
  }

  // Completed view (owner-approved mock v2, Oct 16, 2026): reopening a
  // submitted intake lands on a calm read-only page with the banner and
  // the answers, not the editable form. The correction starts only when
  // the client chooses "Make a correction".
  if (step === 'form' && canCorrect && !editing) {
    const submittedAt = fresh?.intakeVersions?.[0]?.submittedAt ?? order.createdAt;
    const submittedDate = new Date(submittedAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <div className="sharp bg-mist py-14">
        <div className="mx-auto max-w-2xl px-4">
          <p className="eyebrow">Step 3 of 3 — intake</p>
          <h1 className="mt-2 text-[28px] font-extrabold text-navy md:text-[36px]">{title}</h1>
          <p className="mt-2 text-steel">
            Order <span className="font-bold text-charcoal">{order.id}</span> · {order.packageName}
          </p>

          <div className="mt-5 flex items-center gap-3 border border-[#15803d] bg-[#f0faf3] px-4 py-3">
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center bg-[#15803d] font-extrabold text-white">✓</span>
            <div>
              <p className="font-bold text-[#14532d]">Completed</p>
              <p className="text-[13.5px] text-steel">Submitted on {submittedDate}.</p>
            </div>
          </div>

          <div className="mt-4 rounded-none border border-highway/60 bg-highway/10 px-4 py-3">
            <p className="text-[13.5px] font-bold text-navy">You&rsquo;ve already submitted this intake ✓</p>
            <p className="mt-1 text-[13.5px] text-steel">
              Your answers are loaded below. <strong>If everything looks right, you are done, and there is nothing else you need to do.</strong>{' '}
              Only if something is wrong: you have <strong>one correction</strong>. Edit your answers
              and save, then you will certify the corrected answers as final.
            </p>
          </div>

          <div className="card mt-6">
            <h2 className="border-b border-[#dde3ec] pb-2 text-[17px] font-extrabold text-navy">What you sent us</h2>
            <dl className="mt-3 space-y-1">
              {reviewRows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-[#dde3ec] py-2 text-[13.5px]">
                  <dt className="text-steel">{r.label}</dt>
                  <dd className="text-right font-medium text-charcoal">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 border border-[#dde3ec] bg-white px-5 py-4">
            <p className="min-w-[220px] flex-1 text-[13.5px] text-steel">
              <strong className="text-charcoal">Something above is wrong?</strong> Start your
              correction and your answers open for editing.
            </p>
            <button
              type="button"
              className="btn-outline-dark"
              onClick={() => {
                setEditing(true);
                window.scrollTo(0, 0);
              }}
            >
              Make a correction
            </button>
          </div>

          {order.packageSlug === 'complete' && (
            <div className="card mt-6">
              <h2 className="border-b border-[#dde3ec] pb-2 text-[17px] font-extrabold text-navy">Your kickoff call</h2>
              <p className="mt-2 text-[13.5px] text-steel">
                Your Complete Package includes a one-on-one walkthrough of your filings and next
                steps. Pick a time that works for you, or skip it and we will handle everything by
                email.
              </p>
              <div className="mt-4">
                <ScheduleCall
                  orderId={order.id}
                  order={{
                    id: order.id,
                    packageName: order.packageName,
                    amount: formatUSD(order.amount),
                    buyerName: order.buyerName,
                    buyerEmail: order.buyerEmail,
                    createdAt: order.createdAt,
                    buyerPhone: values.phone ?? '',
                  }}
                  onDone={() => router.push(`/fulfillment?order=${order.id}`)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'certify') {
    return (
      <div className="sharp bg-mist py-14">
        <div className="mx-auto max-w-2xl px-4">
          <p className="eyebrow">Final step — certify your corrections</p>
          <h1 className="mt-2 text-[28px] font-extrabold text-navy md:text-[36px]">Review &amp; certify</h1>
          <p className="mt-2 text-steel">
            You updated your intake. Please review the corrected answers below, then certify them as
            final. After certification your intake locks and we start your filing.
          </p>
          <div className="card mt-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-steel">Your corrected answers</p>
            <dl className="mt-3 space-y-1">
              {reviewRows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-[#dde3ec] py-2 text-[13.5px]">
                  <dt className="text-steel">{r.label}</dt>
                  <dd className="text-right font-medium text-charcoal">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <form onSubmit={certify} className="card mt-6 space-y-4">
            <label className="flex cursor-pointer gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-[#0f2a4a]"
                checked={certChecked}
                onChange={(e) => setCertChecked(e.target.checked)}
              />
              <span className="text-[13.5px] font-medium text-charcoal">
                I certify that these corrections are final and correct, and I authorize The Trucking
                Business to proceed with my filing using this information.
              </span>
            </label>
            <Field label="Type your full legal name as your electronic signature">
              <input className="input" value={certSig} onChange={(e) => setCertSig(e.target.value)} placeholder="Jane Doe" />
            </Field>
            <Field label="Date">
              <input className="input" type="date" value={certDate} onChange={(e) => setCertDate(e.target.value)} />
            </Field>
            {error && <p role="alert" className="text-[13.5px] font-semibold text-[#dc2626]">{error}</p>}
            <button type="submit" className="btn-primary w-full">Certify corrections as final</button>
            <p className="text-center text-[11px] text-steel">
              Your electronic signature is legally binding under the federal ESIGN Act.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="sharp bg-mist py-14">
      <div className="mx-auto max-w-2xl px-4">
        <p className="eyebrow">Step 3 of 3 — intake</p>
        <h1 className="mt-2 text-[28px] font-extrabold text-navy md:text-[36px]">{title}</h1>
        <p className="mt-2 text-steel">
          Order <span className="font-bold text-charcoal">{order.id}</span> · {order.packageName}
        </p>
        <p className="mt-2 text-[13.5px] text-steel">{intro}</p>
        {/* Progress indicator: one wizard step per form section. */}
        <div className="relative mx-1 mt-6">
          <div
            aria-hidden
            className="absolute left-[10%] right-[10%] top-[15px] h-[3px] rounded-none bg-[#e6ebf2]"
          >
            <div
              className="h-full rounded-none bg-navy transition-all"
              style={{
                width: `${
                  stepGroups.length > 1
                    ? ((currentStep - 1) / (stepGroups.length - 1)) * 100
                    : 100
                }%`,
              }}
            />
          </div>
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${stepGroups.length}, minmax(0, 1fr))`,
            }}
          >
            {stepGroups.map((g, i) => {
              const n = i + 1;
              const done = n < currentStep;
              const now = n === currentStep;
              return (
                <div key={g.name || n} className="text-center">
                  <span
                    className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-none text-[12.5px] font-extrabold ${
                      done
                        ? 'bg-navy text-white'
                        : now
                          ? 'bg-highway text-navy shadow-[0_0_0_4px_rgba(255,198,26,0.25)]'
                          : 'bg-[#e6ebf2] text-steel'
                    }`}
                  >
                    {done ? '✓' : n}
                  </span>
                  <p
                    className={`mt-1.5 text-[11px] leading-[1.25] ${
                      now || done
                        ? 'font-extrabold text-navy'
                        : 'font-semibold text-steel'
                    }`}
                  >
                    {g.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={submit} className="card mt-6 space-y-4">
          <h2 className="border-b border-[#dde3ec] pb-2 text-[17px] font-extrabold text-navy">
            {currentGroup?.name}
          </h2>
          {currentGroup?.fields.map((f) => (
            <div key={f.key}>
              {f.type === 'note' ? (
                <div className="rounded-none border border-[#cfe0f2] bg-[#eef4fb] px-3.5 py-3">
                  {f.label && (
                    <p className="text-[13.5px] font-bold text-navy">{f.label}</p>
                  )}
                  {f.note && (
                    <p className="mt-0.5 text-[13.5px] leading-[1.6] text-charcoal">{f.note}</p>
                  )}
                  {f.noteList && (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13.5px] leading-[1.6] text-charcoal">
                      {f.noteList.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  )}
                </div>
              ) : f.type === 'checkbox' ? (
                <div>
                  {f.poaPanel && (
                    <div className="mb-4 max-h-[230px] overflow-y-auto rounded-none border border-[#dde3ec] bg-[#fbfcfe] px-4 py-3.5">
                      <p className="text-[13.5px] font-extrabold text-navy">{POA_TITLE}</p>
                      {POA_SECTIONS.map((s) => (
                        <div key={s.heading || 'intro'}>
                          {s.heading && (
                            <p className="mt-2.5 text-[13.5px] font-bold text-navy">{s.heading}</p>
                          )}
                          <p className="mt-0.5 text-[13.5px] leading-[1.7] text-charcoal">{s.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex cursor-pointer gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-[#0f2a4a]"
                      checked={values[f.key] === 'yes'}
                      onChange={(e) => set(f.key, e.target.checked ? 'yes' : '')}
                    />
                    <span className="text-[13.5px] font-medium text-charcoal">{f.label}</span>
                  </label>
                  {f.hint && <p className="ml-7 mt-1 text-[12.5px] text-steel">{f.hint}</p>}
                </div>
              ) : (
                <Field label={f.label + (f.required === false ? ' (optional)' : '')} hint={f.hint}>
                  {f.type === 'select' || f.type === 'state' ? (
                    <select className="input" value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                      <option value="">Select…</option>
                      {(f.type === 'state' ? US_STATES : f.options!).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === 'tel' ? (
                    <PhoneInput value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
                  ) : f.type === 'textarea' ? (
                    <textarea
                      className="input"
                      rows={3}
                      value={values[f.key] ?? ''}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder ?? 'Jane Doe, CDL 1234567, TX'}
                    />
                  ) : (
                    <input
                      className="input"
                      type={f.type ?? 'text'}
                      value={values[f.key] ?? ''}
                      placeholder={f.placeholder}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                </Field>
              )}
            </div>
          ))}
          {error && <p role="alert" className="text-[13.5px] font-semibold text-[#dc2626]">{error}</p>}
          {notice && (
            <p className="border border-[#15803d] bg-[#f0faf3] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#14532d]">{notice}</p>
          )}
          <div className="flex gap-2.5">
            {currentStep > 1 && (
              <button type="button" className="btn-outline-dark" onClick={goBack}>
                Back
              </button>
            )}
            {currentStep < stepGroups.length ? (
              <button type="button" className="btn-primary flex-1" onClick={advance}>
                Continue
              </button>
            ) : (
              <button type="submit" className="btn-primary flex-1">
                {alreadySubmitted ? 'Save corrections' : 'Submit'}
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-steel">
            Your answers go straight to our team so we can start your filing.
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

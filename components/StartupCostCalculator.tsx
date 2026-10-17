'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Data model: ported 1:1 from TRUCKING_START_UP_CALCULATOR.html      */
/* ------------------------------------------------------------------ */

interface CalcItem {
  id: string;
  name: string;
  note: string;
  value: number;
  type: 'official' | 'variable';
  perTruck?: boolean;
  perDriver?: boolean;
  interstate?: boolean;
}

const BUSINESS_ITEMS: CalcItem[] = [
  { id: 'businessFormation', name: 'LLC / Corporation Formation & State Filing', value: 150, type: 'variable', note: 'Varies by state and business structure.' },
  { id: 'ein', name: 'EIN', value: 0, type: 'official', note: 'Applying for an EIN directly with the IRS is free.' },
  { id: 'usdot', name: 'USDOT Number', value: 0, type: 'official', note: 'FMCSA does not charge a fee to obtain a USDOT number.' },
  { id: 'authority', name: 'Motor Carrier Operating Authority', value: 300, type: 'official', note: '$300 for each individual type of operating authority requested.', interstate: true },
  { id: 'boc3', name: 'BOC-3 Filing / Process Agent', value: 50, type: 'variable', note: 'Provider cost; varies by service.', interstate: true },
  { id: 'setupHelp', name: 'Professional Trucking Business Setup Service', value: 0, type: 'variable', note: 'Optional. Enter your quote here if you use professional assistance.' },
];

const EQUIPMENT_ITEMS: CalcItem[] = [
  { id: 'truckDown', name: 'Truck Down Payment or Purchase', value: 3500, type: 'variable', note: 'Amount per truck.', perTruck: true },
  { id: 'trailerDown', name: 'Trailer Down Payment or Purchase', value: 2000, type: 'variable', note: 'Amount per trailer.', perTruck: true },
  { id: 'initialMaintenance', name: 'Initial Maintenance, Repairs & Inspection', value: 2500, type: 'variable', note: 'Initial preparation allowance per truck.', perTruck: true },
  { id: 'safety', name: 'Safety Equipment & Supplies', value: 400, type: 'variable', note: 'Fire extinguisher, warning triangles, and other applicable supplies.', perTruck: true },
  { id: 'eldSetup', name: 'ELD Equipment / Initial Activation', value: 40, type: 'variable', note: 'Price depends on provider and plan.', perTruck: true },
  { id: 'gps', name: 'GPS, Tablet & Other Electronics', value: 20, type: 'variable', note: 'Optional.', perTruck: true },
];

const PERMIT_ITEMS: CalcItem[] = [
  { id: 'insuranceDown', name: 'Commercial Insurance Down Payment', value: 3500, type: 'variable', note: 'Replace with your actual insurance quote.', perTruck: true },
  { id: 'hvut', name: 'HVUT 2290', value: 550, type: 'variable', note: 'Editable estimate; actual tax depends on the vehicle and its use.', perTruck: true },
  { id: 'irp', name: 'IRP Registration', value: 1800, type: 'variable', note: 'Varies by jurisdiction and other factors.', perTruck: true, interstate: true },
  { id: 'ifta', name: 'IFTA Account / Decals', value: 20, type: 'variable', note: 'Fees and procedures depend on the jurisdiction.', interstate: true },
  { id: 'statePermits', name: 'Additional State Permits', value: 0, type: 'variable', note: 'Only when applicable to your routes and operation.', interstate: true },
  { id: 'titlePlate', name: 'Title, Plates, Registration & State Fees', value: 200, type: 'variable', note: 'Varies by state and vehicle.', perTruck: true },
  { id: 'markings', name: 'USDOT / Legal Name Markings', value: 80, type: 'variable', note: 'Marking cost per truck.', perTruck: true },
];

const COMPLIANCE_ITEMS: CalcItem[] = [
  { id: 'drugProgram', name: 'DOT Drug & Alcohol Program / Consortium', value: 90, type: 'variable', note: 'When 49 CFR Part 382 requirements apply.', perDriver: true },
  { id: 'preDrug', name: 'Pre-Employment Drug Test', value: 70, type: 'variable', note: 'Per CDL driver when required.', perDriver: true },
  { id: 'clearinghouse', name: 'Clearinghouse Query / Compliance Service', value: 25, type: 'variable', note: 'Use the actual provider or query cost.', perDriver: true },
  { id: 'mvr', name: 'MVR / Driving Record Review', value: 25, type: 'variable', note: 'Per driver; fees depend on the source/state.', perDriver: true },
  { id: 'medical', name: 'DOT Medical Examination', value: 125, type: 'variable', note: 'If the driver does not have a current medical certificate.', perDriver: true },
  { id: 'dqFile', name: 'Driver Qualification File Setup', value: 0, type: 'variable', note: 'Enter software or service cost if using a provider.', perDriver: true },
  { id: 'vehicleInspection', name: 'Periodic Vehicle Inspection', value: 100, type: 'variable', note: 'Estimated cost per vehicle.', perTruck: true },
];

const MONTHLY_ITEMS: CalcItem[] = [
  { id: 'truckPayment', name: 'Monthly Truck Payment', value: 1300, type: 'variable', note: 'Per truck.', perTruck: true },
  { id: 'trailerPayment', name: 'Monthly Trailer Payment', value: 500, type: 'variable', note: 'Per trailer.', perTruck: true },
  { id: 'insuranceMonthly', name: 'Monthly Insurance Premium', value: 1800, type: 'variable', note: 'Per truck. Replace with your actual quote.', perTruck: true },
  { id: 'fuel', name: 'Fuel', value: 4200, type: 'variable', note: 'Estimated monthly amount per truck.', perTruck: true },
  { id: 'maintenanceReserve', name: 'Maintenance & Tire Reserve', value: 950, type: 'variable', note: 'Estimated monthly amount per truck.', perTruck: true },
  { id: 'eldMonthly', name: 'ELD / Fleet Software', value: 40, type: 'variable', note: 'Per truck.', perTruck: true },
  { id: 'tollsParking', name: 'Tolls, Scales & Parking', value: 300, type: 'variable', note: 'Estimated monthly amount per truck.', perTruck: true },
  { id: 'driverPay', name: 'Driver Pay / Owner Compensation', value: 4000, type: 'variable', note: 'Per driver.', perDriver: true },
  { id: 'dispatch', name: 'Dispatch / Operations Management', value: 0, type: 'variable', note: 'Enter your monthly cost if applicable.' },
  { id: 'bookkeeping', name: 'Accounting, Bookkeeping & Software', value: 150, type: 'variable', note: 'Estimated monthly amount.' },
  { id: 'phone', name: 'Phone & Internet', value: 100, type: 'variable', note: 'Estimated monthly amount.' },
  { id: 'otherMonthly', name: 'Other Monthly Expenses', value: 100, type: 'variable', note: 'Office, banking, subscriptions, and other expenses.' },
];

const ALL_ITEMS: CalcItem[] = [
  ...BUSINESS_ITEMS,
  ...EQUIPMENT_ITEMS,
  ...PERMIT_ITEMS,
  ...COMPLIANCE_ITEMS,
  ...MONTHLY_ITEMS,
];

interface RowState {
  enabled: boolean;
  amount: number;
}

function initialRows(): Record<string, RowState> {
  const out: Record<string, RowState> = {};
  for (const item of ALL_ITEMS) {
    out[item.id] = { enabled: true, amount: item.value };
  }
  return out;
}

const money = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/* UCR 2027 fee brackets: FMCSA final rule 91 FR 56063; 2027 registration year opened Oct 1, 2026.
 * The visitor picks their fleet size bracket; the fee follows the bracket. */
const UCR_BRACKETS: { label: string; max: number; fee: number }[] = [
  { label: '0 to 2 trucks', max: 2, fee: 55 },
  { label: '3 to 5 trucks', max: 5, fee: 167 },
  { label: '6 to 20 trucks', max: 20, fee: 333 },
  { label: '21 to 100 trucks', max: 100, fee: 1163 },
  { label: '101 to 1,000 trucks', max: 1000, fee: 5548 },
  { label: '1,001 or more trucks', max: Number.POSITIVE_INFINITY, fee: 54165 },
];

function ucrBracketIndex(count: number): number {
  const idx = UCR_BRACKETS.findIndex((b) => count <= b.max);
  return idx >= 0 ? idx : UCR_BRACKETS.length - 1;
}

/** Round shares of a total to whole percents that sum to exactly 100
 *  (any rounding drift lands on the largest segment). Null when the
 *  total is not positive, so the UI can show a dash instead of NaN. */
function normalizedPercents(values: number[]): number[] | null {
  const total = values.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return null;
  const pcts = values.map((v) => Math.round((v / total) * 100));
  const diff = 100 - pcts.reduce((a, b) => a + b, 0);
  if (diff !== 0) {
    let idx = 0;
    values.forEach((v, i) => {
      if (v > values[idx]) idx = i;
    });
    pcts[idx] += diff;
  }
  return pcts;
}

/* ------------------------------------------------------------------ */
/* Palette (approved prototype tokens)                                 */
/* ------------------------------------------------------------------ */

const NAVY = '#0a1a36';
const NAVY2 = '#0f2a5c';
const BLUE = '#1755a8';
const YELLOW = '#ffc61a';
const LINE = '#e3e8f0';
const HEADING = "'Libre Franklin', sans-serif";

/* ------------------------------------------------------------------ */
/* Presentational pieces                                               */
/* ------------------------------------------------------------------ */

function StepProgress({
  steps,
  current,
  done,
}: {
  steps: string[];
  current: number;
  done?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] font-bold text-[#0a1a36]">
          {done ? 'Your results' : steps[current - 1]}
        </span>
        <span className="whitespace-nowrap text-[12.5px] font-semibold text-[#5b6b84]">
          {done ? 'Complete' : `Step ${current} of ${steps.length}`}
        </span>
      </div>
      <div className="mt-[14px] grid grid-cols-3 gap-2 sm:grid-cols-6">
        {steps.map((name, i) => {
          const n = i + 1;
          const isCurrent = !done && n === current;
          const filled = done || n <= current;
          return (
            <div key={name}>
              <div
                className="whitespace-nowrap pb-[9px] text-[12.5px]"
                style={{
                  color: isCurrent ? NAVY : filled ? '#3d4f6d' : '#93a1b5',
                  fontWeight: isCurrent ? 800 : 600,
                  overflow: 'hidden',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: filled ? NAVY : '#dde4ee',
                    color: filled ? '#ffffff' : '#5b6b84',
                    fontSize: 11,
                    fontWeight: 800,
                    marginRight: 7,
                    verticalAlign: 'middle',
                  }}
                >
                  {n}
                </span>
                {name}
              </div>
              <div
                className="h-[4px] rounded-none"
                style={{ background: filled ? NAVY : '#dde4ee' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WizardCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-none border bg-white px-6 py-8 sm:px-10 sm:py-[38px]"
      style={{ borderColor: LINE, boxShadow: '0 14px 34px rgba(10,26,54,0.06)' }}
    >
      <h3
        className="text-[20px] font-extrabold text-[#0a1a36]"
        style={{ fontFamily: HEADING, letterSpacing: '-0.01em' }}
      >
        {title}
      </h3>
      <p className="mt-[7px] text-[15px] leading-relaxed text-[#5b6b84]">{description}</p>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-none border-l-4 border-[#ffc61a] bg-[#fff8e1] px-4 py-3 text-[13.5px] leading-relaxed text-[#5a4b2e]">
      {children}
    </div>
  );
}

function CostRow({
  item,
  state,
  disabledByOperation,
  total,
  period,
  onToggle,
  onAmount,
}: {
  item: CalcItem;
  state: RowState;
  disabledByOperation: boolean;
  total: number;
  period: 'one-time' | 'monthly';
  onToggle: (id: string, enabled: boolean) => void;
  onAmount: (id: string, amount: number) => void;
}) {
  const multiplier = item.perTruck ? ' × trucks' : item.perDriver ? ' × drivers' : '';
  return (
    <div
      className={`grid grid-cols-1 items-center gap-3 rounded-none border border-[#e3e8f0] bg-white p-4 transition sm:grid-cols-[minmax(0,1fr)_170px] sm:gap-4 ${
        disabledByOperation ? 'opacity-60' : ''
      }`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <label className="relative mt-0.5 inline-flex h-6 w-[42px] shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={state.enabled}
            disabled={disabledByOperation}
            onChange={(e) => onToggle(item.id, e.target.checked)}
            aria-label={`Include ${item.name}`}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-none bg-[#cbd5e3] transition-colors peer-checked:bg-[#1755a8] peer-disabled:cursor-not-allowed peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#1755a8]"
          />
          <span
            aria-hidden="true"
            className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-none bg-white shadow transition-transform peer-checked:translate-x-[18px]"
          />
        </label>
        <div className="min-w-0">
          <div className="text-[13.5px] font-bold text-[#16233c]">{item.name}</div>
          <div className="mt-0.5 text-[12.5px] leading-relaxed text-[#5b6b84]">{item.note}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="inline-block whitespace-nowrap rounded-none bg-[#eef1f6] px-[9px] py-[3px] text-[11px] font-bold uppercase tracking-[0.06em] text-[#3d4f6d]">
              {period === 'one-time' ? 'One-time' : 'Per month'}
            </span>
            {item.type === 'official' ? (
              <span className="inline-block rounded-none bg-green-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-green-800">
                Federal Fee / Official $0
              </span>
            ) : (
              <span className="inline-block rounded-none bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-800">
                Editable Estimate
              </span>
            )}
            {disabledByOperation && (
              <span className="inline-block rounded-none bg-slate-200 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                Interstate only
              </span>
            )}
          </div>
        </div>
      </div>
      <div>
        <div className="relative">
          <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b6b84]">
            $
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={state.amount}
            disabled={disabledByOperation}
            onChange={(e) => {
              const n = Number(e.target.value);
              onAmount(item.id, Number.isFinite(n) ? Math.max(0, n) : 0);
            }}
            aria-label={`Cost of ${item.name}`}
            className="w-full rounded-none border-[1.5px] border-[#ccd6e4] bg-white py-[10px] pl-7 pr-3 text-right text-[15px] font-semibold text-[#0a1a36] outline-none focus:border-[#1755a8] disabled:cursor-not-allowed disabled:bg-[#f0f3f7]"
          />
        </div>
        <div className="mt-1 text-left text-[12.5px] text-[#5b6b84] sm:text-right">
          Total{multiplier}: <strong className="text-[#0a1a36]">{money(total)}</strong>
        </div>
      </div>
    </div>
  );
}

/** "Email my results" panel shown under the results. */
function EmailResultsPanel({
  calculator,
  headline,
  lines,
  blurb,
  data,
}: {
  calculator: 'cost-per-mile' | 'startup';
  headline: string;
  lines: string[];
  blurb: string;
  data?: Record<string, unknown>;
}) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/calculators/email-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculator,
          email: email.trim(),
          headline,
          lines,
          data,
          company_website: website,
        }),
      });
      const resp = await res.json().catch(() => null);
      if (!res.ok || !resp?.ok) {
        setError(
          resp?.error ||
            'We could not send your results. Please email us directly at hello@thetruckingbusiness.com and we will send them over.'
        );
        return;
      }
      setSent(true);
    } catch {
      setError(
        'We could not send your results. Please email us directly at hello@thetruckingbusiness.com and we will send them over.'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-none p-[28px] text-white" style={{ background: NAVY }}>
      <h4
        className="text-[17px] font-extrabold"
        style={{ fontFamily: HEADING, letterSpacing: '-0.01em' }}
      >
        Want a copy of your numbers?
      </h4>
      {sent ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#c9d6ea]">
          Your results are on their way to {email.trim()}.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-[#c9d6ea]">{blurb}</p>
          <form onSubmit={submit}>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Your email"
                className="min-w-[220px] flex-1 rounded-none border border-white/25 bg-white/[0.08] px-4 py-3 text-[15px] text-white outline-none placeholder:text-[#8fa3c4] focus:border-[#ffc61a]"
              />
              <button
                type="submit"
                disabled={sending}
                className="rounded-none px-[22px] py-3 text-[14px] font-bold text-[#0a1a36] disabled:opacity-60"
                style={{ background: YELLOW, boxShadow: '0 8px 24px rgba(255,198,26,0.35)' }}
              >
                {sending ? 'Sending...' : 'Email my results'}
              </button>
            </div>
            {/* Honeypot: hidden from humans, bots fill it and get a silent success. */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <label>
                Company website
                <input
                  type="text"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-[13.5px] font-semibold text-[#ffb4b4]">
                {error}
              </p>
            ) : null}
          </form>
          <p className="mt-3 text-[12.5px] text-[#8296b3]">
            One email with your results. No spam, and you are not signing up for anything else.
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

const STEP_NAMES = [
  'Your operation',
  'Formation & FMCSA',
  'Truck & equipment',
  'Insurance & permits',
  'Driver compliance',
  'Monthly costs',
];

const STEP_TITLES = [
  'Your operation',
  'Business Formation & FMCSA',
  'Truck, Trailer & Equipment',
  'Insurance, Taxes, Registration & Permits',
  'Driver & DOT Compliance',
  'Monthly Operating Costs',
];

const STEP_DESCRIPTIONS = [
  'These answers automatically adjust several costs in the calculator.',
  'Includes basic registrations to establish the business and, when applicable, obtain federal operating authority.',
  'If you finance the equipment, enter only the down payment needed to get started. If you purchase it with cash, enter the full purchase price.',
  'These amounts can vary significantly by state, vehicle, weight, operating history, cargo type, and insurance company.',
  'Common compliance costs before placing a driver and vehicle into operation.',
  'Use your own figures if you already have quotes. These expenses are used to calculate your operating reserve.',
];

const CONFIG_LABEL = 'mb-[9px] block text-[13.5px] font-bold text-[#16233c]';
const CONFIG_INPUT =
  'w-full rounded-none border-[1.5px] border-[#ccd6e4] bg-white px-[18px] py-[14px] text-[17px] font-semibold text-[#0a1a36] outline-none focus:border-[#1755a8]';

export default function StartupCostCalculator() {
  const [truckCount, setTruckCount] = useState(1);
  const [driverCount, setDriverCount] = useState(1);
  const [operationType, setOperationType] = useState<'interstate' | 'intrastate'>('interstate');
  const [reserveMonths, setReserveMonths] = useState(3);
  const [ucrBracket, setUcrBracket] = useState(() => ucrBracketIndex(1));
  const [rows, setRows] = useState<Record<string, RowState>>(initialRows);
  const [step, setStep] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const wizardRef = useRef<HTMLDivElement | null>(null);
  const emailPanelRef = useRef<HTMLDivElement | null>(null);

  const scrollToEmail = () => {
    emailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = emailPanelRef.current?.querySelector(
      'input[type=email]'
    ) as HTMLInputElement | null;
    input?.focus({ preventScroll: true });
  };

  const interstate = operationType === 'interstate';

  const toggleRow = (id: string, enabled: boolean) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], enabled } }));

  const setRowAmount = (id: string, amount: number) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], amount } }));

  const itemTotal = (item: CalcItem): number => {
    const st = rows[item.id];
    if (!st) return 0;
    if (item.interstate && !interstate) return 0;
    if (!st.enabled) return 0;
    let total = Math.max(0, st.amount || 0);
    if (item.perTruck) total *= truckCount;
    if (item.perDriver) total *= driverCount;
    return total;
  };

  const categoryTotal = (items: CalcItem[]): number => items.reduce((sum, item) => sum + itemTotal(item), 0);

  const business = categoryTotal(BUSINESS_ITEMS);
  const equipment = categoryTotal(EQUIPMENT_ITEMS);
  const permitsBase = categoryTotal(PERMIT_ITEMS);
  const ucr = interstate ? UCR_BRACKETS[ucrBracket].fee : 0;
  const permits = permitsBase + ucr;
  const compliance = categoryTotal(COMPLIANCE_ITEMS);
  const monthly = categoryTotal(MONTHLY_ITEMS);

  const reserve = monthly * reserveMonths;
  const startup = business + equipment + permits + compliance;
  const grand = startup + reserve;

  const monthText = reserveMonths === 1 ? '1 month' : `${reserveMonths} months`;

  const alreadyOwn = () => {
    setRowAmount('truckDown', 0);
    setRowAmount('trailerDown', 0);
  };

  const resetAll = () => {
    setTruckCount(1);
    setDriverCount(1);
    setOperationType('interstate');
    setReserveMonths(3);
    setUcrBracket(ucrBracketIndex(1));
    setRows(initialRows());
  };

  const scrollToWizard = () => {
    wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const seeResults = () => {
    setShowResults(true);
    scrollToWizard();
  };

  const backToCalculator = () => {
    setShowResults(false);
    setStep(6);
    scrollToWizard();
  };

  const renderRows = (items: CalcItem[], period: 'one-time' | 'monthly') => (
    <div className="grid gap-2.5">
      {items.map((item) => (
        <CostRow
          key={item.id}
          item={item}
          state={rows[item.id]}
          disabledByOperation={Boolean(item.interstate) && !interstate}
          total={itemTotal(item)}
          period={period}
          onToggle={toggleRow}
          onAmount={setRowAmount}
        />
      ))}
    </div>
  );

  /* Live preview shares for the hero card, from the same live totals.
   * The overview headline is the one-time startup cost only; the reserve
   * stays out of it and appears at the bottom of the card as a
   * recommendation (owner ruling, Oct 16, 2026). */
  const segValues = [equipment, permits + compliance, business];
  const segPcts = normalizedPercents(segValues);
  const hasTotal = startup > 0;
  const segColors = ['#ffc61a', '#eef1f6', '#c9a227'];
  const segLabels = ['Truck and equipment', 'Insurance, permits and compliance', 'Business and FMCSA'];

  const truckWord = truckCount === 1 ? 'one truck' : `${truckCount} trucks`;
  const driverWord = driverCount === 1 ? 'one driver' : `${driverCount} drivers`;
  const finePrint = `An example startup with ${truckWord} and ${driverWord}, ${
    interstate ? 'running interstate' : 'running intrastate only'
  }. Your numbers will differ.`;

  const emailLines = [
    `Operation: ${truckCount} ${truckCount === 1 ? 'truck' : 'trucks'}, ${driverCount} ${
      driverCount === 1 ? 'driver' : 'drivers'
    }, ${interstate ? 'Interstate' : 'Intrastate only'}`,
    `Business and FMCSA: ${money(business)}`,
    `Truck and equipment: ${money(equipment)}`,
    `Insurance, registration and permits: ${money(permits)}`,
    `Driver and compliance: ${money(compliance)}`,
    `One-time startup costs: ${money(startup)}`,
    `Estimated monthly cost: ${money(monthly)}`,
    `Safety buffer (${monthText}, recommended): ${money(reserve)}`,
    `Estimated start-up capital: ${money(startup)}`,
    `Total with buffer: ${money(grand)}`,
  ];

  /* Plain-language results groupings (approved mock 4). Start-up capital is
   * the one-time money only; the reserve is a separate recommended buffer. */
  const driverPayItem = MONTHLY_ITEMS.find((i) => i.id === 'driverPay');
  const driverPayTotal = driverPayItem ? itemTotal(driverPayItem) : 0;
  const monthTextCap = monthText.charAt(0).toUpperCase() + monthText.slice(1);
  const coverSegs: {
    label: string;
    desc: string;
    color: string;
    darkText?: boolean;
    value: number;
  }[] = [
    { label: 'Truck and equipment', desc: 'down payments, first repairs, safety gear', color: '#7d9cc4', value: equipment },
    { label: 'Insurance and permits', desc: 'getting legal to roll', color: BLUE, value: permits },
    { label: 'Business and FMCSA', desc: 'formation, authority, filings', color: '#48648c', value: business },
    { label: 'Driver and compliance', desc: 'testing, consortium, medical, files', color: '#b9c8dc', darkText: true, value: compliance },
  ];
  const coverPcts = normalizedPercents(coverSegs.map((s) => s.value));
  const coverRows: { label: string; desc: string; color: string; value: number }[] = [
    { label: 'Business and FMCSA', desc: 'formation, authority, filings', color: '#48648c', value: business },
    { label: 'Truck and equipment', desc: 'down payments, first repairs, safety gear', color: '#7d9cc4', value: equipment },
    { label: 'Insurance, registration and permits', desc: 'getting legal to roll', color: BLUE, value: permits },
    { label: 'Driver and compliance', desc: 'testing, consortium, medical, files', color: '#b9c8dc', value: compliance },
  ];

  const startupBreakdownItems: [string, string][] = [
    [
      'Operation',
      `${truckCount} ${truckCount === 1 ? 'truck' : 'trucks'}, ${driverCount} ${
        driverCount === 1 ? 'driver' : 'drivers'
      }, ${interstate ? 'Interstate' : 'Intrastate only'}`,
    ],
    ['Business and FMCSA', money(business)],
    ['Truck and equipment', money(equipment)],
    ['Insurance, registration and permits', money(permits)],
    ['Driver and compliance', money(compliance)],
    ['One-time startup costs', money(startup)],
    ['Estimated monthly cost', money(monthly)],
    [`Safety buffer, ${monthText} (recommended)`, money(reserve)],
    ['Estimated start-up capital', money(startup)],
    ['Total with buffer', money(grand)],
  ];

  /** Structured payload for the redesigned results email (mock 3). */
  const startupEmailData: Record<string, unknown> = {
    kind: 'startup',
    capital: money(startup),
    coverRows: [
      ['Business and FMCSA', money(business)],
      ['Truck and equipment', money(equipment)],
      ['Insurance, registration and permits', money(permits)],
      ['Driver and compliance', money(compliance)],
    ],
    monthly: money(monthly),
    buffer: money(reserve),
    bufferMonths: monthText,
    readyMoney: money(grand),
    operation: `${truckCount} ${truckCount === 1 ? 'truck' : 'trucks'}, ${driverCount} ${
      driverCount === 1 ? 'driver' : 'drivers'
    }, ${interstate ? 'Interstate' : 'Intrastate only'}`,
  };

  const breakdownRows: [string, string][] = [
    ['Business & FMCSA', money(business)],
    ['Truck & Equipment', money(equipment)],
    ['Insurance, Registration & Permits', money(permits)],
    ['Driver & Compliance', money(compliance)],
    ['Estimated Monthly Cost', money(monthly)],
  ];

  return (
    <div className="w-full">
      {/* Hero */}
      <section
        className="rounded-none px-6 py-12 text-white sm:px-10 sm:py-14"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 88%)` }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-none px-3 py-[7px] text-[12.5px] font-semibold text-white"
              style={{
                background: 'rgba(255,255,255,0.09)',
                border: '1px solid rgba(255,255,255,0.16)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-none"
                style={{ background: YELLOW, boxShadow: '0 0 0 5px rgba(255,198,26,0.18)' }}
              />
              Free startup cost calculator
            </span>
            <h1
              className="mt-[22px] max-w-[560px] font-black text-white"
              style={{
                fontFamily: HEADING,
                fontSize: 'clamp(40px, 5vw, 56px)',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
              }}
            >
              Know your number{' '}
              <em style={{ fontStyle: 'normal', color: YELLOW }}>before you start.</em>
            </h1>
            <p className="mt-[18px] max-w-[520px] text-[17px] leading-[1.55] text-[#dbe4f2]">
              This calculator adds up everything it takes to launch: forming your company, the
              truck, insurance, permits, compliance, and the cash reserve that keeps you running
              until the first freight checks land.
            </p>
            <p className="mt-4 max-w-[480px] text-[13.5px] leading-[1.55] text-[#93a5c2]">
              One-time costs and monthly costs are labeled on every line, so you always know what
              you are entering.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="btn btn-y" onClick={scrollToWizard}>
                Start the calculator
              </button>
              <Link href="/resources/blog/how-to-start-a-trucking-company" className="btn btn-ghost">
                See how it works
              </Link>
            </div>
          </div>

          {/* Live preview card */}
          <div
            className="rounded-none p-7 sm:p-8"
            style={{
              background: 'rgba(255,255,255,0.055)',
              border: '1px solid rgba(255,255,255,0.16)',
              backdropFilter: 'blur(8px)',
            }}
            aria-live="polite"
          >
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#8fa3c4]">
              <span>Preview</span>
              <span>Your startup breakdown</span>
            </div>
            <div className="mt-[18px] flex items-end justify-between gap-4">
              <div>
                <div className="text-[13.5px] text-[#c3d0e4]">Estimated capital to start</div>
                <div
                  className="mt-1.5 text-[52px] font-black leading-none"
                  style={{ fontFamily: HEADING, color: YELLOW, letterSpacing: '-0.01em' }}
                >
                  {hasTotal ? money(startup) : '-'}
                </div>
              </div>
              <div className="pb-1.5 text-right">
                <div className="text-[12.5px] text-[#8fa3c4]">Monthly costs</div>
                <div className="mt-[3px] text-[17px] font-bold text-white">
                  {hasTotal ? `${money(monthly)} / mo` : '-'}
                </div>
              </div>
            </div>
            <div
              className="mt-6 flex h-[13px] overflow-hidden rounded-none"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              {segColors.map((color, i) => (
                <div
                  key={color}
                  style={{ width: `${segPcts ? segPcts[i] : 0}%`, background: color, height: '100%' }}
                />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-x-[22px] gap-y-[9px] sm:grid-cols-2">
              {segLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-[9px] text-[13.5px] text-[#dbe4f2]">
                  <span
                    className="h-[10px] w-[10px] shrink-0 rounded-none"
                    style={{ background: segColors[i] }}
                  />
                  {label}
                  <span className="ml-auto pl-2 font-bold text-white">
                    {segPcts ? `${segPcts[i]}%` : '-'}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.16)' }}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#8fa3c4]">
                  Safety buffer · Recommendation
                </span>
                <span className="text-[17px] font-bold text-white">
                  {hasTotal ? money(reserve) : '-'}
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#8296b3]">
                {monthTextCap} of monthly costs set aside. Recommended, but not part of the startup
                cost above. With the buffer, your ready money would be {money(grand)}.
              </p>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#8296b3]">{finePrint}</p>
          </div>
        </div>
      </section>

      {/* Wizard */}
      <div ref={wizardRef} className="mx-auto mt-14 w-full max-w-[820px] scroll-mt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5b6b84]">
          The calculator
        </p>
        <h2
          className="mt-2.5 font-black text-[#0a1a36]"
          style={{ fontFamily: HEADING, fontSize: 'clamp(26px, 4vw, 35px)', letterSpacing: '-0.015em' }}
        >
          Your startup cost, step by step
        </h2>

        <div className="mt-[38px]">
          <StepProgress steps={STEP_NAMES} current={step} done={showResults} />
        </div>

        {showResults ? (
          <div className="mt-[26px]" aria-live="polite">
            {/* (a) The answer: one-time start-up capital only (approved mock 4) */}
            <section
              className="rounded-none p-[30px] text-white sm:p-8"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 88%)` }}
            >
              <p className="text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-[#9fb4d8]">
                Estimated start-up capital
              </p>
              <p
                className="mt-[10px] font-black leading-none"
                style={{ fontFamily: HEADING, fontSize: 56, letterSpacing: '-0.02em' }}
              >
                {money(startup)}
              </p>
              <p className="mt-[10px] max-w-[560px] text-[14.5px] leading-[1.6] text-[#dbe4f2]">
                Everything it costs to open your company and put your truck on the road, paid
                once. Your monthly running costs and a recommended safety buffer are below, kept
                separate on purpose so the starting number stays honest.
              </p>
            </section>

            {/* (b) Running costs + the recommended buffer, side by side */}
            <div className="mt-[14px] grid gap-[14px] sm:grid-cols-2">
              <section
                className="rounded-none border bg-white p-6"
                style={{ borderColor: LINE, borderTop: `5px solid ${NAVY}` }}
              >
                <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5b6b84]">
                  To keep running
                </p>
                <p
                  className="mt-2 font-black text-[#0a1a36]"
                  style={{ fontFamily: HEADING, fontSize: 40 }}
                >
                  {money(monthly)}{' '}
                  <small className="text-[15px] font-bold text-[#5b6b84]">a month</small>
                </p>
                <p className="mt-2 text-[13.5px] leading-[1.6] text-[#33415c]">
                  What the truck costs every month once you are rolling: payments, insurance,
                  fuel, driver pay, and the rest of the monthly bills.
                </p>
                <p
                  className="mt-[10px] border-t pt-[10px] text-[12.5px] text-[#5b6b84]"
                  style={{ borderColor: LINE }}
                >
                  This is separate from your start-up capital. It is what the business has to
                  cover every month.
                </p>
              </section>
              <section
                className="rounded-none bg-white p-6"
                style={{ border: '1.5px dashed #8fa5c4', borderTop: '5px solid #7d9cc4' }}
              >
                <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5b6b84]">
                  Safety buffer · Recommendation
                </p>
                <p
                  className="mt-2 font-black text-[#0a1a36]"
                  style={{ fontFamily: HEADING, fontSize: 40 }}
                >
                  {money(reserve)}{' '}
                  <small className="text-[15px] font-bold text-[#5b6b84]">{monthText}</small>
                </p>
                <p className="mt-2 text-[13.5px] leading-[1.6] text-[#33415c]">
                  {monthTextCap} of running costs set aside before you start, so a slow first
                  month, a repair, or a late paying broker does not end the business.
                </p>
                <p
                  className="mt-3 border-l-[3px] bg-[#eef2f8] px-3 py-[9px] text-[12.5px] leading-[1.55] text-[#33415c]"
                  style={{ borderColor: BLUE }}
                >
                  <strong>Recommendation only.</strong> This buffer is not part of your start-up
                  capital. You can start without it, but most new carriers are glad they had it.
                </p>
              </section>
            </div>

            {/* (c) What the start money covers */}
            <section
              className="mt-[14px] rounded-none border bg-white p-6"
              style={{ borderColor: LINE }}
            >
              <h3
                className="text-[17px] font-extrabold text-[#0a1a36]"
                style={{ fontFamily: HEADING }}
              >
                What the start money covers
              </h3>
              <p className="mb-4 mt-1.5 text-[13px] leading-[1.55] text-[#5b6b84]">
                Your {money(startup)} of start-up capital, group by group. This is the money
                that gets you legal and rolling.
              </p>
              <div className="mb-[18px] flex h-[30px]" aria-hidden="true">
                {coverSegs.map((s, i) => (
                  <div
                    key={s.label}
                    className="flex h-full items-center justify-center text-[12.5px] font-extrabold"
                    style={{
                      width: `${coverPcts ? coverPcts[i] : 0}%`,
                      background: s.color,
                      color: s.darkText ? '#22314f' : '#ffffff',
                    }}
                  >
                    {coverPcts
                      ? coverPcts[i] >= 15
                        ? `${s.label} ${coverPcts[i]}%`
                        : `${coverPcts[i]}%`
                      : ''}
                  </div>
                ))}
              </div>
              {coverRows.map((r, i) => (
                <div
                  key={r.label}
                  className="flex items-baseline gap-3 py-[11px] text-[13.5px]"
                  style={i > 0 ? { borderTop: `1px solid ${LINE}` } : undefined}
                >
                  <span
                    aria-hidden="true"
                    className="relative top-[1px] h-[10px] w-[10px] flex-none"
                    style={{ background: r.color }}
                  />
                  <span className="flex-1 leading-[1.45] text-[#33415c]">
                    <strong className="text-[#0e1728]">{r.label}</strong>: {r.desc}
                  </span>
                  <span className="whitespace-nowrap font-extrabold text-[#0a1a36]">
                    {money(r.value)}
                  </span>
                </div>
              ))}
              <div
                className="flex items-baseline gap-3 py-[11px] text-[14.5px]"
                style={{ borderTop: `2px solid ${NAVY}` }}
              >
                <span className="flex-1 font-extrabold text-[#0e1728]">
                  Estimated start-up capital
                </span>
                <span className="whitespace-nowrap font-extrabold text-[#0a1a36]">
                  {money(startup)}
                </span>
              </div>
              <p className="mb-1 mt-[18px] text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5b6b84]">
                If you add the recommended buffer
              </p>
              <div
                className="flex items-baseline gap-3 py-[11px] text-[13.5px]"
                style={{ borderTop: `1px solid ${LINE}` }}
              >
                <span className="flex-1 leading-[1.45] text-[#33415c]">
                  Start-up capital {money(startup)}, plus the safety buffer of {money(reserve)}
                </span>
                <span className="whitespace-nowrap font-extrabold text-[#0a1a36]">
                  {money(grand)} in ready money
                </span>
              </div>
            </section>

            {/* (d) Your startup in plain numbers */}
            <section
              className="mt-[14px] rounded-none border bg-white p-6"
              style={{ borderColor: LINE }}
            >
              <h3
                className="text-[17px] font-extrabold text-[#0a1a36]"
                style={{ fontFamily: HEADING }}
              >
                Your startup in plain numbers
              </h3>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-[#5b6b84]">
                The four numbers behind the result, with nothing hidden.
              </p>
              {[
                {
                  n: money(startup),
                  t: 'paid once, before your first load: the company, the truck, the insurance setup, and the driver setup. This is your start-up capital.',
                },
                {
                  n: money(monthly),
                  t: `is what the truck costs each month once you are rolling, with the driver paying himself ${money(driverPayTotal)} of it.`,
                },
                {
                  n: money(reserve),
                  t: `is the recommended safety buffer, ${monthText} of running costs. It is not part of your start-up capital.`,
                },
                {
                  n: money(grand),
                  t: 'is the full ready money if you follow the buffer recommendation: start-up capital and buffer together.',
                },
              ].map((row, i) => (
                <div
                  key={row.n + row.t}
                  className="flex items-baseline gap-[14px] py-3"
                  style={i > 0 ? { borderTop: `1px solid ${LINE}` } : undefined}
                >
                  <span
                    className="min-w-[118px] text-center text-[22px] font-extrabold text-[#0a1a36]"
                    style={{ fontFamily: HEADING }}
                  >
                    {row.n}
                  </span>
                  <span className="text-[13.5px] leading-[1.55] text-[#33415c]">{row.t}</span>
                </div>
              ))}
            </section>

            {/* (e) Actions */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToEmail}
                className="rounded-none px-[22px] py-[13px] text-[14px] font-extrabold text-[#0a1a36]"
                style={{ background: YELLOW, boxShadow: '0 8px 24px rgba(255,198,26,0.35)' }}
              >
                Email my results
              </button>
              <button
                type="button"
                onClick={backToCalculator}
                className="rounded-none border-[1.5px] border-[#0a1a36] px-[22px] py-3 text-[14px] font-bold text-[#0a1a36] transition hover:bg-[#0a1a36] hover:text-white"
              >
                Back to the calculator
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="px-2 py-3 text-[14px] font-semibold text-[#5b6b84] transition hover:text-[#0a1a36]"
              >
                Reset
              </button>
            </div>

            {/* (f) Full breakdown */}
            <section
              className="mt-[22px] rounded-none border border-dashed bg-white px-[22px] py-[18px]"
              style={{ borderColor: '#a9b7cc' }}
            >
              <p className="mb-3 text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#5b6b84]">
                Want every number? The full breakdown
              </p>
              <div className="grid gap-x-[22px] gap-y-[10px] sm:grid-cols-2 lg:grid-cols-3">
                {startupBreakdownItems.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-3 border-b pb-[5px] text-[12.5px]"
                    style={{ borderColor: '#eef2f8' }}
                  >
                    <span className="text-[#5b6b84]">{label}</span>
                    <strong className="whitespace-nowrap text-[#0e1728]">{value}</strong>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-[#5b6b84]">
                Change any amount to use your actual quotes. Yellow values are editable estimates.
              </p>
            </section>

            <div ref={emailPanelRef} className="mt-[26px] scroll-mt-6">
              <EmailResultsPanel
                calculator="startup"
                headline={`Estimated start-up capital: ${money(startup)}`}
                lines={emailLines}
                data={startupEmailData}
                blurb="Enter your email and we will send your full breakdown: every cost you entered, your one-time total, your monthly costs, and the recommended safety buffer. We also save a copy, so if you ever want help with the next step, we already have your numbers in front of us."
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mt-[26px]">
              <WizardCard title={STEP_TITLES[step - 1]} description={STEP_DESCRIPTIONS[step - 1]}>
                {step === 1 ? (
                  <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="calc-truckCount" className={CONFIG_LABEL}>
                          Number of Trucks
                        </label>
                        <input
                          id="calc-truckCount"
                          type="number"
                          min={1}
                          max={5000}
                          step={1}
                          value={truckCount}
                          onChange={(e) => setTruckCount(clampInt(Number(e.target.value), 1, 5000))}
                          onBlur={(e) => setTruckCount(clampInt(Number(e.target.value), 1, 5000))}
                          className={CONFIG_INPUT}
                        />
                      </div>
                      <div>
                        <label htmlFor="calc-driverCount" className={CONFIG_LABEL}>
                          Number of Drivers
                        </label>
                        <input
                          id="calc-driverCount"
                          type="number"
                          min={1}
                          max={5000}
                          step={1}
                          value={driverCount}
                          onChange={(e) => setDriverCount(clampInt(Number(e.target.value), 1, 5000))}
                          onBlur={(e) => setDriverCount(clampInt(Number(e.target.value), 1, 5000))}
                          className={CONFIG_INPUT}
                        />
                      </div>
                      <div>
                        <label htmlFor="calc-operationType" className={CONFIG_LABEL}>
                          Type of Operation
                        </label>
                        <select
                          id="calc-operationType"
                          value={operationType}
                          onChange={(e) =>
                            setOperationType(e.target.value === 'intrastate' ? 'intrastate' : 'interstate')
                          }
                          className={CONFIG_INPUT}
                        >
                          <option value="interstate">Interstate</option>
                          <option value="intrastate">Intrastate Only</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="calc-reserveMonths" className={CONFIG_LABEL}>
                          Operating Reserve
                        </label>
                        <select
                          id="calc-reserveMonths"
                          value={reserveMonths}
                          onChange={(e) => setReserveMonths(clampInt(Number(e.target.value), 1, 6))}
                          className={CONFIG_INPUT}
                        >
                          <option value={1}>1 month</option>
                          <option value={2}>2 months</option>
                          <option value={3}>3 months</option>
                          <option value={4}>4 months</option>
                          <option value={6}>6 months</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-5 flex items-start gap-2.5 rounded-none border border-[#ecd28a] bg-[#fff8e1] px-4 py-3 text-[13.5px] leading-relaxed text-[#624c21]">
                      <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-none bg-[#ffc61a]" />
                      <div>
                        <strong>Tip:</strong> The cost of starting does not end when you obtain your operating
                        authority. A trucking company also needs cash for fuel, insurance, maintenance,
                        equipment payments, and other expenses while waiting to collect payment on its first loads.
                      </div>
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <Notice>
                      <strong>Important:</strong> The current FMCSA filing fee for each individual operating
                      authority is <strong>$300</strong>. Obtaining a USDOT number directly from FMCSA has no
                      federal filing fee. Third-party service providers may charge additional fees.
                    </Notice>
                    {renderRows(BUSINESS_ITEMS, 'one-time')}
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    {renderRows(EQUIPMENT_ITEMS, 'one-time')}
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={alreadyOwn}
                        className="rounded-none border-[1.5px] border-[#0a1a36] px-[22px] py-3 text-[13.5px] font-bold text-[#0a1a36] transition hover:bg-[#0a1a36] hover:text-white"
                      >
                        I Already Own My Truck &amp; Trailer
                      </button>
                    </div>
                  </>
                ) : null}

                {step === 4 ? (
                  <>
                    <Notice>
                      Form 2290 generally applies to highway motor vehicles with a taxable gross weight of{' '}
                      <strong>55,000 pounds or more</strong>. The actual tax may vary, and suspension and
                      prorating rules may apply.
                    </Notice>
                    {renderRows(PERMIT_ITEMS, 'one-time')}
                    <div className="mt-2.5">
                      {interstate ? (
                        <div
                          className="flex flex-col gap-3 rounded-none bg-[#f6f7f9] p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                          style={{ border: '1px solid rgba(23,85,168,0.25)' }}
                        >
                          <div>
                            <strong className="text-[15px] text-[#0a1a36]">2027 UCR Registration</strong>
                            <div className="mt-1 text-[12.5px] leading-relaxed text-[#5b6b84]">
                              Choose your fleet size. The official 2027 fee for that bracket is what you pay.
                            </div>
                            <span className="mt-1.5 inline-block rounded-none bg-green-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-green-800">
                              Official 2027 Fee
                            </span>
                          </div>
                          <div className="w-full sm:w-[240px]">
                            <label htmlFor="calc-ucrBracket" className="sr-only">
                              UCR fleet size bracket
                            </label>
                            <select
                              id="calc-ucrBracket"
                              value={ucrBracket}
                              onChange={(e) => setUcrBracket(Number(e.target.value))}
                              className="w-full rounded-none border-[1.5px] border-[#ccd6e4] bg-white px-3 py-[10px] text-[15px] font-semibold text-[#0a1a36] outline-none focus:border-[#1755a8]"
                            >
                              {UCR_BRACKETS.map((b, i) => (
                                <option key={b.label} value={i}>
                                  {b.label} ({money(b.fee)})
                                </option>
                              ))}
                            </select>
                            <div className="mt-1 text-left text-[12.5px] text-[#5b6b84] sm:text-right">
                              Fee: <strong className="text-[#0a1a36]">{money(ucr)}</strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 rounded-none border border-[#e3e8f0] bg-white p-4 opacity-60 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                          <div>
                            <strong className="text-[15px] text-[#0a1a36]">2027 UCR Registration</strong>
                            <div className="mt-1 text-[12.5px] leading-relaxed text-[#5b6b84]">
                              Not automatically added when &quot;Intrastate Only&quot; is selected. Verify
                              whether UCR applies to your operation.
                            </div>
                            <span className="mt-1.5 inline-block rounded-none bg-green-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-green-800">
                              Official 2027 Fee
                            </span>
                          </div>
                          <div
                            className="text-[20px] font-extrabold text-[#0a1a36]"
                            style={{ fontFamily: HEADING }}
                          >
                            $0
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}

                {step === 5 ? renderRows(COMPLIANCE_ITEMS, 'one-time') : null}

                {step === 6 ? renderRows(MONTHLY_ITEMS, 'monthly') : null}

                <div className="mt-7 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => step > 1 && setStep(step - 1)}
                    disabled={step === 1}
                    className="px-1 py-2.5 text-[13.5px] font-semibold text-[#a5b1c2] transition enabled:text-[#5b6b84] enabled:hover:text-[#0a1a36] disabled:cursor-default"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => (step < 6 ? setStep(step + 1) : seeResults())}
                    aria-label={step < 6 ? 'Continue' : undefined}
                    className={
                      step < 6
                        ? 'rounded-none px-[24px] py-[13px] text-[15px] font-bold text-[#0a1a36]'
                        : 'rounded-none px-[34px] py-[15px] text-[15px] font-bold text-[#0a1a36]'
                    }
                    style={{ background: YELLOW, boxShadow: '0 10px 22px rgba(255,198,26,0.3)' }}
                  >
                    {step < 6 ? (
                      <span aria-hidden="true" className="text-[22px] font-black leading-none">
                        &gt;
                      </span>
                    ) : (
                      'See my results'
                    )}
                  </button>
                </div>
              </WizardCard>
            </div>

            {/* Live summary chip */}
            <div
              className="mt-[18px] flex flex-wrap items-center justify-between gap-3 rounded-none px-[22px] py-[15px] text-white"
              style={{ background: NAVY }}
              aria-live="polite"
            >
              <span className="text-[13.5px] text-[#c3d0e4]">Your startup total updates as you go.</span>
              <span className="text-right">
                <span
                  className="whitespace-nowrap text-[20px] font-black"
                  style={{ fontFamily: HEADING, color: YELLOW }}
                >
                  {money(startup)}
                  <small className="ml-[7px] text-[12.5px] font-semibold text-[#8fa3c4]">
                    estimated startup cost
                  </small>
                </span>
                <span className="block text-[12.5px] font-semibold text-[#8fa3c4]">
                  With the recommended buffer: {money(grand)}
                </span>
              </span>
            </div>

            {/* Reassurance row */}
            <div className="mt-[30px] flex flex-wrap justify-center gap-x-11 gap-y-3.5">
              {['One step at a time', 'One-time and monthly, clearly labeled', 'Change any answer later'].map(
                (t) => (
                  <span
                    key={t}
                    className="flex items-center gap-[9px] text-[13.5px] font-semibold text-[#5b6b84]"
                  >
                    <span
                      className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-none text-[11px] font-extrabold"
                      style={{ background: '#e7eefb', color: BLUE }}
                    >
                      ✓
                    </span>
                    {t}
                  </span>
                )
              )}
            </div>
          </>
        )}

        {/* Compliance notice + official references */}
        <section
          className="mt-[26px] rounded-none border border-[#e3e8f0] bg-white p-6 text-[12.5px] leading-relaxed text-[#5b6b84]"
        >
          <strong className="text-[#0a1a36]">Compliance Notice:</strong> This calculator is an educational
          planning tool and does not constitute a quote, legal advice, or an official determination
          of requirements. Insurance, IRP, IFTA, registration, state permits, testing, equipment, and
          professional service costs vary. Always confirm applicable requirements with FMCSA, the IRS,
          and your state agencies before operating.
          <br />
          <br />
          <strong className="text-[#0a1a36]">Official References:</strong>{' '}
          <a href="https://www.fmcsa.dot.gov/" target="_blank" rel="noopener" className="font-bold text-[#1755a8] underline">
            FMCSA
          </a>{' '}
          ·{' '}
          <a href="https://plan.ucr.gov/" target="_blank" rel="noopener" className="font-bold text-[#1755a8] underline">
            UCR Plan
          </a>{' '}
          ·{' '}
          <a
            href="https://www.irs.gov/forms-pubs/about-form-2290"
            target="_blank"
            rel="noopener"
            className="font-bold text-[#1755a8] underline"
          >
            IRS Form 2290
          </a>
        </section>
      </div>
    </div>
  );
}

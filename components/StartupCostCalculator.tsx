'use client';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/* Data model — ported 1:1 from TRUCKING_START_UP_CALCULATOR.html      */
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
  { id: 'truckDown', name: 'Truck Down Payment or Purchase', value: 15000, type: 'variable', note: 'Amount per truck.', perTruck: true },
  { id: 'trailerDown', name: 'Trailer Down Payment or Purchase', value: 5000, type: 'variable', note: 'Amount per trailer.', perTruck: true },
  { id: 'initialMaintenance', name: 'Initial Maintenance, Repairs & Inspection', value: 2500, type: 'variable', note: 'Initial preparation allowance per truck.', perTruck: true },
  { id: 'safety', name: 'Safety Equipment & Supplies', value: 400, type: 'variable', note: 'Fire extinguisher, warning triangles, and other applicable supplies.', perTruck: true },
  { id: 'eldSetup', name: 'ELD Equipment / Initial Activation', value: 250, type: 'variable', note: 'Price depends on provider and plan.', perTruck: true },
  { id: 'gps', name: 'GPS, Tablet & Other Electronics', value: 500, type: 'variable', note: 'Optional.', perTruck: true },
];

const PERMIT_ITEMS: CalcItem[] = [
  { id: 'insuranceDown', name: 'Commercial Insurance Down Payment', value: 3500, type: 'variable', note: 'Replace with your actual insurance quote.', perTruck: true },
  { id: 'hvut', name: 'Form 2290 / HVUT', value: 550, type: 'variable', note: 'Editable estimate; actual tax depends on the vehicle and its use.', perTruck: true },
  { id: 'irp', name: 'IRP Registration', value: 1800, type: 'variable', note: 'Varies by jurisdiction and other factors.', perTruck: true, interstate: true },
  { id: 'ifta', name: 'IFTA Account / Decals', value: 20, type: 'variable', note: 'Fees and procedures depend on the jurisdiction.', interstate: true },
  { id: 'statePermits', name: 'Additional State Permits', value: 300, type: 'variable', note: 'Only when applicable to your routes and operation.', interstate: true },
  { id: 'titlePlate', name: 'Title, Plates, Registration & State Fees', value: 500, type: 'variable', note: 'Varies by state and vehicle.', perTruck: true },
  { id: 'markings', name: 'USDOT / Legal Name Markings', value: 150, type: 'variable', note: 'Marking cost per truck.', perTruck: true },
];

const COMPLIANCE_ITEMS: CalcItem[] = [
  { id: 'drugProgram', name: 'DOT Drug & Alcohol Program / Consortium', value: 150, type: 'variable', note: 'When 49 CFR Part 382 requirements apply.', perDriver: true },
  { id: 'preDrug', name: 'Pre-Employment Drug Test', value: 75, type: 'variable', note: 'Per CDL driver when required.', perDriver: true },
  { id: 'clearinghouse', name: 'Clearinghouse Query / Compliance Service', value: 25, type: 'variable', note: 'Use the actual provider or query cost.', perDriver: true },
  { id: 'mvr', name: 'MVR / Driving Record Review', value: 25, type: 'variable', note: 'Per driver; fees depend on the source/state.', perDriver: true },
  { id: 'medical', name: 'DOT Medical Examination', value: 125, type: 'variable', note: 'If the driver does not have a current medical certificate.', perDriver: true },
  { id: 'dqFile', name: 'Driver Qualification File Setup', value: 0, type: 'variable', note: 'Enter software or service cost if using a provider.', perDriver: true },
  { id: 'vehicleInspection', name: 'Periodic Vehicle Inspection', value: 125, type: 'variable', note: 'Estimated cost per vehicle.', perTruck: true },
];

const MONTHLY_ITEMS: CalcItem[] = [
  { id: 'truckPayment', name: 'Monthly Truck Payment', value: 2200, type: 'variable', note: 'Per truck.', perTruck: true },
  { id: 'trailerPayment', name: 'Monthly Trailer Payment', value: 700, type: 'variable', note: 'Per trailer.', perTruck: true },
  { id: 'insuranceMonthly', name: 'Monthly Insurance Premium', value: 1800, type: 'variable', note: 'Per truck. Replace with your actual quote.', perTruck: true },
  { id: 'fuel', name: 'Fuel', value: 5500, type: 'variable', note: 'Estimated monthly amount per truck.', perTruck: true },
  { id: 'maintenanceReserve', name: 'Maintenance & Tire Reserve', value: 1200, type: 'variable', note: 'Estimated monthly amount per truck.', perTruck: true },
  { id: 'eldMonthly', name: 'ELD / Fleet Software', value: 50, type: 'variable', note: 'Per truck.', perTruck: true },
  { id: 'tollsParking', name: 'Tolls, Scales & Parking', value: 500, type: 'variable', note: 'Estimated monthly amount per truck.', perTruck: true },
  { id: 'driverPay', name: 'Driver Pay / Owner Compensation', value: 0, type: 'variable', note: 'Per driver.', perDriver: true },
  { id: 'dispatch', name: 'Dispatch / Operations Management', value: 0, type: 'variable', note: 'Enter your monthly cost if applicable.' },
  { id: 'bookkeeping', name: 'Accounting, Bookkeeping & Software', value: 250, type: 'variable', note: 'Estimated monthly amount.' },
  { id: 'phone', name: 'Phone & Internet', value: 150, type: 'variable', note: 'Estimated monthly amount.' },
  { id: 'otherMonthly', name: 'Other Monthly Expenses', value: 500, type: 'variable', note: 'Office, banking, subscriptions, and other expenses.' },
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

/* UCR 2027 fee brackets — FMCSA final rule 91 FR 56063; 2027 registration year opened Oct 1, 2026 */
function ucrFee(count: number): number {
  if (count <= 2) return 55;
  if (count <= 5) return 167;
  if (count <= 20) return 333;
  if (count <= 100) return 1163;
  if (count <= 1000) return 5548;
  return 54165;
}

/* ------------------------------------------------------------------ */
/* Presentational pieces                                               */
/* ------------------------------------------------------------------ */

function StepCard({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(11,46,79,0.08)]">
      <div className="flex items-start gap-3 px-5 pt-5 sm:px-6">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-base font-extrabold text-white"
        >
          {step}
        </div>
        <div>
          <h2 className="text-lg font-extrabold uppercase leading-tight text-navy sm:text-xl">{title}</h2>
          <p className="mt-1 text-sm text-steel">{description}</p>
        </div>
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">{children}</div>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border-l-4 border-highway bg-amber-50 px-4 py-3 text-sm leading-relaxed text-[#5a4b2e]">
      {children}
    </div>
  );
}

function CostRow({
  item,
  state,
  disabledByOperation,
  total,
  onToggle,
  onAmount,
}: {
  item: CalcItem;
  state: RowState;
  disabledByOperation: boolean;
  total: number;
  onToggle: (id: string, enabled: boolean) => void;
  onAmount: (id: string, amount: number) => void;
}) {
  const multiplier = item.perTruck ? ' × trucks' : item.perDriver ? ' × drivers' : '';
  return (
    <div
      className={`grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 p-3 transition sm:grid-cols-[minmax(0,1fr)_160px] sm:gap-4 ${
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
            className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-dotblue peer-disabled:cursor-not-allowed peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-dotblue"
          />
          <span
            aria-hidden="true"
            className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform peer-checked:translate-x-[18px]"
          />
        </label>
        <div className="min-w-0">
          <div className="text-sm font-bold text-charcoal">{item.name}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-steel">{item.note}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.type === 'official' ? (
              <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-800">
                Federal Fee / Official $0
              </span>
            ) : (
              <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                Editable Estimate
              </span>
            )}
            {disabledByOperation && (
              <span className="inline-block rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
                Interstate only
              </span>
            )}
          </div>
        </div>
      </div>
      <div>
        <div className="relative">
          <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-steel">
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
            className="input pl-7 text-right disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
        <div className="mt-1 text-left text-xs text-steel sm:text-right">
          Total{multiplier}: <strong>{money(total)}</strong>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function StartupCostCalculator() {
  const [truckCount, setTruckCount] = useState(1);
  const [driverCount, setDriverCount] = useState(1);
  const [operationType, setOperationType] = useState<'interstate' | 'intrastate'>('interstate');
  const [reserveMonths, setReserveMonths] = useState(3);
  const [rows, setRows] = useState<Record<string, RowState>>(initialRows);

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
  const ucr = interstate ? ucrFee(truckCount) : 0;
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
    setRows(initialRows());
  };

  const renderRows = (items: CalcItem[]) => (
    <div className="grid gap-2.5">
      {items.map((item) => (
        <CostRow
          key={item.id}
          item={item}
          state={rows[item.id]}
          disabledByOperation={Boolean(item.interstate) && !interstate}
          total={itemTotal(item)}
          onToggle={toggleRow}
          onAmount={setRowAmount}
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-4 sm:px-4 sm:py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-dotblue-dark px-6 py-8 text-white shadow-[0_8px_24px_rgba(11,46,79,0.18)] sm:px-8 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[18px] border-highway/20"
        />
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
          The Trucking Business • Planning Tool
        </span>
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
          Trucking Business Start-Up Cost Calculator
        </h1>
        <p className="mt-3 max-w-3xl text-base text-white/85">
          Estimate the capital you need to form your trucking company, buy or finance equipment,
          get insured and permitted, and meet DOT compliance — plus the operating reserve to run
          until your first loads pay.
        </p>
      </section>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="grid min-w-0 gap-5">
          {/* Step 1 — Operation config */}
          <StepCard
            step={1}
            title="Configure Your Operation"
            description="These answers automatically adjust several costs in the calculator."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label htmlFor="calc-truckCount" className="mb-1.5 block text-sm font-bold text-charcoal">
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
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="calc-driverCount" className="mb-1.5 block text-sm font-bold text-charcoal">
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
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="calc-operationType" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Type of Operation
                </label>
                <select
                  id="calc-operationType"
                  value={operationType}
                  onChange={(e) =>
                    setOperationType(e.target.value === 'intrastate' ? 'intrastate' : 'interstate')
                  }
                  className="input"
                >
                  <option value="interstate">Interstate</option>
                  <option value="intrastate">Intrastate Only</option>
                </select>
              </div>
              <div>
                <label htmlFor="calc-reserveMonths" className="mb-1.5 block text-sm font-bold text-charcoal">
                  Operating Reserve
                </label>
                <select
                  id="calc-reserveMonths"
                  value={reserveMonths}
                  onChange={(e) => setReserveMonths(clampInt(Number(e.target.value), 1, 6))}
                  className="input"
                >
                  <option value={1}>1 month</option>
                  <option value={2}>2 months</option>
                  <option value={3}>3 months</option>
                  <option value={4}>4 months</option>
                  <option value={6}>6 months</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-[#624c21]">
              <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-highway" />
              <div>
                <strong>Tip:</strong> The cost of starting does not end when you obtain your operating
                authority. A trucking company also needs cash for fuel, insurance, maintenance,
                equipment payments, and other expenses while waiting to collect payment on its first loads.
              </div>
            </div>
          </StepCard>

          {/* Step 2 — Business formation & FMCSA */}
          <StepCard
            step={2}
            title="Business Formation & FMCSA"
            description="Includes basic registrations to establish the business and, when applicable, obtain federal operating authority."
          >
            <Notice>
              <strong>Important:</strong> The current FMCSA filing fee for each individual operating
              authority is <strong>$300</strong>. Obtaining a USDOT number directly from FMCSA has no
              federal filing fee. Third-party service providers may charge additional fees.
            </Notice>
            {renderRows(BUSINESS_ITEMS)}
          </StepCard>

          {/* Step 3 — Truck, trailer & equipment */}
          <StepCard
            step={3}
            title="Truck, Trailer & Equipment"
            description="If you finance the equipment, enter only the down payment needed to get started. If you purchase it with cash, enter the full purchase price."
          >
            {renderRows(EQUIPMENT_ITEMS)}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button type="button" onClick={alreadyOwn} className="btn-outline-dark text-sm">
                I Already Own My Truck &amp; Trailer
              </button>
            </div>
          </StepCard>

          {/* Step 4 — Insurance, taxes, registration & permits */}
          <StepCard
            step={4}
            title="Insurance, Taxes, Registration & Permits"
            description="These amounts can vary significantly by state, vehicle, weight, operating history, cargo type, and insurance company."
          >
            <Notice>
              Form 2290 generally applies to highway motor vehicles with a taxable gross weight of{' '}
              <strong>55,000 pounds or more</strong>. The actual tax may vary, and suspension and
              prorating rules may apply.
            </Notice>
            {renderRows(PERMIT_ITEMS)}
            <div className="mt-2.5">
              {interstate ? (
                <div className="flex flex-col gap-3 rounded-xl border border-dotblue/25 bg-mist p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div>
                    <strong className="text-navy">2027 UCR Registration</strong>
                    <div className="mt-1 text-xs leading-relaxed text-steel">
                      Fee automatically calculated based on the number of vehicles entered ({truckCount}).
                    </div>
                    <span className="mt-1.5 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-800">
                      Official 2027 Fee
                    </span>
                  </div>
                  <div className="text-xl font-extrabold text-navy sm:text-lg">{money(ucr)}</div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 opacity-60 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div>
                    <strong className="text-navy">2027 UCR Registration</strong>
                    <div className="mt-1 text-xs leading-relaxed text-steel">
                      Not automatically added when &quot;Intrastate Only&quot; is selected. Verify
                      whether UCR applies to your operation.
                    </div>
                    <span className="mt-1.5 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-800">
                      Official 2027 Fee
                    </span>
                  </div>
                  <div className="text-xl font-extrabold text-navy sm:text-lg">$0</div>
                </div>
              )}
            </div>
          </StepCard>

          {/* Step 5 — Driver & DOT compliance */}
          <StepCard
            step={5}
            title="Driver & DOT Compliance"
            description="Common compliance costs before placing a driver and vehicle into operation."
          >
            {renderRows(COMPLIANCE_ITEMS)}
          </StepCard>

          {/* Step 6 — Monthly operating costs */}
          <StepCard
            step={6}
            title="Monthly Operating Costs"
            description="Use your own figures if you already have quotes. These expenses are used to calculate your operating reserve."
          >
            {renderRows(MONTHLY_ITEMS)}
          </StepCard>

          {/* Bottom total bar */}
          <section
            aria-live="polite"
            className="rounded-2xl bg-gradient-to-br from-navy to-dotblue-dark p-5 text-white sm:p-6"
          >
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <h3 className="text-lg font-extrabold sm:text-xl">ESTIMATED START-UP CAPITAL</h3>
                <p className="mt-1.5 max-w-2xl text-sm text-white/80">
                  Includes selected start-up expenses plus an operating reserve of {monthText}.
                </p>
              </div>
              <div className="text-left text-3xl font-extrabold sm:text-right">{money(grand)}</div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={resetAll} className="btn-outline-dark text-sm">
              Reset Calculator
            </button>
          </div>

          {/* Compliance notice + official references */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-steel sm:p-6">
            <strong className="text-navy">Compliance Notice:</strong> This calculator is an educational
            planning tool and does not constitute a quote, legal advice, or an official determination
            of requirements. Insurance, IRP, IFTA, registration, state permits, testing, equipment, and
            professional service costs vary. Always confirm applicable requirements with FMCSA, the IRS,
            and your state agencies before operating.
            <br />
            <br />
            <strong className="text-navy">Official References:</strong>{' '}
            <a href="https://www.fmcsa.dot.gov/" target="_blank" rel="noopener" className="font-bold text-dotblue underline">
              FMCSA
            </a>{' '}
            ·{' '}
            <a href="https://plan.ucr.gov/" target="_blank" rel="noopener" className="font-bold text-dotblue underline">
              UCR Plan
            </a>{' '}
            ·{' '}
            <a
              href="https://www.irs.gov/forms-pubs/about-form-2290"
              target="_blank"
              rel="noopener"
              className="font-bold text-dotblue underline"
            >
              IRS Form 2290
            </a>
          </section>
        </main>

        {/* Sticky summary sidebar */}
        <aside
          aria-live="polite"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(11,46,79,0.08)] lg:sticky lg:top-4"
        >
          <div className="bg-navy p-5 text-white">
            <div className="text-xs font-bold uppercase tracking-wider text-white/75">
              Estimated Start-Up Capital
            </div>
            <div className="mt-1 break-words text-4xl font-extrabold leading-tight">{money(grand)}</div>
          </div>
          <div className="p-5">
            <dl>
              <div className="flex justify-between gap-4 border-b border-slate-200 py-2.5 text-sm">
                <dt className="text-steel">Business &amp; FMCSA</dt>
                <dd className="text-right font-bold text-charcoal">{money(business)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 py-2.5 text-sm">
                <dt className="text-steel">Truck &amp; Equipment</dt>
                <dd className="text-right font-bold text-charcoal">{money(equipment)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 py-2.5 text-sm">
                <dt className="text-steel">Insurance, Registration &amp; Permits</dt>
                <dd className="text-right font-bold text-charcoal">{money(permits)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 py-2.5 text-sm">
                <dt className="text-steel">Driver &amp; Compliance</dt>
                <dd className="text-right font-bold text-charcoal">{money(compliance)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-200 py-2.5 text-sm">
                <dt className="text-steel">Estimated Monthly Cost</dt>
                <dd className="text-right font-bold text-charcoal">{money(monthly)}</dd>
              </div>
            </dl>
            <div className="mt-3.5 rounded-xl border border-slate-200 bg-mist p-3.5">
              <div className="text-xs text-steel">Operating Reserve</div>
              <div className="text-lg font-extrabold text-charcoal">{money(reserve)}</div>
              <div className="mt-1 text-xs text-steel">{monthText} of operating expenses</div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-steel">
              Change any amount to use your actual quotes. Yellow values are editable estimates.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

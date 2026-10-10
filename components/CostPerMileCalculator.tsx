"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Field registry — every input ported 1:1 from the source HTML file  */
/* ------------------------------------------------------------------ */

type FieldKey =
  | "loadedMiles"
  | "deadheadMiles"
  | "mpg"
  | "dieselPrice"
  | "fuelMonthly"
  | "truckPayment"
  | "trailerPayment"
  | "insurance"
  | "eld"
  | "parking"
  | "office"
  | "permits"
  | "otherFixed"
  | "def"
  | "maintenance"
  | "tires"
  | "tolls"
  | "road"
  | "driverPay"
  | "otherVariable"
  | "dispatch"
  | "factoring"
  | "compliance"
  | "businessOther"
  | "profitMargin";

/** Original default values straight from the source HTML (used by RESET). */
const DEFAULT_VALUES: Record<FieldKey, number> = {
  loadedMiles: 8500,
  deadheadMiles: 1500,
  mpg: 6.5,
  dieselPrice: 3.75,
  fuelMonthly: 0,
  truckPayment: 2500,
  trailerPayment: 700,
  insurance: 1800,
  eld: 100,
  parking: 200,
  office: 250,
  permits: 150,
  otherFixed: 0,
  def: 150,
  maintenance: 1200,
  tires: 400,
  tolls: 300,
  road: 200,
  driverPay: 0,
  otherVariable: 0,
  dispatch: 0,
  factoring: 0,
  compliance: 0,
  businessOther: 0,
  profitMargin: 20,
};

interface FieldDef {
  key: FieldKey;
  label: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}

const MILES_FIELDS: FieldDef[] = [
  { key: "loadedMiles", label: "Loaded Miles", hint: "Miles driven while hauling a load.", step: 1 },
  {
    key: "deadheadMiles",
    label: "Empty / Deadhead Miles",
    hint: "Miles driven without a load, including miles traveled to pick up the next load.",
    step: 1,
  },
];

const FUEL_ESTIMATE_FIELDS: FieldDef[] = [
  { key: "mpg", label: "Average Truck Fuel Economy (MPG)", hint: "Example: 6.5 MPG.", min: 0.1, step: 0.1 },
  { key: "dieselPrice", label: "Average Diesel Price per Gallon ($)", step: 0.01 },
];

const FUEL_MANUAL_FIELDS: FieldDef[] = [
  { key: "fuelMonthly", label: "Actual Monthly Fuel Expense ($)", step: 0.01 },
];

const FIXED_FIELDS: FieldDef[] = [
  { key: "truckPayment", label: "Truck Payment ($)" },
  { key: "trailerPayment", label: "Trailer Payment ($)" },
  { key: "insurance", label: "Monthly Insurance ($)" },
  { key: "eld", label: "ELD, Tracking & Technology ($)" },
  { key: "parking", label: "Parking ($)" },
  { key: "office", label: "Subscriptions, Office & Software ($)" },
  {
    key: "permits",
    label: "Prorated Permits & Registrations ($)",
    hint: "If an expense is paid annually, convert it to a monthly average before entering it.",
  },
  { key: "otherFixed", label: "Other Fixed Costs ($)" },
];

const VARIABLE_FIELDS: FieldDef[] = [
  { key: "def", label: "DEF ($)" },
  { key: "maintenance", label: "Maintenance & Repairs ($)" },
  { key: "tires", label: "Tires ($)" },
  { key: "tolls", label: "Tolls ($)" },
  { key: "road", label: "Scales, Truck Washes & Other Road Expenses ($)" },
  {
    key: "driverPay",
    label: "Driver Pay ($)",
    hint: "If you drive the truck yourself, you may include the compensation you want to assign yourself for driving.",
  },
  { key: "otherVariable", label: "Other Variable Costs ($)" },
];

const BUSINESS_FIELDS: FieldDef[] = [
  { key: "dispatch", label: "Dispatch ($)" },
  { key: "factoring", label: "Factoring ($)" },
  { key: "compliance", label: "Compliance / Administrative Services ($)" },
  { key: "businessOther", label: "Other Business Expenses ($)" },
];

const PROFIT_FIELDS: FieldDef[] = [
  {
    key: "profitMargin",
    label: "Desired Profit Margin (%)",
    hint: "Example: A 20% margin means you want 20% of revenue to remain as profit after the costs included here, before income taxes and other owner-specific considerations.",
    min: 0,
    max: 95,
    step: 1,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Numeric field state is stored as strings so partially-edited inputs
 *  (e.g. a cleared field) don't break; parsing mirrors the source n(). */
function toInputState(v: Record<FieldKey, number>): Record<FieldKey, string> {
  const out = {} as Record<FieldKey, string>;
  (Object.keys(v) as FieldKey[]).forEach((k) => {
    out[k] = String(v[k]);
  });
  return out;
}

/** Same semantics as the source n(): finite values clamped at 0, else 0. */
function parseAmount(raw: string): number {
  const v = parseFloat(raw);
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

const money = (v: number): string =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const whole = (v: number): string =>
  v.toLocaleString("en-US", { maximumFractionDigits: 0 });

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Field({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: string;
  onChange: (key: FieldKey, value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={def.key}
        className="mb-1.5 block text-sm font-bold text-charcoal"
      >
        {def.label}
      </label>
      <input
        id={def.key}
        type="number"
        className="input"
        value={value}
        min={def.min ?? 0}
        max={def.max}
        step={def.step ?? 0.01}
        onChange={(e) => onChange(def.key, e.target.value)}
      />
      {def.hint ? (
        <span className="mt-1 block text-xs text-steel">{def.hint}</span>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div
      className={
        featured
          ? "rounded-xl border-[3px] border-highway bg-white p-4 text-navy"
          : "rounded-xl border border-white/15 bg-white/[0.08] p-4"
      }
    >
      <span
        className={`mb-1.5 block text-[13px] ${
          featured ? "text-slate-500" : "text-[#d9e7f2]"
        }`}
      >
        {label}
      </span>
      <strong className="text-[22px] font-bold leading-none">{value}</strong>
    </div>
  );
}

function SectionCard({
  title,
  sub,
  children,
  full = false,
}: {
  title: string;
  sub: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <section className={`card ${full ? "lg:col-span-2" : ""}`}>
      <h2 className="mb-1.5 text-lg font-bold uppercase tracking-wide text-navy">
        {title}
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-steel">{sub}</p>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function CostPerMileCalculator() {
  const [values, setValues] = useState<Record<FieldKey, string>>(() =>
    toInputState(DEFAULT_VALUES),
  );
  const [fuelMode, setFuelMode] = useState<"estimate" | "manual">("estimate");
  const resultsRef = useRef<HTMLElement | null>(null);

  const handleFieldChange = (key: FieldKey, raw: string) => {
    setValues((prev) => ({ ...prev, [key]: raw }));
  };

  /** All math ported verbatim from the source calculate(); results stay
   *  live as the user types, exactly like the source's input listeners. */
  const results = useMemo(() => {
    const loaded = parseAmount(values.loadedMiles);
    const deadhead = parseAmount(values.deadheadMiles);
    const totalMiles = loaded + deadhead;

    let fuel = 0;
    if (fuelMode === "estimate") {
      const mpg = parseAmount(values.mpg);
      const diesel = parseAmount(values.dieselPrice);
      if (totalMiles > 0 && mpg > 0) fuel = (totalMiles / mpg) * diesel;
    } else {
      fuel = parseAmount(values.fuelMonthly);
    }

    const fixed =
      parseAmount(values.truckPayment) +
      parseAmount(values.trailerPayment) +
      parseAmount(values.insurance) +
      parseAmount(values.eld) +
      parseAmount(values.parking) +
      parseAmount(values.permits) +
      parseAmount(values.office) +
      parseAmount(values.otherFixed);

    const variableWithoutFuel =
      parseAmount(values.def) +
      parseAmount(values.maintenance) +
      parseAmount(values.tires) +
      parseAmount(values.tolls) +
      parseAmount(values.road) +
      parseAmount(values.driverPay) +
      parseAmount(values.otherVariable);

    const business =
      parseAmount(values.dispatch) +
      parseAmount(values.factoring) +
      parseAmount(values.compliance) +
      parseAmount(values.businessOther);

    const variable = fuel + variableWithoutFuel + business;
    const totalCost = fixed + variable;

    const margin = Math.min(parseAmount(values.profitMargin), 95) / 100;

    const cpm = totalMiles > 0 ? totalCost / totalMiles : 0;
    const fixedCPM = totalMiles > 0 ? fixed / totalMiles : 0;
    const variableCPM = totalMiles > 0 ? variable / totalMiles : 0;
    const fuelCPM = totalMiles > 0 ? fuel / totalMiles : 0;
    const deadheadPct = totalMiles > 0 ? (deadhead / totalMiles) * 100 : 0;

    const targetRate = totalMiles > 0 && margin < 1 ? cpm / (1 - margin) : 0;
    const loadedBreakEven = loaded > 0 ? totalCost / loaded : 0;
    const loadedTarget =
      loaded > 0 && margin < 1 ? loadedBreakEven / (1 - margin) : 0;

    let warning: string | null = null;
    if (totalMiles === 0) {
      warning =
        "Enter at least one loaded or deadhead mile to calculate cost per mile.";
    } else if (loaded === 0 && totalCost > 0) {
      warning =
        "No loaded miles were entered. Total cost per mile can be calculated, but cost per loaded mile cannot.";
    }

    return {
      totalMiles,
      deadheadPct,
      fuel,
      fixedCPM,
      variableCPM,
      totalCost,
      cpm,
      targetRate,
      loadedBreakEven,
      loadedTarget,
      fuelCPM,
      warning,
    };
  }, [values, fuelMode]);

  /** BUG FIX: restores the ORIGINAL defaults from the source file,
   *  instead of zeroing every field out. */
  const resetCalc = () => {
    setValues(toInputState(DEFAULT_VALUES));
    setFuelMode("estimate");
  };

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderFields = (defs: FieldDef[]) =>
    defs.map((def) => (
      <Field
        key={def.key}
        def={def}
        value={values[def.key]}
        onChange={handleFieldChange}
      />
    ));

  const togglePill =
    "inline-flex cursor-pointer items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm font-semibold text-navy transition hover:bg-slate-200";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      {/* Hero */}
      <section className="mb-6 rounded-2xl bg-navy px-6 py-8 text-white md:px-8">
        <h1 className="mb-3 text-3xl font-bold leading-tight md:text-5xl">
          Trucking Cost Per Mile Calculator
        </h1>
        <p className="max-w-3xl leading-relaxed text-white/90">
          Calculate what it really costs to operate your truck for every mile
          driven. Include both loaded and empty miles for a more accurate
          picture of your operating costs.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 1. Monthly miles */}
        <SectionCard
          full
          title="1. Monthly Miles"
          sub="First, enter all miles driven by the truck during the same period used for your expenses."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {renderFields(MILES_FIELDS)}
          </div>
          <p className="mt-4 text-sm text-steel">
            <strong className="font-bold text-charcoal">Important:</strong> Cost
            per mile should be based on total miles driven, not only paid or
            loaded miles.
          </p>
        </SectionCard>

        {/* 2. Fuel */}
        <SectionCard
          full
          title="2. Fuel"
          sub="Estimate fuel cost using your truck's MPG and average diesel price, or enter your actual monthly fuel expense."
        >
          <div
            className="mb-4 flex flex-wrap gap-2.5"
            role="radiogroup"
            aria-label="Fuel calculation method"
          >
            <label htmlFor="fuelModeEstimate" className={togglePill}>
              <input
                id="fuelModeEstimate"
                type="radio"
                name="fuelMode"
                value="estimate"
                className="h-4 w-4 accent-dotblue"
                checked={fuelMode === "estimate"}
                onChange={() => setFuelMode("estimate")}
              />
              Calculate Using MPG
            </label>
            <label htmlFor="fuelModeManual" className={togglePill}>
              <input
                id="fuelModeManual"
                type="radio"
                name="fuelMode"
                value="manual"
                className="h-4 w-4 accent-dotblue"
                checked={fuelMode === "manual"}
                onChange={() => setFuelMode("manual")}
              />
              Enter Monthly Fuel Cost
            </label>
          </div>

          {/* BUG FIX: conditional render keeps the MPG panel a grid; the
              source's display:"block" toggle broke the grid layout. */}
          {fuelMode === "estimate" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {renderFields(FUEL_ESTIMATE_FIELDS)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {renderFields(FUEL_MANUAL_FIELDS)}
            </div>
          )}
        </SectionCard>

        {/* 3. Fixed costs */}
        <SectionCard
          title="3. Fixed Costs"
          sub="These are expenses that generally change very little whether the truck drives more or fewer miles."
        >
          <div className="grid gap-4">{renderFields(FIXED_FIELDS)}</div>
        </SectionCard>

        {/* 4. Variable costs */}
        <SectionCard
          title="4. Variable Costs"
          sub="These expenses generally increase as the truck operates and drives more miles."
        >
          <div className="grid gap-4">{renderFields(VARIABLE_FIELDS)}</div>
        </SectionCard>

        {/* 5. Business expenses */}
        <SectionCard
          title="5. Business Expenses"
          sub="Include services and administrative expenses related to operating the company."
        >
          <div className="grid gap-4">{renderFields(BUSINESS_FIELDS)}</div>
          <span className="mt-4 block text-xs text-steel">
            Do not include reimbursable expenses that are later paid back to
            you, as this could artificially inflate your true operating cost.
          </span>
        </SectionCard>

        {/* 6. Profit goal */}
        <SectionCard
          title="6. Profit Goal"
          sub="Enter the profit margin you want to retain after covering the costs included in the calculator."
        >
          <div className="grid gap-4">{renderFields(PROFIT_FIELDS)}</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={scrollToResults}
            >
              CALCULATE
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-200 px-6 py-3 text-base font-bold text-navy transition hover:bg-slate-300"
              onClick={resetCalc}
            >
              RESET
            </button>
          </div>
        </SectionCard>

        {/* Results */}
        <section
          ref={resultsRef}
          className="scroll-mt-6 rounded-2xl bg-navy p-6 text-white md:p-7 lg:col-span-2"
          aria-live="polite"
        >
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wide">
            Results
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              label="Total Miles Driven"
              value={whole(results.totalMiles)}
            />
            <Metric
              label="Deadhead Percentage"
              value={`${results.deadheadPct.toFixed(1)}%`}
            />
            <Metric
              label="Monthly Fuel Expense"
              value={money(results.fuel)}
            />
            <Metric
              label="Fixed Cost Per Mile"
              value={money(results.fixedCPM)}
            />
            <Metric
              label="Variable Cost Per Mile"
              value={money(results.variableCPM)}
            />
            <Metric
              label="Total Monthly Operating Cost"
              value={money(results.totalCost)}
            />
            <Metric
              label="TOTAL COST PER MILE"
              value={money(results.cpm)}
              featured
            />
            <Metric
              label="Break-Even Rate Per Total Mile"
              value={money(results.cpm)}
            />
            <Metric
              label="Target Rate Per Total Mile"
              value={money(results.targetRate)}
            />
            <Metric
              label="Break-Even Rate Per Loaded Mile"
              value={money(results.loadedBreakEven)}
            />
            <Metric
              label="Target Rate Per Loaded Mile"
              value={money(results.loadedTarget)}
            />
            <Metric label="Fuel Cost Per Mile" value={money(results.fuelCPM)} />
          </div>

          {results.warning ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm font-medium text-amber-900"
            >
              {results.warning}
            </div>
          ) : null}

          <p className="mt-4 text-sm leading-relaxed text-[#d9e7f2]">
            This calculator is an educational tool for estimating operating
            costs. Actual costs may vary. For the most accurate cost per mile,
            use your own accounting records, invoices, mileage, and expenses.
          </p>
        </section>
      </div>

      {/* How to Interpret Your Results */}
      <section className="card mt-6 text-[15px] leading-relaxed">
        <p className="mb-2 font-bold text-navy">How to Interpret Your Results</p>
        <p>
          <strong>Total Cost Per Mile:</strong> Total operating expenses ÷ total
          miles driven.
        </p>
        <p>
          <strong>Break-Even Rate:</strong> The estimated rate needed to cover
          the costs included in this calculator, without adding profit.
        </p>
        <p>
          <strong>Target Rate:</strong> Cost ÷ (1 − desired profit margin). For
          example, for a 20% margin, divide cost by 0.80.
        </p>
        <p>
          <strong>Cost Per Loaded Mile:</strong> Allocates all costs—including
          deadhead miles—across the loaded miles that generate revenue.
        </p>
      </section>
    </div>
  );
}

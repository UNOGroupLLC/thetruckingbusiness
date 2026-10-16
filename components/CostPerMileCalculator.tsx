"use client";

import { useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Field registry: every input ported 1:1 from the source HTML file  */
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
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

const MILES_FIELDS: FieldDef[] = [
  { key: "loadedMiles", label: "Loaded Miles (per month)", hint: "Miles driven while hauling a load.", unit: "miles", step: 1 },
  {
    key: "deadheadMiles",
    label: "Empty / Deadhead Miles (per month)",
    hint: "Miles driven without a load, including miles traveled to pick up the next load.",
    unit: "miles",
    step: 1,
  },
];

const FUEL_ESTIMATE_FIELDS: FieldDef[] = [
  { key: "mpg", label: "Average Truck Fuel Economy (MPG)", hint: "Example: 6.5 MPG.", unit: "MPG", min: 0.1, step: 0.1 },
  { key: "dieselPrice", label: "Average Diesel Price per Gallon ($)", unit: "$/gal", step: 0.01 },
];

const FUEL_MANUAL_FIELDS: FieldDef[] = [
  { key: "fuelMonthly", label: "Actual Monthly Fuel Expense ($)", step: 0.01 },
];

const FIXED_FIELDS: FieldDef[] = [
  { key: "truckPayment", label: "Truck Payment (monthly)" },
  { key: "trailerPayment", label: "Trailer Payment (monthly)" },
  { key: "insurance", label: "Monthly Insurance ($)" },
  { key: "eld", label: "ELD, Tracking and Technology (monthly)" },
  { key: "parking", label: "Parking (monthly)" },
  { key: "office", label: "Subscriptions, Office and Software (monthly)" },
  {
    key: "permits",
    label: "Permits and Registrations (monthly average)",
    hint: "If an expense is paid annually, convert it to a monthly average before entering it.",
  },
  { key: "otherFixed", label: "Other Fixed Costs (monthly)" },
];

const VARIABLE_FIELDS: FieldDef[] = [
  { key: "def", label: "DEF (monthly)" },
  { key: "maintenance", label: "Maintenance and Repairs (monthly)" },
  { key: "tires", label: "Tires (monthly)" },
  { key: "tolls", label: "Tolls (monthly)" },
  { key: "road", label: "Scales, Truck Washes and Other Road Expenses (monthly)" },
  {
    key: "driverPay",
    label: "Driver Pay (monthly)",
    hint: "If you drive the truck yourself, you may include the compensation you want to assign yourself for driving.",
  },
  { key: "otherVariable", label: "Other Variable Costs (monthly)" },
];

const BUSINESS_FIELDS: FieldDef[] = [
  { key: "dispatch", label: "Dispatch (monthly)" },
  { key: "factoring", label: "Factoring (monthly)" },
  { key: "compliance", label: "Compliance / Administrative Services (monthly)" },
  { key: "businessOther", label: "Other Business Expenses (monthly)" },
];

const PROFIT_FIELDS: FieldDef[] = [
  {
    key: "profitMargin",
    label: "Desired Profit Margin (%)",
    hint: "Example: A 20% margin means you want 20% of revenue to remain as profit after the costs included here, before income taxes and other owner-specific considerations.",
    unit: "%",
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
/*  Palette (approved prototype tokens)                                */
/* ------------------------------------------------------------------ */

const NAVY = "#0a1a36";
const NAVY2 = "#0f2a5c";
const BLUE = "#1755a8";
const YELLOW = "#ffc61a";
const INK = "#16233c";
const STEEL = "#5b6b84";
const LINE = "#e3e8f0";
const HEADING = "'Libre Franklin', sans-serif";

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
        className="mb-[9px] block text-[13.5px] font-bold text-[#16233c]"
      >
        {def.label}
      </label>
      <div className="relative">
        <input
          id={def.key}
          type="number"
          className="w-full rounded-none border-[1.5px] border-[#ccd6e4] bg-white px-[18px] py-[14px] text-[17px] font-semibold text-[#0a1a36] outline-none focus:border-[#1755a8]"
          style={def.unit ? { paddingRight: 64 } : undefined}
          value={value}
          min={def.min ?? 0}
          max={def.max}
          step={def.step ?? 0.01}
          onChange={(e) => onChange(def.key, e.target.value)}
        />
        {def.unit ? (
          <span className="pointer-events-none absolute right-[18px] top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#93a1b5]">
            {def.unit}
          </span>
        ) : null}
      </div>
      {def.hint ? (
        <span className="mt-[6px] block text-[12.5px] leading-relaxed text-[#5b6b84]">
          {def.hint}
        </span>
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
          ? "rounded-none border-[3px] border-[#ffc61a] bg-white p-4 text-[#0a1a36]"
          : "rounded-none border border-white/15 bg-white/[0.08] p-4"
      }
    >
      <span
        className={`mb-1.5 block text-[12.5px] ${
          featured ? "text-[#5b6b84]" : "text-[#d9e7f2]"
        }`}
      >
        {label}
      </span>
      <strong
        className="text-[20px] font-extrabold leading-none"
        style={{ fontFamily: HEADING }}
      >
        {value}
      </strong>
    </div>
  );
}

/** Step progress header: six named steps, current step highlighted. */
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
          {done ? "Your results" : steps[current - 1]}
        </span>
        <span className="whitespace-nowrap text-[12.5px] font-semibold text-[#5b6b84]">
          {done ? "Complete" : `Step ${current} of ${steps.length}`}
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
                  color: isCurrent ? NAVY : filled ? "#3d4f6d" : "#93a1b5",
                  fontWeight: isCurrent ? 800 : 600,
                  overflow: "hidden",
                }}
              >
                {n}&nbsp;&nbsp;{name}
              </div>
              <div
                className="h-[4px] rounded-none"
                style={{ background: filled ? NAVY : "#dde4ee" }}
              />
            </div>
          );
        })}
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
}: {
  calculator: "cost-per-mile" | "startup";
  headline: string;
  lines: string[];
  blurb: string;
}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/calculators/email-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculator,
          email: email.trim(),
          headline,
          lines,
          company_website: website,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(
          data?.error ||
            "We could not send your results. Please email us directly at hello@thetruckingbusiness.com and we will send them over."
        );
        return;
      }
      setSent(true);
    } catch {
      setError(
        "We could not send your results. Please email us directly at hello@thetruckingbusiness.com and we will send them over."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="mt-[26px] rounded-none p-[28px] text-white"
      style={{ background: NAVY }}
    >
      <h4
        className="text-[17px] font-extrabold"
        style={{ fontFamily: HEADING, letterSpacing: "-0.01em" }}
      >
        Want a copy of your numbers?
      </h4>
      {sent ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#c9d6ea]">
          Your results are on their way to {email.trim()}.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-[#c9d6ea]">
            {blurb}
          </p>
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
                style={{
                  background: YELLOW,
                  boxShadow: "0 8px 24px rgba(255,198,26,0.35)",
                }}
              >
                {sending ? "Sending..." : "Email my results"}
              </button>
            </div>
            {/* Honeypot: hidden from humans, bots fill it and get a silent success. */}
            <div style={{ display: "none" }} aria-hidden="true">
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
            One email with your results. No spam, and you are not signing up
            for anything else.
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const STEP_NAMES = [
  "Monthly miles",
  "Fuel",
  "Fixed costs",
  "Variable costs",
  "Business costs",
  "Your rate",
];

const SEGMENTS: { label: string; color: string }[] = [
  { label: "Fuel", color: "#ffc61a" },
  { label: "Truck and trailer", color: "#eef1f6" },
  { label: "Insurance", color: "#c9a227" },
  { label: "Maintenance and tires", color: "#aebfd6" },
  { label: "Everything else", color: "#66788f" },
];

export default function CostPerMileCalculator() {
  const [values, setValues] = useState<Record<FieldKey, string>>(() =>
    toInputState(DEFAULT_VALUES),
  );
  const [fuelMode, setFuelMode] = useState<"estimate" | "manual">("estimate");
  const [step, setStep] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const wizardRef = useRef<HTMLDivElement | null>(null);

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

  const scrollToWizard = () => {
    wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const renderFields = (defs: FieldDef[]) =>
    defs.map((def) => (
      <Field
        key={def.key}
        def={def}
        value={values[def.key]}
        onChange={handleFieldChange}
      />
    ));

  /* Live preview shares for the hero card, from the same live values. */
  const segValues = [
    results.fuel,
    parseAmount(values.truckPayment) + parseAmount(values.trailerPayment),
    parseAmount(values.insurance),
    parseAmount(values.maintenance) + parseAmount(values.tires),
    Math.max(
      0,
      results.totalCost -
        results.fuel -
        (parseAmount(values.truckPayment) + parseAmount(values.trailerPayment)) -
        parseAmount(values.insurance) -
        (parseAmount(values.maintenance) + parseAmount(values.tires))
    ),
  ];
  const segPcts = normalizedPercents(segValues);
  const hasTotal = results.totalCost > 0;

  const emailLines = [
    `Total miles driven: ${whole(results.totalMiles)}`,
    `Deadhead percentage: ${results.deadheadPct.toFixed(1)}%`,
    `Monthly fuel expense: ${money(results.fuel)}`,
    `Fixed cost per mile: ${money(results.fixedCPM)}`,
    `Variable cost per mile: ${money(results.variableCPM)}`,
    `Total monthly operating cost: ${money(results.totalCost)}`,
    `Total cost per mile: ${money(results.cpm)}`,
    `Target rate per total mile: ${money(results.targetRate)}`,
    `Break-even rate per loaded mile: ${money(results.loadedBreakEven)}`,
    `Target rate per loaded mile: ${money(results.loadedTarget)}`,
    `Fuel cost per mile: ${money(results.fuelCPM)}`,
  ];

  const stepHelp: Record<number, string> = {
    1: "How far the truck runs in a typical month, loaded and empty. Every cost in this calculator is a monthly amount.",
    2: "Estimate fuel cost using your truck's MPG and average diesel price, or enter your actual monthly fuel expense.",
    3: "These are expenses that generally change very little whether the truck drives more or fewer miles.",
    4: "These expenses generally increase as the truck operates and drives more miles.",
    5: "Include services and administrative expenses related to operating the company.",
    6: "Enter the profit margin you want to retain after covering the costs included in the calculator.",
  };

  const togglePill = (active: boolean) =>
    `inline-flex cursor-pointer items-center gap-2 rounded-none px-4 py-2.5 text-[13.5px] font-semibold transition ${
      active
        ? "bg-[#e8effa] text-[#0a1a36] ring-[1.5px] ring-[#1755a8]"
        : "bg-[#f0f3f7] text-[#16233c] hover:bg-[#e3e8f0]"
    }`;

  return (
    <div className="w-full">
      {/* Hero */}
      <section
        className="rounded-none px-6 py-12 text-white sm:px-10 sm:py-14"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 88%)`,
        }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-none px-3 py-[7px] text-[12.5px] font-semibold text-white"
              style={{
                background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.16)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-none"
                style={{
                  background: YELLOW,
                  boxShadow: "0 0 0 5px rgba(255,198,26,0.18)",
                }}
              />
              Free cost per mile calculator
            </span>
            <h1
              className="mt-[22px] max-w-[560px] font-black text-white"
              style={{
                fontFamily: HEADING,
                fontSize: "clamp(40px, 5vw, 56px)",
                lineHeight: 0.95,
                letterSpacing: "-0.03em",
              }}
            >
              Every mile has a price.{" "}
              <em style={{ fontStyle: "normal", color: YELLOW }}>
                Find yours.
              </em>
            </h1>
            <p className="mt-[18px] max-w-[520px] text-[17px] leading-[1.55] text-[#dbe4f2]">
              Enter your monthly miles and what it costs you to run them. You
              get your true cost per mile, a clear view of where the money
              goes, and the lowest rate you can take on a load and still come
              out ahead.
            </p>
            <p className="mt-4 max-w-[480px] text-[13.5px] leading-[1.55] text-[#93a5c2]">
              Built for real operations: fuel, truck payment, insurance,
              upkeep, dispatch, and the costs most drivers forget to count.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="btn btn-y" onClick={scrollToWizard}>
                Start the calculator
              </button>
              <button type="button" className="btn btn-ghost" onClick={scrollToWizard}>
                See how it works
              </button>
            </div>
          </div>

          {/* Live preview card */}
          <div
            className="rounded-none p-7 sm:p-8"
            style={{
              background: "rgba(255,255,255,0.055)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(8px)",
            }}
            aria-live="polite"
          >
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#8fa3c4]">
              <span>Preview</span>
              <span>Your cost breakdown</span>
            </div>
            <div className="mt-[18px] flex items-end justify-between gap-4">
              <div>
                <div className="text-[13.5px] text-[#c3d0e4]">
                  Your cost per mile
                </div>
                <div
                  className="mt-1.5 text-[52px] font-black leading-none"
                  style={{ fontFamily: HEADING, color: YELLOW, letterSpacing: "-0.01em" }}
                >
                  {hasTotal ? money(results.cpm) : "-"}
                </div>
              </div>
              <div className="pb-1.5 text-right">
                <div className="text-[12.5px] text-[#8fa3c4]">Min. rate</div>
                <div className="mt-[3px] text-[17px] font-bold text-white">
                  {hasTotal ? `${money(results.targetRate)} / mi` : "-"}
                </div>
              </div>
            </div>
            <div
              className="mt-6 flex h-[13px] overflow-hidden rounded-none"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              {SEGMENTS.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    width: `${segPcts ? segPcts[i] : 0}%`,
                    background: s.color,
                    height: "100%",
                  }}
                />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-x-[22px] gap-y-[9px] sm:grid-cols-2">
              {SEGMENTS.map((s, i) => (
                <div key={s.label} className="flex items-center gap-[9px] text-[13.5px] text-[#dbe4f2]">
                  <span
                    className="h-[10px] w-[10px] shrink-0 rounded-none"
                    style={{ background: s.color }}
                  />
                  {s.label}
                  <span className="ml-auto pl-2 font-bold text-white">
                    {segPcts ? `${segPcts[i]}%` : "-"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[12.5px] leading-relaxed text-[#8296b3]">
              An example operation using typical numbers, not a benchmark.
              Your numbers will differ.
            </p>
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
          style={{
            fontFamily: HEADING,
            fontSize: "clamp(26px, 4vw, 35px)",
            letterSpacing: "-0.015em",
          }}
        >
          Your cost per mile, step by step
        </h2>

        <div className="mt-[38px]">
          <StepProgress steps={STEP_NAMES} current={step} done={showResults} />
        </div>

        {showResults ? (
          <>
            {/* Results */}
            <section
              className="mt-[26px] rounded-none p-6 text-white sm:p-7"
              style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 88%)`,
              }}
              aria-live="polite"
            >
              <h3
                className="mb-4 text-[20px] font-extrabold"
                style={{ fontFamily: HEADING }}
              >
                Results
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Metric label="Total Miles Driven" value={whole(results.totalMiles)} />
                <Metric
                  label="Deadhead Percentage"
                  value={`${results.deadheadPct.toFixed(1)}%`}
                />
                <Metric label="Monthly Fuel Expense" value={money(results.fuel)} />
                <Metric label="Fixed Cost Per Mile" value={money(results.fixedCPM)} />
                <Metric label="Variable Cost Per Mile" value={money(results.variableCPM)} />
                <Metric
                  label="Total Monthly Operating Cost"
                  value={money(results.totalCost)}
                />
                <Metric label="TOTAL COST PER MILE" value={money(results.cpm)} featured />
                <Metric label="Break-Even Rate Per Total Mile" value={money(results.cpm)} />
                <Metric label="Target Rate Per Total Mile" value={money(results.targetRate)} />
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
                  className="mt-4 rounded-none border border-amber-300 bg-amber-50 p-3.5 text-[13.5px] font-medium text-amber-900"
                >
                  {results.warning}
                </div>
              ) : null}

              <p className="mt-4 text-[13.5px] leading-relaxed text-[#d9e7f2]">
                This calculator is an educational tool for estimating
                operating costs. Actual costs may vary. For the most accurate
                cost per mile, use your own accounting records, invoices,
                mileage, and expenses.
              </p>
            </section>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={backToCalculator}
                className="rounded-none border-[1.5px] border-[#0a1a36] px-[22px] py-3 text-[14px] font-bold text-[#0a1a36] transition hover:bg-[#0a1a36] hover:text-white"
              >
                Back to the calculator
              </button>
              <button
                type="button"
                onClick={resetCalc}
                className="px-2 py-3 text-[14px] font-semibold text-[#5b6b84] transition hover:text-[#0a1a36]"
              >
                Reset
              </button>
            </div>

            {/* How to Interpret Your Results */}
            <section
              className="mt-[26px] rounded-none border bg-white p-6 text-[15px] leading-relaxed text-[#16233c] sm:p-7"
              style={{ borderColor: LINE }}
            >
              <p
                className="mb-2 text-[17px] font-extrabold text-[#0a1a36]"
                style={{ fontFamily: HEADING }}
              >
                How to Interpret Your Results
              </p>
              <p>
                <strong>Total Cost Per Mile:</strong> Total operating expenses
                ÷ total miles driven.
              </p>
              <p>
                <strong>Break-Even Rate:</strong> The estimated rate needed to
                cover the costs included in this calculator, without adding
                profit.
              </p>
              <p>
                <strong>Target Rate:</strong> Cost ÷ (1 − desired profit
                margin). For example, for a 20% margin, divide cost by 0.80.
              </p>
              <p>
                <strong>Cost Per Loaded Mile:</strong> Allocates all costs,
                including deadhead miles, across the loaded miles that
                generate revenue.
              </p>
            </section>

            <EmailResultsPanel
              calculator="cost-per-mile"
              headline={`Your cost per mile: ${money(results.cpm)}`}
              lines={emailLines}
              blurb="Enter your email and we will send your full breakdown: every cost you entered, your cost per mile, and the lowest rate you should take. We also save a copy, so if you ever want help with the next step, we already have your numbers in front of us."
            />
          </>
        ) : (
          <>
            {/* Step card */}
            <div
              className="mt-[26px] rounded-none border bg-white px-6 py-8 sm:px-10 sm:py-[38px]"
              style={{
                borderColor: LINE,
                boxShadow: "0 14px 34px rgba(10,26,54,0.06)",
              }}
            >
              <h3
                className="text-[20px] font-extrabold text-[#0a1a36]"
                style={{ fontFamily: HEADING, letterSpacing: "-0.01em" }}
              >
                {STEP_NAMES[step - 1]}
              </h3>
              <p className="mt-[7px] text-[15px] leading-relaxed text-[#5b6b84]">
                {stepHelp[step]}
              </p>

              {step === 1 ? (
                <>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    {renderFields(MILES_FIELDS)}
                  </div>
                  <div
                    className="mt-[22px] flex items-baseline justify-between border-t pt-[18px] text-[13.5px] text-[#5b6b84]"
                    style={{ borderColor: LINE }}
                  >
                    <span>Total monthly miles</span>
                    <strong
                      className="text-[17px] font-extrabold text-[#0a1a36]"
                      style={{ fontFamily: HEADING }}
                    >
                      {whole(results.totalMiles)}
                    </strong>
                  </div>
                  <p className="mt-4 text-[13.5px] leading-relaxed text-[#5b6b84]">
                    <strong className="font-bold text-[#16233c]">
                      Important:
                    </strong>{" "}
                    Cost per mile should be based on total miles driven, not
                    only paid or loaded miles.
                  </p>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div
                    className="mt-7 mb-5 flex flex-wrap gap-2.5"
                    role="radiogroup"
                    aria-label="Fuel calculation method"
                  >
                    <label htmlFor="fuelModeEstimate" className={togglePill(fuelMode === "estimate")}>
                      <input
                        id="fuelModeEstimate"
                        type="radio"
                        name="fuelMode"
                        value="estimate"
                        className="h-4 w-4"
                        style={{ accentColor: BLUE }}
                        checked={fuelMode === "estimate"}
                        onChange={() => setFuelMode("estimate")}
                      />
                      Calculate Using MPG
                    </label>
                    <label htmlFor="fuelModeManual" className={togglePill(fuelMode === "manual")}>
                      <input
                        id="fuelModeManual"
                        type="radio"
                        name="fuelMode"
                        value="manual"
                        className="h-4 w-4"
                        style={{ accentColor: BLUE }}
                        checked={fuelMode === "manual"}
                        onChange={() => setFuelMode("manual")}
                      />
                      Enter Monthly Fuel Cost
                    </label>
                  </div>
                  {fuelMode === "estimate" ? (
                    <div className="grid gap-5 sm:grid-cols-2">
                      {renderFields(FUEL_ESTIMATE_FIELDS)}
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2">
                      {renderFields(FUEL_MANUAL_FIELDS)}
                    </div>
                  )}
                </>
              ) : null}

              {step === 3 ? (
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  {renderFields(FIXED_FIELDS)}
                </div>
              ) : null}

              {step === 4 ? (
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  {renderFields(VARIABLE_FIELDS)}
                </div>
              ) : null}

              {step === 5 ? (
                <>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    {renderFields(BUSINESS_FIELDS)}
                  </div>
                  <span className="mt-4 block text-[12.5px] leading-relaxed text-[#5b6b84]">
                    Do not include reimbursable expenses that are later paid
                    back to you, as this could artificially inflate your true
                    operating cost.
                  </span>
                </>
              ) : null}

              {step === 6 ? (
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  {renderFields(PROFIT_FIELDS)}
                </div>
              ) : null}

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
                  className="rounded-none px-[34px] py-[15px] text-[15px] font-bold text-[#0a1a36]"
                  style={{
                    background: YELLOW,
                    boxShadow: "0 10px 22px rgba(255,198,26,0.3)",
                  }}
                >
                  {step < 6 ? "Continue" : "See my results"}
                </button>
              </div>
            </div>

            {/* Live summary chip */}
            <div
              className="mt-[18px] flex flex-wrap items-center justify-between gap-3 rounded-none px-[22px] py-[15px] text-white"
              style={{ background: NAVY }}
              aria-live="polite"
            >
              <span className="text-[13.5px] text-[#c3d0e4]">
                Your cost per mile updates as you go.
              </span>
              <span
                className="whitespace-nowrap text-[20px] font-black"
                style={{ fontFamily: HEADING, color: YELLOW }}
              >
                {money(results.cpm)}
                <small className="ml-[7px] text-[12.5px] font-semibold text-[#8fa3c4]">
                  per mile
                </small>
              </span>
            </div>

            {/* Reassurance row */}
            <div className="mt-[30px] flex flex-wrap justify-center gap-x-11 gap-y-3.5">
              {[
                "One step at a time",
                "About 3 minutes",
                "Change any answer later",
              ].map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-[9px] text-[13.5px] font-semibold text-[#5b6b84]"
                >
                  <span
                    className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-none text-[11px] font-extrabold"
                    style={{ background: "#e7eefb", color: BLUE }}
                  >
                    ✓
                  </span>
                  {t}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useTtb } from '@/lib/store';
import Faq from '@/components/Faq';

const STARTUP_STEPS = [
  'Business formation',
  'USDOT number',
  'MC operating authority',
  'BOC-3 filing',
  'Insurance',
  'Registrations (UCR / IRP / IFTA)',
  'Driver & vehicle compliance',
  'Operating legally',
];

const EXISTING_STEPS = [
  'DOT compliance review',
  'UCR renewal',
  'Quarterly IFTA filings',
  'Drug & alcohol program',
  'Driver qualification files',
  'New-entrant audit prep',
  'Ongoing support',
];

const SERVICES = [
  {
    title: 'Business Startup',
    desc: 'Entity setup guidance, USDOT registration, and the full launch sequence — in the right order.',
  },
  {
    title: 'Operating Authority',
    desc: 'MC authority filing, BOC-3 process agents, and reinstatement support.',
  },
  {
    title: 'DOT Compliance',
    desc: 'Driver files, MVR reviews, hours-of-service and ELD guidance, maintenance records.',
  },
  {
    title: 'Drug & Alcohol Program',
    desc: 'Consortium enrollment, Clearinghouse guidance, and testing program management.',
  },
  {
    title: 'IFTA · UCR · IRP',
    desc: 'Quarterly fuel tax filings, annual UCR renewal, and apportioned registration guidance.',
  },
  {
    title: 'Safety Audit Prep',
    desc: 'New-entrant safety audit readiness: what investigators check and how to prepare.',
  },
];

const FAQS = [
  {
    q: 'How fast can I get my operating authority?',
    a: 'Timelines vary with FMCSA processing. When you purchase a package we give you a current estimate and handle the filing for you — you can track everything in your client portal.',
  },
  {
    q: 'What does "all-in pricing" mean?',
    a: 'The package price includes our service fee and the government filing fees — we remit the government fees on your behalf. Each package page shows the exact breakdown.',
  },
  {
    q: 'Do you file the government forms for me?',
    a: 'Yes. For the filings included in your package, we prepare and submit them, then deliver confirmations and documents to your client portal.',
  },
  {
    q: 'I already have a trucking company. Can you help with compliance?',
    a: 'Yes — the DOT Compliance Package covers IFTA, UCR, drug & alcohol program management, driver file reviews, and audit preparation on an ongoing basis.',
  },
  {
    q: 'Is this legal advice?',
    a: 'No. We provide education and filing services. For legal or tax questions, consult a licensed attorney or CPA.',
  },
];

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm font-semibold text-white">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-highway text-xs font-extrabold text-navy" aria-hidden="true">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function HomePage() {
  const { copy } = useTtb();

  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-navy">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/hero-truck-30s.mp4"
          poster="/hero-truck-30s-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-navy/70" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-navy/40"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-24">
          <p className="eyebrow text-highway!">Trucking Startup + DOT Compliance</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-extrabold leading-tight text-white md:text-7xl">
            {copy.heroHeadline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-200">{copy.heroSub}</p>
          <ul className="mt-6 space-y-2">
            {copy.trustNotes.map((note) => (
              <Check key={note}>{note}</Check>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/pricing" className="btn-primary">
              View Packages
            </Link>
            <Link href="/calculators" className="btn-outline-light">
              Free Calculators
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-300">
            Demo site — no real payments are processed.
          </p>
        </div>
      </section>

      {/* TWO PATHS */}
      <section className="bg-mist py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-extrabold text-navy md:text-4xl">Choose your road</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-steel">
            Whether you&apos;re starting from scratch or already running trucks, there&apos;s a clear
            path forward.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="card">
              <p className="eyebrow">New carriers</p>
              <h3 className="mt-2 text-2xl font-extrabold text-navy">
                I want to start a trucking company
              </h3>
              <ol className="mt-5 space-y-2.5">
                {STARTUP_STEPS.map((step, i) => (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="font-medium">{step}</span>
                  </li>
                ))}
              </ol>
              <Link href="/pricing" className="btn-dark mt-6 w-full">
                Start with a package
              </Link>
            </div>
            <div className="card">
              <p className="eyebrow">Existing carriers</p>
              <h3 className="mt-2 text-2xl font-extrabold text-navy">
                I already have a trucking company
              </h3>
              <ul className="mt-5 space-y-2.5">
                {EXISTING_STEPS.map((step) => (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dotblue text-xs font-bold text-white" aria-hidden="true">
                      ✓
                    </span>
                    <span className="font-medium">{step}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="btn-dark mt-6 w-full">
                Get compliance help
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-extrabold text-navy md:text-4xl">What we help with</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-steel">
            Education first, services second — every topic below is something we can handle for you.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="card">
                <h3 className="text-lg font-extrabold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel">{s.desc}</p>
                <Link href="/pricing" className="mt-4 inline-block text-sm font-bold text-dotblue hover:underline">
                  See packages →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULATORS TEASER */}
      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-extrabold md:text-4xl">Know your numbers</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-300">
            Free planning tools built for trucking — estimate startup costs and your true cost per
            mile before you spend a dollar.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Link href="/calculators/startup-cost" className="rounded-2xl bg-white/10 p-6 backdrop-blur transition hover:bg-white/15">
              <h3 className="text-xl font-extrabold text-highway">Trucking Startup Cost Calculator</h3>
              <p className="mt-2 text-sm text-slate-200">
                Estimate everything it takes to launch — filings, equipment, insurance, permits —
                plus the operating reserve you&apos;ll need.
              </p>
              <span className="mt-4 inline-block text-sm font-bold text-white">Open calculator →</span>
            </Link>
            <Link href="/calculators/cost-per-mile" className="rounded-2xl bg-white/10 p-6 backdrop-blur transition hover:bg-white/15">
              <h3 className="text-xl font-extrabold text-highway">Cost-Per-Mile Calculator</h3>
              <p className="mt-2 text-sm text-slate-200">
                Loaded and empty miles, fixed and variable costs — know your break-even rate per
                mile before you haul.
              </p>
              <span className="mt-4 inline-block text-sm font-bold text-white">Open calculator →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-mist py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-3xl font-extrabold text-navy md:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-8">
            <Faq items={FAQS} />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-navy py-16 text-center text-white">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-extrabold md:text-4xl">Ready to roll?</h2>
          <p className="mt-3 text-slate-300">
            Pick a package, check out in minutes, and tell us about your company — we&apos;ll take
            it from there.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/pricing" className="btn-primary">
              View Packages
            </Link>
            <Link href="/portal/login" className="btn-outline-light">
              Client Login
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

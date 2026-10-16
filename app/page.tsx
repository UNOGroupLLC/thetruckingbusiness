'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTtb } from '@/lib/store';
import Faq from '@/components/Faq';
import Roadmap from '@/components/Roadmap';
import HeroRoadmapCard from '@/components/HeroRoadmapCard';
import AuditChecker from '@/components/AuditChecker';
import HomePricing from '@/components/HomePricing';
import { STEPS } from '@/components/roadmap-steps';

const STARTUP_STEPS = [
  'Business formation',
  'USDOT number',
  'MC operating authority',
  'BOC-3 filing',
  'Insurance',
  'Registrations (UCR / IRP / IFTA / HVUT 2290)',
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
    a: 'Plan on 3 to 6 weeks from the day your application is filed to the day your authority is active. The timeline is set by federal steps, not by us. After the FMCSA publishes your application, a 10 day protest period has to run, and it cannot be skipped. Your insurance filing and your BOC-3 must reach the FMCSA within 20 days of that publication. We handle the filing, track every step, and you can watch it move in your client portal.',
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

const GUIDES = [
  {
    tag: 'Guide',
    photo: '/guide-startup-checklist.jpg',
    bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
    title: 'How to Start a Trucking Company: The Complete Checklist',
    desc: 'Business setup → authority → insurance → first load, in the right order.',
    link: '/resources/blog/how-to-start-a-trucking-company',
    linkLabel: 'Read the guide →',
  },
  {
    tag: 'Compliance',
    photo: '/guide-safety-audit.jpg',
    bg: 'linear-gradient(135deg,#fef3c7,#fde68a)',
    title: 'New Entrant Safety Audit: What Investigators Actually Check',
    desc: 'Driver files, maintenance records, drug & alcohol program — demystified.',
    link: '/pricing',
    linkLabel: 'See audit help →',
  },
  {
    tag: 'Money',
    photo: '/guide-cost-per-mile.jpg',
    bg: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
    title: 'Cost Per Mile, Explained: Price Every Lane With Confidence',
    desc: 'Fixed vs. variable costs, deadhead, and the margin most new carriers miss.',
    link: '/calculators/cost-per-mile',
    linkLabel: 'Open the calculator →',
  },
];

export default function HomePage() {
  const { copy } = useTtb();
  const [activeStep, setActiveStep] = useState(1);
  const [explored, setExplored] = useState<boolean[]>(() =>
    STEPS.map((_, i) => i <= 1),
  );

  const selectStep = (i: number) => {
    setExplored((prev) => prev.map((v, j) => v || j === i));
    setActiveStep(i);
  };

  const headlineWords = copy.heroHeadline.trim().split(/\s+/);
  const headlineLast = headlineWords.pop();
  const headlineRest = headlineWords.join(' ');

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
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-24">
          <div className="hero-grid">
            <div>
              <span className="eyebrow-pill">
                <i aria-hidden="true" />
                Trucking Startup • DOT Compliance • Education
              </span>
              <h1 className="hero-h1">
                {headlineRest} <em>{headlineLast}</em>
              </h1>
              <p className="hero-sub">{copy.heroSub}</p>
              <div className="hero-actions">
                <Link href="/checkout/authority-startup" className="btn btn-y">
                  Get Operating Authority →
                </Link>
                <Link href="/pricing" className="btn btn-ghost">
                  See Packages &amp; Prices
                </Link>
              </div>
              <div className="hero-note">
                {copy.trustNotes.map((note) => (
                  <span key={note}>{note}</span>
                ))}
              </div>
            </div>
            <HeroRoadmapCard active={activeStep} explored={explored} onSelect={selectStep} />
          </div>
          <div className="hero-stats">
            <div className="hstat">
              <b>
                7 <em>steps</em>
              </b>
              <span>From business idea to legally operating on the road</span>
            </div>
            <div className="hstat">
              <b>
                2 <em>free tools</em>
              </b>
              <span>Startup cost &amp; cost-per-mile calculators, built for owner-operators</span>
            </div>
            <div className="hstat">
              <b>
                100<em>%</em>
              </b>
              <span>All-in pricing — our fee and government fees included</span>
            </div>
            <div className="hstat">
              <b>
                EN <em>/ ES</em>
              </b>
              <span>English here • Español at NegocioDeCamionero.com</span>
            </div>
          </div>
        </div>
      </section>

      {/* TWO PATHS */}
      <section id="start" className="bg-mist py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-extrabold text-navy md:text-4xl">Choose your road</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-steel">
            Whether you&apos;re starting from scratch or already running trucks, there&apos;s a clear
            path forward.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="card flex flex-col">
              <p className="eyebrow">New carriers</p>
              <h3 className="mt-2 text-2xl font-extrabold text-navy">
                I want to start a trucking company
              </h3>
              <ol className="mt-5 flex-1 space-y-2.5">
                {STARTUP_STEPS.map((step, i) => (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none bg-navy text-xs font-bold text-white">
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
            <div className="card flex flex-col">
              <p className="eyebrow">Existing carriers</p>
              <h3 className="mt-2 text-2xl font-extrabold text-navy">
                I already have a trucking company
              </h3>
              <ul className="mt-5 flex-1 space-y-2.5">
                {EXISTING_STEPS.map((step) => (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none bg-dotblue text-xs font-bold text-white" aria-hidden="true">
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

      {/* ROADMAP — How it works */}
      <section className="py-16">
        <Roadmap active={activeStep} explored={explored} onSelect={selectStep} />
      </section>

      {/* SERVICES */}
      <section id="compliance" className="py-16">
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
            <Link href="/calculators/startup-cost" className="rounded-none bg-white/10 p-6 backdrop-blur transition hover:bg-white/15">
              <h3 className="text-xl font-extrabold text-highway">Trucking Startup Cost Calculator</h3>
              <p className="mt-2 text-sm text-slate-200">
                Estimate everything it takes to launch — filings, equipment, insurance, permits —
                plus the operating reserve you&apos;ll need.
              </p>
              <span className="mt-4 inline-block text-sm font-bold text-white">Open calculator →</span>
            </Link>
            <Link href="/calculators/cost-per-mile" className="rounded-none bg-white/10 p-6 backdrop-blur transition hover:bg-white/15">
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

      {/* AUDIT READINESS CHECKER */}
      <AuditChecker />

      {/* HOMEPAGE PRICING — Buy Online */}
      <HomePricing />

      {/* RESOURCES */}
      <section id="resources" className="py-16" style={{ background: 'var(--bg2)' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Free Resources</div>
            <h2>
              Learn it once.
              <br />
              <em>Do it right.</em>
            </h2>
            <p>
              Guides written like a compliance professional would explain them to a friend — with
              official sources cited.
            </p>
          </div>
          <div className="res-grid">
            {GUIDES.map((g) => (
              <article key={g.title} className="res">
                <div className="res-img" style={{ background: g.bg }}>
                  <img src={g.photo} alt={g.title} loading="lazy" />
                </div>
                <div className="res-body">
                  <span className="path-tag">{g.tag}</span>
                  <h3>{g.title}</h3>
                  <p>{g.desc}</p>
                  <Link href={g.link} className="res-link">
                    {g.linkLabel}
                  </Link>
                </div>
              </article>
            ))}
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

import Link from 'next/link';

const CALCS = [
  {
    href: '/calculators/startup-cost',
    title: 'Trucking Startup Cost Calculator',
    desc: 'Estimate everything it takes to launch — business formation, FMCSA filings, equipment, insurance, permits — plus the operating reserve you\u2019ll need while waiting on your first loads.',
    tag: 'For future owners',
  },
  {
    href: '/calculators/cost-per-mile',
    title: 'Cost-Per-Mile Calculator',
    desc: 'Loaded and empty miles, fixed and variable costs, fuel, and your profit goal — know your break-even and target rate per mile before you haul.',
    tag: 'For operators',
  },
];

export default function CalculatorsPage() {
  return (
    <div className="bg-mist py-14">
      <div className="mx-auto max-w-5xl px-4">
        <p className="eyebrow text-center">Free tools</p>
        <h1 className="mt-2 text-center text-4xl font-extrabold text-navy md:text-5xl">
          Trucking calculators
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-steel">
          Pick a calculator. Each one opens on its own page so you can focus on the numbers —
          they&apos;re educational planning tools, not quotes.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {CALCS.map((c) => (
            <Link key={c.href} href={c.href} className="card group transition hover:shadow-md">
              <p className="eyebrow">{c.tag}</p>
              <h2 className="mt-2 text-2xl font-extrabold text-navy group-hover:text-dotblue">
                {c.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-steel">{c.desc}</p>
              <span className="mt-5 inline-block font-bold text-dotblue">
                Open calculator →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-navy-dark text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold text-white">
            The Trucking <span className="text-highway">Business</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Trucking business startup + DOT compliance, education, and ongoing support — from idea to
            the open road.
          </p>
          <p className="mt-3 text-sm font-semibold text-highway">Stay Compliant.</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Explore</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/pricing" className="hover:text-highway">Pricing</Link></li>
            <li><Link href="/calculators" className="hover:text-highway">Calculators</Link></li>
            <li><Link href="/portal/login" className="hover:text-highway">Client Login</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Talk to us</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="mailto:hello@thetruckingbusiness.com" className="hover:text-highway">
                hello@thetruckingbusiness.com
              </a>
            </li>
            <li>
              <a href="tel:+15550104477" className="hover:text-highway">
                (555) 010-4477
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Demo</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/admin" className="hover:text-highway">Admin panel (mock)</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-slate-400 md:flex-row md:justify-between">
          <span>© 2026 The Trucking Business. Phase 1 demo — no real payments are processed.</span>
          <span>Educational content only; not legal advice.</span>
        </div>
      </div>
    </footer>
  );
}

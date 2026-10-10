'use client';

import Link from 'next/link';
import { useState } from 'react';

const LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/calculators', label: 'Calculators' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="The Trucking Business — home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-highway font-extrabold text-navy">
            T
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            The Trucking <span className="text-highway">Business</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-white hover:text-highway"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/portal/login"
            className="rounded-lg bg-highway px-4 py-2 text-sm font-bold text-charcoal hover:brightness-95"
          >
            Client Login
          </Link>
        </nav>

        <button
          className="rounded-lg p-2 hover:bg-white/10 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/10 px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/portal/login"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-highway px-3 py-2 text-center text-sm font-bold text-charcoal"
            >
              Client Login
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

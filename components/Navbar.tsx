'use client';

import Link from 'next/link';
import { useState } from 'react';

const LINKS = [
  { href: '/#start', label: 'Start Your Business' },
  { href: '/#compliance', label: 'DOT Compliance' },
  { href: '/calculators', label: 'Calculators' },
  { href: '/pricing', label: 'Services' },
  { href: '/#resources', label: 'Resources' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand" aria-label="The Trucking Business — home">
          <span className="brand-mark" aria-hidden="true">
            <img src="/logo-mark.png" alt="" />
          </span>
          <span>
            THE TRUCKING
            <br />
            BUSINESS<small>TheTruckingBusiness.com</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-cta">
          <a
            className="btn btn-o btn-s"
            href="https://negociodecamionero.com"
            target="_blank"
            rel="noopener"
          >
            Español ↗
          </a>
          <Link className="btn btn-y btn-s" href="/portal/login">
            Client Login
          </Link>
          <button
            className="menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </div>

      <nav className={`mobile-menu${open ? ' open' : ''}`} aria-label="Mobile">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className="btn btn-o"
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/portal/login"
          onClick={() => setOpen(false)}
          className="btn btn-y"
        >
          Client Login
        </Link>
        <a
          href="https://negociodecamionero.com"
          target="_blank"
          rel="noopener"
          onClick={() => setOpen(false)}
          className="btn btn-o"
        >
          Español ↗
        </a>
      </nav>
    </header>
  );
}

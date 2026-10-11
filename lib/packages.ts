/**
 * Shared package catalog — pure module, safe to import from server code
 * (API routes) and client components alike. No 'use client' here.
 * Source of truth for Phase 1 pricing; Phase 2 moves this to Postgres.
 */

export interface FeeLine {
  label: string;
  amount: number; // USD; 0 allowed when marked "vary / at cost"
  kind: 'ours' | 'government';
  note?: string;
}

export interface Package {
  slug: string;
  name: string;
  tagline: string;
  price: number; // USD
  billing: 'one-time' | '/mo' | '/yr';
  placeholder: boolean; // true until the owner approves real pricing
  category: 'package' | 'alacarte';
  inclusions: string[];
  fees: FeeLine[]; // all-in breakdown: our fee + government fees included
  intake: 'authority' | 'compliance';
  cta: string; // pricing-page button label (kept as "Buy ..." per owner)
}

export const SEED_PACKAGES: Package[] = [
  {
    slug: 'complete',
    name: 'The Complete Package',
    tagline: 'Everything needed to launch and stay compliant in one purchase.',
    price: 1499,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Complete Package',
    intake: 'authority',
    inclusions: [
      'Motor Carrier Authority (FMCSA $300 filing fee included)',
      'DOT & MC numbers',
      'BOC-3 processing agent',
      'UCR filing (1st year, 0–2 power units)',
      'Drug & Alcohol Consortium membership (1st year)',
      'FMCSA Drug & Alcohol Clearinghouse account setup',
      'Full audit prep kit (folders, forms, safety policies & procedures)',
      'One-on-one new-entrant audit prep session',
      'Compliance onboarding call',
    ],
    fees: [
      { label: 'FMCSA operating authority filing fee', amount: 300, kind: 'government' },
      { label: 'Our service fee — everything else', amount: 1199, kind: 'ours' },
    ],
  },
  {
    slug: 'authority-plus',
    name: 'Authority Plus',
    tagline: 'MC authority plus the filings that keep you rolling.',
    price: 879,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Authority Plus',
    intake: 'authority',
    inclusions: [
      'Motor Carrier Authority (FMCSA $300 filing fee included)',
      'DOT & MC numbers',
      'BOC-3 processing agent',
      'UCR filing',
    ],
    fees: [
      { label: 'FMCSA operating authority filing fee', amount: 300, kind: 'government' },
      { label: 'Our service fee', amount: 579, kind: 'ours' },
    ],
  },
  {
    slug: 'authority-startup',
    name: 'Authority Startup',
    tagline: 'The essentials to get your motor carrier authority.',
    price: 539,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Authority Startup',
    intake: 'authority',
    inclusions: [
      'Motor Carrier Authority (FMCSA $300 filing fee included)',
      'DOT & MC numbers',
      'BOC-3 processing agent',
    ],
    fees: [
      { label: 'FMCSA operating authority filing fee', amount: 300, kind: 'government' },
      { label: 'Our service fee', amount: 239, kind: 'ours' },
    ],
  },
  {
    slug: 'intrastate',
    name: 'Intrastate DOT Number',
    tagline: 'For intrastate commerce only — we do all the paperwork.',
    price: 179,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Intrastate Filing',
    intake: 'authority',
    inclusions: [
      'USDOT number registration for intrastate operation',
      'All paperwork handled for you',
    ],
    fees: [{ label: 'Our service fee', amount: 179, kind: 'ours' }],
  },
  {
    slug: 'reinstatement',
    name: 'DOT Number Reinstatement',
    tagline: 'Restore a DOT number marked Not Authorized or inactive.',
    price: 179,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Reinstatement',
    intake: 'authority',
    inclusions: [
      'Reinstatement filing handled for you',
      'Status review and next steps',
    ],
    fees: [{ label: 'Our service fee', amount: 179, kind: 'ours' }],
  },
  {
    slug: 'compliance',
    name: 'Compliance Subscription',
    tagline: 'Ongoing compliance peace of mind. Cancel anytime.',
    price: 89,
    billing: '/mo',
    placeholder: false,
    category: 'package',
    cta: 'Buy Compliance Subscription',
    intake: 'compliance',
    inclusions: [
      'Drug & Alcohol Consortium membership included',
      'Annual UCR filing handled (UCR fee for 0–2 units included)',
      'Quarterly compliance check-ins (MCS-150, licenses, filings)',
      'Annual Driver Query',
      'IFTA Quarterly Filing (carrier IFTA taxes not included)',
      'Priority email support',
    ],
    fees: [
      { label: 'Our monthly service fee', amount: 89, kind: 'ours' },
      {
        label: 'Annual UCR government fee (0–2 units)',
        amount: 0,
        kind: 'government',
        note: 'Covered by your subscription',
      },
    ],
  },
  {
    slug: 'consortium',
    name: 'Consortium Membership',
    tagline: 'Annual DOT drug & alcohol consortium membership.',
    price: 139,
    billing: '/yr',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy Consortium',
    intake: 'compliance',
    inclusions: ['Annual consortium membership', 'Random testing program management'],
    fees: [{ label: 'Our service fee', amount: 139, kind: 'ours' }],
  },
  {
    slug: 'clearinghouse',
    name: 'Clearinghouse Setup',
    tagline: 'FMCSA Drug & Alcohol Clearinghouse account setup.',
    price: 139,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy Clearinghouse Setup',
    intake: 'compliance',
    inclusions: ['Clearinghouse account registration', 'Setup guidance'],
    fees: [{ label: 'Our service fee', amount: 139, kind: 'ours' }],
  },
  {
    slug: 'boc3',
    name: 'BOC-3 Filing',
    tagline: 'Process agent filing for your operating authority.',
    price: 59,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy BOC-3 Filing',
    intake: 'authority',
    inclusions: ['BOC-3 process agent designation filed in all states'],
    fees: [{ label: 'Our service fee', amount: 59, kind: 'ours' }],
  },
  {
    slug: 'ucr',
    name: 'UCR Filing',
    tagline: 'Annual UCR registration, 0–2 power units, fee included.',
    price: 99,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy UCR Filing',
    intake: 'compliance',
    inclusions: ['UCR registration for 0–2 power units', 'Government UCR fee included'],
    fees: [{ label: 'UCR filing including government fee (0–2 units)', amount: 99, kind: 'ours' }],
  },
  {
    slug: 'audit-kit',
    name: 'Audit Assistance Kit',
    tagline: 'Nine folders and thirteen forms for audit readiness.',
    price: 139,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy Audit Kit',
    intake: 'compliance',
    inclusions: ['9 compliance folders', '13 ready-to-use forms'],
    fees: [{ label: 'Our service fee', amount: 139, kind: 'ours' }],
  },
  {
    slug: 'audit-plus',
    name: 'Audit Assistance Plus',
    tagline: 'One-on-one audit support from a compliance specialist.',
    price: 529,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy Audit Plus',
    intake: 'compliance',
    inclusions: ['1-on-1 new-entrant audit prep session', 'Document review before your audit'],
    fees: [{ label: 'Our service fee', amount: 529, kind: 'ours' }],
  },
];

export function formatUSD(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/** Server-safe package lookup (seed data only — no localStorage). */
export function getPackage(slug: string): Package | undefined {
  return SEED_PACKAGES.find((p) => p.slug === slug);
}


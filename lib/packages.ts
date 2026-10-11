/**
 * Shared package catalog — pure module, safe to import from server code
 * (API routes) and client components alike. No 'use client' here.
 * Source of truth: TheTruckingBusiness.com — Pricing & Packages
 * (Draft v1, October 11, 2026 — reviewed and corrected by owner).
 */

export interface FeeLine {
  label: string;
  amount: number; // USD; 0 allowed when marked "vary / at cost"
  kind: 'ours' | 'government';
  note?: string;
}

/** Purchasable variant of a product (e.g. State Permit: 1 state vs all 3). */
export interface PriceOption {
  id: string;
  label: string;
  price: number; // USD
}

/** Which intake form a product uses. New services get dedicated intakes. */
export type IntakeKind =
  | 'authority'
  | 'compliance'
  | 'state-permit'
  | 'motus'
  | 'clearinghouse-query'
  | 'mcs150';

export interface Package {
  slug: string;
  name: string;
  tagline: string;
  price: number; // USD — default price (first option when options exist)
  billing: 'one-time' | '/mo' | '/yr';
  placeholder: boolean; // true until the owner approves real pricing
  category: 'package' | 'alacarte';
  inclusions: string[];
  fees: FeeLine[]; // all-in breakdown: our fee + government fees included
  intake: IntakeKind;
  cta: string; // pricing-page button label (kept as "Buy ..." per owner)
  options?: PriceOption[];
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
    slug: 'authority-startup',
    name: 'Authority Startup',
    tagline: 'Motor carrier authority plus the core filings.',
    price: 879,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Authority Startup',
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
    tagline: 'Restore a DOT number marked "Not Authorized" or inactive.',
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
    slug: 'state-permit',
    name: 'State Permit Application Filing',
    tagline: 'Oregon, New Mexico, and Kentucky permits — we do all the paperwork.',
    price: 179,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy State Permit Filing',
    intake: 'state-permit',
    options: [
      { id: 'all3', label: 'All 3 states', price: 179 },
      { id: 'single', label: 'Single state', price: 89 },
    ],
    inclusions: [
      'Oregon — PUC permit (weight-mile tax)',
      'New Mexico — Weight-Distance Tax (WDT) permit',
      'Kentucky — KYU number',
      'State permit fees, if any, billed separately',
      'Oregon surety bond provided separately by the carrier',
    ],
    fees: [
      {
        label: 'Our service fee',
        amount: 179,
        kind: 'ours',
        note: '$89 for a single state',
      },
    ],
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
      'MCS-150 (Motor Carrier Identification Report) biennial update',
      'Quarterly compliance check-ins (licenses, filings, deadlines)',
      'Annual Driver Query',
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
    slug: 'audit-kit',
    name: 'Audit Assistance Kit',
    tagline: 'Every folder, form, and policy you need to pass a safety audit.',
    price: 139,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Audit Kit',
    intake: 'compliance',
    inclusions: [
      'Folder 1 — Driver List + Equipment List (PDF + Excel)',
      'Folder 3 — Accident Register (PDF + Excel)',
      'Folder 4 — Driver qualification file forms',
      'Folder 5 — Previous Employer Inquiry (drug & alcohol history)',
      'Folder 6 — Driver’s Statement of On-Duty Hours',
      'Folders 7 & 8 — Truck & trailer maintenance tracking + written plans',
      'Written Drug & Alcohol Testing Policy template',
      'Safety Audit Kit Guide — 16 automatic failures, retention, checklists',
    ],
    fees: [{ label: 'Our service fee', amount: 139, kind: 'ours' }],
  },
  {
    slug: 'audit-plus',
    name: 'Audit Assistance Plus (1-on-1 audit support)',
    tagline: 'One-on-one audit support from a compliance specialist.',
    price: 539,
    billing: 'one-time',
    placeholder: false,
    category: 'package',
    cta: 'Buy Audit Plus',
    intake: 'compliance',
    inclusions: [
      'Everything in the Audit Assistance Kit',
      '1-on-1 mock safety audit with a compliance coach reviewing your actual files',
      'Written gap report prioritized around the 16 automatic failures',
      '30 days of follow-up Q&A',
    ],
    fees: [{ label: 'Our service fee', amount: 539, kind: 'ours' }],
  },
  {
    slug: 'motus',
    name: 'MOTUS Set-up',
    tagline: 'Set up your FMCSA MOTUS (Registration and Management system) account.',
    price: 139,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy MOTUS Set-up',
    intake: 'motus',
    inclusions: [
      'Carrier MOTUS account setup',
      'Identity verification walkthrough for the company official',
    ],
    fees: [{ label: 'Our service fee', amount: 139, kind: 'ours' }],
  },
  {
    slug: 'clearinghouse',
    name: 'FMCSA Drug & Alcohol Clearinghouse Account Set-up',
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
    slug: 'clearinghouse-query',
    name: 'FMCSA Drug & Alcohol Clearinghouse Annual Query',
    tagline: 'We conduct your driver’s annual Clearinghouse query.',
    price: 39,
    billing: '/year',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy Annual Query',
    intake: 'clearinghouse-query',
    inclusions: [
      'Annual driver query conducted in the FMCSA Clearinghouse',
      'For carriers with an established Clearinghouse account',
    ],
    fees: [{ label: 'Our service fee', amount: 39, kind: 'ours' }],
  },
  {
    slug: 'ucr',
    name: 'Unified Carrier Registration (UCR)',
    tagline: 'Annual UCR renewal, 0–2 units, 2027 government fee included.',
    price: 79,
    billing: '/year',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy UCR Filing',
    intake: 'compliance',
    inclusions: [
      'UCR registration renewed each year',
      '2027 UCR government fee (0–2 units) included',
    ],
    fees: [
      { label: '2027 UCR government fee (0–2 units)', amount: 55, kind: 'government' },
      { label: 'Our processing and service fee', amount: 24, kind: 'ours' },
    ],
  },
  {
    slug: 'mcs150',
    name: 'Motor Carrier Identification Report (MCS-150 Update)',
    tagline: 'MCS-150 biennial update — carrier information kept current.',
    price: 79,
    billing: 'one-time',
    placeholder: false,
    category: 'alacarte',
    cta: 'Buy MCS-150 Update',
    intake: 'mcs150',
    inclusions: ['MCS-150 biennial update filed', 'Carrier information updated'],
    fees: [{ label: 'Our service fee', amount: 79, kind: 'ours' }],
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

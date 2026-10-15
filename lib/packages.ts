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

export interface ExpectedDocument {
  key: string;
  label: string;
  /** Auto-attached at purchase (e.g. the audit prep kit) — no owner upload needed. */
  auto?: boolean;
}

export interface RequestedDocument {
  key: string;
  label: string;
  /** Plain-language help shown under the item in the client portal. */
  hint?: string;
}

export interface Package {
  slug: string;
  name: string;
  tagline: string;
  price: number; // USD — default price (first option when options exist)
  billing: 'one-time' | '/month' | '/year';
  placeholder: boolean; // true until the owner approves real pricing
  category: 'package' | 'alacarte';
  inclusions: string[];
  fees: FeeLine[]; // all-in breakdown: our fee + government fees included
  intake: IntakeKind;
  cta: string; // pricing-page button label (kept as "Buy ..." per owner)
  options?: PriceOption[];
  /** Filing outputs the customer should expect in their portal. Services (calls,
   *  sessions, memberships) never appear here — documents only. Admin-editable. */
  expectedDocuments: ExpectedDocument[];
  /** Documents the customer uploads to us from their portal so the team can
   *  prepare the filing. Unset for packages that need nothing from the client. */
  requestedDocuments?: RequestedDocument[];
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
    expectedDocuments: [
      { key: 'mc-grant', label: 'MC Authority grant letter' },
      { key: 'dot-confirm', label: 'DOT number assignment confirmation' },
      { key: 'boc3', label: 'BOC-3 filing confirmation' },
      { key: 'ucr-confirm', label: 'UCR registration confirmation (1st year)' },
      { key: 'audit-kit', label: 'Audit prep kit (digital download)', auto: true },
    ],
    requestedDocuments: [
      {
        key: 'ein-letter',
        label: 'EIN letter (IRS Form CP 575)',
        hint: 'The letter the IRS sent when your EIN was assigned.',
      },
      {
        key: 'articles',
        label: 'Business license or articles of organization',
        hint: 'The document you formed your company with.',
      },
      {
        key: 'license-cdl',
        label: "Driver's license or CDL",
        hint: 'Front and back, for the driver on this order.',
      },
      {
        key: 'insurance-cert',
        label: 'Insurance certificate',
        hint: 'From your insurance agent, showing current coverage.',
      },
    ],
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
    expectedDocuments: [
      { key: 'mc-grant', label: 'MC Authority grant letter' },
      { key: 'dot-confirm', label: 'DOT number assignment confirmation' },
      { key: 'boc3', label: 'BOC-3 filing confirmation' },
      { key: 'ucr-confirm', label: 'UCR registration confirmation' },
    ],
    requestedDocuments: [
      {
        key: 'ein-letter',
        label: 'EIN letter (IRS Form CP 575)',
        hint: 'The letter the IRS sent when your EIN was assigned.',
      },
      {
        key: 'articles',
        label: 'Business license or articles of organization',
        hint: 'The document you formed your company with.',
      },
      {
        key: 'license-cdl',
        label: "Driver's license or CDL",
        hint: 'Front and back, for the driver on this order.',
      },
      {
        key: 'insurance-cert',
        label: 'Insurance certificate',
        hint: 'From your insurance agent, showing current coverage.',
      },
    ],
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
    expectedDocuments: [
      { key: 'dot-confirm', label: 'DOT number assignment confirmation' },
    ],
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
    expectedDocuments: [
      { key: 'reinstatement-confirm', label: 'DOT reinstatement confirmation' },
    ],
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
    expectedDocuments: [
      { key: 'state-permit-confirm', label: 'State permit confirmation' },
    ],
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
    billing: '/month',
    placeholder: false,
    category: 'package',
    cta: 'Buy Compliance Subscription',
    expectedDocuments: [
      { key: 'ucr-confirm-annual', label: 'UCR registration confirmation (annual)' },
      { key: 'mcs150-confirm', label: 'MCS-150 update confirmation' },
    ],
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
    expectedDocuments: [
      { key: 'audit-kit', label: 'Audit prep kit (digital download)', auto: true },
    ],
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
    expectedDocuments: [],
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
    expectedDocuments: [
      { key: 'setup-confirm', label: 'MOTUS account setup confirmation' },
    ],
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
    expectedDocuments: [
      { key: 'setup-confirm', label: 'Clearinghouse account setup confirmation' },
    ],
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
    expectedDocuments: [
      { key: 'query-result', label: 'Annual Clearinghouse query result' },
    ],
    requestedDocuments: [
      {
        key: 'license-cdl',
        label: "Driver's license or CDL",
        hint: 'Front and back, for the driver we will run the query for.',
      },
      {
        key: 'driver-consent',
        label: 'Signed driver consent form',
        hint: 'Signed by the driver. We cannot run the query without it.',
      },
    ],
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
    expectedDocuments: [
      { key: 'ucr-confirm', label: 'UCR registration confirmation' },
    ],
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
    expectedDocuments: [
      { key: 'mcs150-confirm', label: 'MCS-150 update confirmation' },
    ],
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

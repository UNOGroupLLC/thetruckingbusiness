'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  getOrder,
  saveIntakeSubmission,
  saveIntakeCorrection,
  certifyIntake,
  formatUSD,
  type IntakeStatus,
} from '@/lib/store';
import { syncIntake } from '@/lib/sync';
import { POA_TITLE, POA_SECTIONS } from '@/lib/poa';
import Field from '@/components/Field';
import ScheduleCall from '@/components/ScheduleCall';

/** The 50 states plus District of Columbia, used by every state dropdown. */
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
  'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas',
  'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin',
  'Wyoming',
];

/* ------------------------------ phone field ------------------------------ */

const PHONE_COUNTRIES: { label: string; code: string }[] = [
  { label: 'US +1', code: '1' },
  { label: 'Canada +1', code: '1' },
  { label: 'Mexico +52', code: '52' },
  { label: 'Spain +34', code: '34' },
  { label: 'UK +44', code: '44' },
  { label: 'Colombia +57', code: '57' },
  { label: 'Peru +51', code: '51' },
  { label: 'Chile +56', code: '56' },
  { label: 'Argentina +54', code: '54' },
  { label: 'Brazil +55', code: '55' },
];

/** Known dial codes, longest first so prefix matching is unambiguous. */
const PHONE_CODES = ['52', '34', '44', '57', '51', '56', '54', '55', '1'];

/**
 * Split a stored phone value into dial code + national digits. Accepts the
 * composed format ("+1 (478) 555-0134") and legacy raw values saved before
 * this control existed ("7252446771", "17252446771"): both read as +1.
 */
function parsePhone(value: string): { code: string; digits: string } {
  const raw = (value ?? '').trim();
  const allDigits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) {
    for (const code of PHONE_CODES) {
      if (allDigits.startsWith(code)) {
        return { code, digits: allDigits.slice(code.length) };
      }
    }
    return { code: '1', digits: allDigits };
  }
  if (allDigits.length === 11 && allDigits.startsWith('1')) {
    return { code: '1', digits: allDigits.slice(1) };
  }
  return { code: '1', digits: allDigits };
}

/** Progressive (XXX) XXX-XXXX formatting for +1 numbers; plain digits otherwise. */
function formatPhoneNational(code: string, digits: string): string {
  if (code !== '1') return digits;
  const d = digits.slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length > 0) return `(${d}`;
  return '';
}

/** The stored value: country code plus the formatted number. */
function composePhone(code: string, digits: string): string {
  if (!digits) return '';
  return `+${code} ${formatPhoneNational(code, digits)}`;
}

function PhoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parsed = parsePhone(value);
  // The picked code is remembered while the field is still empty, so
  // choosing a country before typing does not snap back to +1.
  const [picked, setPicked] = useState<string | null>(null);
  const code = value ? parsed.code : picked ?? '1';
  const digits = parsed.digits;
  return (
    <div className="flex gap-2">
      <select
        className="input w-[132px] flex-none"
        aria-label="Country code"
        value={code}
        onChange={(e) => {
          const next = e.target.value;
          setPicked(next);
          onChange(composePhone(next, digits));
        }}
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.label} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        className="input min-w-0 flex-1"
        type="tel"
        value={formatPhoneNational(code, digits)}
        placeholder="(555) 555-5555"
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          const nextDigits = code === '1' ? raw.slice(0, 10) : raw.slice(0, 15);
          onChange(composePhone(code, nextDigits));
        }}
      />
    </div>
  );
}

/* ------------------------------ field defs ------------------------------- */

interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  type?:
    | 'text'
    | 'email'
    | 'tel'
    | 'number'
    | 'date'
    | 'select'
    | 'state'
    | 'checkbox'
    | 'textarea'
    | 'note';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  /** Section header: each section is one wizard step. */
  section?: string;
  /** Only show (and validate) this field when another field has this value. */
  showIf?: { key: string; value: string };
  /** Only show when another field's value is one of these. */
  showIfIn?: { key: string; values: string[] };
  /** Only render for these package slugs (e.g. consortium items: Complete only). */
  onlyForPackages?: string[];
  /** For type 'note': body text under the label, and an optional numbered list. */
  note?: string;
  noteList?: string[];
  /** For the POA checkbox: render the scrollable POA panel above the field. */
  poaPanel?: boolean;
}

/** Shared mailing-address block used by the address steps of several forms. */
const MAILING_FIELDS: FieldDef[] = [
  { key: 'mailingSame', label: 'Is your mailing address the same as above?', type: 'select', options: ['Yes', 'No'] },
  { key: 'mailingStreet', label: 'Mailing street address', showIf: { key: 'mailingSame', value: 'No' } },
  { key: 'mailingCity', label: 'Mailing city', showIf: { key: 'mailingSame', value: 'No' } },
  { key: 'mailingState', label: 'Mailing state', type: 'state', showIf: { key: 'mailingSame', value: 'No' } },
  { key: 'mailingZip', label: 'Mailing ZIP code', showIf: { key: 'mailingSame', value: 'No' } },
];

const SIGNATURE_FIELDS: FieldDef[] = [
  { key: 'signature', label: 'Type your full legal name as your electronic signature' },
  { key: 'signDate', label: 'Date', type: 'date' },
];

/**
 * MC AUTHORITY INTAKE — modeled on FMCSA Form OP-1 (Application for Motor
 * Property Carrier Authority), rewritten in plain language. Serves the
 * Complete Package and Authority Startup. Section 6 captures the limited
 * POA (read and signed in the flow) plus, for the Complete Package only,
 * the consortium driver details and consortium/TPA authorizations.
 */
const AUTHORITY_FIELDS: FieldDef[] = [
  // Section 1 — About you
  { key: 'firstName', label: 'First name', section: 'About you' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email', hint: 'Filing confirmations and your receipt go here.' },
  { key: 'phone', label: 'Cell phone', type: 'tel', hint: 'For filing updates and your kickoff call.' },

  // Section 2 — Your business (OP-1 Section 1: Applicant Information)
  { key: 'legalName', label: 'Legal business name', section: 'Your business', hint: 'Exactly as it appears on your state registration and IRS records — filings are rejected over spelling differences.' },
  { key: 'dba', label: 'DBA / trade name', required: false, hint: 'Only if different from the legal name.' },
  { key: 'structure', label: 'Business structure', type: 'select', options: ['LLC', 'Corporation', 'Sole proprietorship', 'Partnership'] },
  { key: 'formationState', label: 'State where the business is registered', type: 'state' },
  { key: 'ein', label: 'EIN', hint: 'Your Employer Identification Number from the IRS (XX-XXXXXXX).' },

  // Section 3 — Business address (OP-1: Principal place of business)
  { key: 'street', label: 'Street address', section: 'Business address', hint: 'Physical address — no P.O. Box. FMCSA uses this for safety audits.' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State', type: 'state' },
  { key: 'zip', label: 'ZIP code' },
  ...MAILING_FIELDS,

  // Section 4 — Your operating authority (OP-1 Sections 2 & 3)
  { key: 'hasDot', label: 'Do you already have a USDOT number?', section: 'Your operating authority', type: 'select', options: ['No — I need one', 'Yes'] },
  { key: 'dotNumber', label: 'USDOT number', showIf: { key: 'hasDot', value: 'Yes' } },
  { key: 'cargoType', label: 'What will you haul?', type: 'select', options: ['General freight (non-hazardous)', 'Hazardous materials'], hint: 'This sets your required insurance level.' },
  { key: 'carrierType', label: 'How will you operate?', type: 'select', options: ['Haul for anyone — common carrier', 'Under contract with specific customers — contract carrier', 'Not sure — please advise me'] },
  { key: 'trucks', label: 'Number of trucks (power units)', type: 'number' },
  { key: 'drivers', label: 'Number of drivers (including yourself)', type: 'number' },
  { key: 'insuranceStatus', label: 'Insurance status', type: 'select', options: ['I have insurance', 'I am getting quotes', 'I need a referral'], hint: 'Your authority activates once your insurer files proof of insurance with FMCSA.' },

  // Section 5 — History check (OP-1 Section 5: Affiliations)
  { key: 'affiliated', label: 'In the last 3 years, have you owned, managed, or been connected to another trucking company?', section: 'History check', type: 'select', options: ['No', 'Yes'], hint: 'FMCSA requires us to disclose this on your application.' },
  { key: 'affiliateName', label: 'Company name', showIf: { key: 'affiliated', value: 'Yes' } },
  { key: 'affiliateMc', label: 'MC number (if known)', required: false, showIf: { key: 'affiliated', value: 'Yes' } },

  // Section 6 — Confirm & authorize (OP-1 Section 8: Applicant's Oath, adapted).
  // For the Complete Package this step opens with the consortium driver
  // details and the driver consent line (audit step 6: "Your drivers and
  // authorization"); both carry the same section name so the wizard keeps
  // them in one step, and both are hidden for Authority Startup.
  { key: 'driverDetails', label: 'Driver details for consortium enrollment', type: 'textarea', required: false, section: 'Confirm & authorize', onlyForPackages: ['complete'], hint: 'One driver per line: full name, CDL number, CDL issuing state, and date of birth. We need this to enroll your drivers in the drug & alcohol consortium.', placeholder: 'Jane Doe, CDL 1234567, TX, 01/15/1990' },
  { key: 'driverConsentNote', type: 'note', onlyForPackages: ['complete'], label: 'Driver consent', note: 'Each driver you listed will need to sign a general consent form for the annual Clearinghouse queries. You can upload the signed forms in your portal under Documents we need from you.' },
  { key: 'confirmTrue', label: 'I confirm that the information I provided is true and correct.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'poaAuth', label: 'I have read the limited power of attorney above and I certify that I am authorized to sign it for my company.', type: 'checkbox', poaPanel: true, hint: 'The signed copy is saved with your order, and you can see it any time in your portal documents.' },
  { key: 'consortiumAuth', label: 'I authorize The Trucking Business to enroll my drivers in a DOT drug & alcohol consortium and to coordinate my FMCSA Clearinghouse registration. I understand the C/TPA designation itself is completed inside my own Clearinghouse account, with step by step guidance from the team.', type: 'checkbox', onlyForPackages: ['complete'] },
  ...SIGNATURE_FIELDS,
];

/**
 * INTRASTATE INTAKE — for the Intrastate DOT Number. A carrier
 * identification registration, not an operating authority application:
 * no OP-1, no BOC-3, no consortium questions.
 */
const INTRASTATE_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'About you' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },

  { key: 'legalName', label: 'Legal business name', section: 'Your business' },
  { key: 'dba', label: 'DBA / trade name', required: false, hint: 'Only if different from the legal name.' },
  { key: 'structure', label: 'Business structure', type: 'select', options: ['LLC', 'Corporation', 'Sole proprietorship', 'Partnership'] },
  { key: 'ein', label: 'EIN' },
  { key: 'operationState', label: 'State you operate in', type: 'state', hint: 'Intrastate means all of your operations stay inside this one state.' },

  { key: 'street', label: 'Street address', section: 'Business address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State', type: 'state' },
  { key: 'zip', label: 'ZIP code' },
  ...MAILING_FIELDS,

  { key: 'cargo', label: 'What do you haul?', section: 'Your operation', type: 'select', options: ['General freight', 'Household goods', 'Passengers', 'Other'] },
  { key: 'hazmat', label: 'Do you haul placarded hazardous materials?', type: 'select', options: ['No', 'Yes'] },
  { key: 'trucks', label: 'Number of trucks (power units)', type: 'number' },
  { key: 'drivers', label: 'Number of drivers (including yourself)', type: 'number' },
  { key: 'annualMiles', label: 'Total miles driven last year', type: 'number' },

  { key: 'confirmTrue', label: 'I confirm that the information I provided is true and correct.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'intraAuth', label: 'I authorize The Trucking Business to prepare and submit my intrastate USDOT registration on my behalf.', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/**
 * REINSTATEMENT INTAKE — for the DOT Number Reinstatement. The client
 * already has a carrier record; the form starts with that record and
 * what happened to it, then collects the updated MCS-150 dataset.
 */
const REINSTATEMENT_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'About you' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },

  { key: 'usdot', label: 'USDOT number', section: 'Your carrier record' },
  { key: 'mcNumber', label: 'MC number', required: false, hint: 'If you had operating authority.' },
  { key: 'legalName', label: 'Legal name as shown on your FMCSA record' },
  { key: 'ein', label: 'EIN' },

  { key: 'reason', label: 'Why was your DOT number deactivated?', section: 'What happened', type: 'select', options: ['I missed my MCS-150 biennial update', 'FMCSA revoked my operating authority', 'My new entrant registration was revoked', 'I deactivated it myself', 'I am not sure'] },
  { key: 'stillOperating', label: 'Are you still operating?', type: 'select', options: ['Yes', 'No'] },
  { key: 'noticeNote', type: 'note', label: 'Have an FMCSA notice?', note: 'If FMCSA sent you a notice about the deactivation, you can upload it in your portal under Documents we need from you. It helps us confirm the fastest path back.' },

  { key: 'street', label: 'Street address', section: 'Updated information' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State', type: 'state' },
  { key: 'zip', label: 'ZIP code' },
  ...MAILING_FIELDS,
  { key: 'operation', label: 'Operation type', type: 'select', options: ['Interstate', 'Intrastate'] },
  { key: 'cargo', label: 'Main cargo', type: 'select', options: ['General freight', 'Household goods', 'Building materials', 'Metal coils', 'Logs and lumber', 'Passengers', 'Other'] },
  { key: 'hazmat', label: 'Do you transport hazardous materials?', type: 'select', options: ['No', 'Yes'] },
  { key: 'trucks', label: 'Number of trucks (power units)', type: 'number' },
  { key: 'drivers', label: 'Number of drivers (including yourself)', type: 'number' },
  { key: 'annualMiles', label: 'Total miles driven last year', type: 'number' },

  { key: 'confirmTrue', label: 'I confirm that the information I provided is true and correct.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'reinstateAuth', label: 'I authorize The Trucking Business to prepare and submit my DOT number reinstatement filing, including any MCS-150 update needed to complete it, on my behalf.', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/**
 * COMPLIANCE SUBSCRIPTION ONBOARDING — rebuilt for the subscription. Its
 * inclusions (consortium membership, Clearinghouse account, UCR filing,
 * MCS-150 updates, annual driver query) need the compliance contact, the
 * EIN and address, the fleet dataset, and the driver roster. The old
 * generic form had none of that, and no authorization or signature.
 */
const COMPLIANCE_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'Your contact' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'isContact', label: 'Are you the compliance contact for your company?', type: 'select', options: ['Yes', 'No'], hint: 'The compliance contact is the person we reach for filing deadlines and audit questions.' },
  { key: 'contactName', label: 'Compliance contact name', showIf: { key: 'isContact', value: 'No' } },
  { key: 'contactEmail', label: 'Compliance contact email', type: 'email', showIf: { key: 'isContact', value: 'No' } },

  { key: 'legalName', label: 'Legal business name', section: 'Your business' },
  { key: 'dba', label: 'DBA / trade name', required: false, hint: 'Only if different from the legal name.' },
  { key: 'ein', label: 'EIN' },
  { key: 'usdot', label: 'USDOT number' },
  { key: 'mc', label: 'MC number', required: false },

  { key: 'street', label: 'Street address', section: 'Business address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State', type: 'state' },
  { key: 'zip', label: 'ZIP code' },
  ...MAILING_FIELDS,

  { key: 'trucks', label: 'Number of trucks (power units)', section: 'Your fleet', type: 'number' },
  { key: 'drivers', label: 'Number of drivers', type: 'number' },
  { key: 'annualMiles', label: 'Total miles driven last year', type: 'number' },

  { key: 'driverRoster', label: 'Driver roster', section: 'Your drivers', type: 'textarea', hint: 'One driver per line: full name, CDL number, CDL issuing state, date of birth. We enroll these drivers in the consortium and run their annual queries.', placeholder: 'Jane Doe, CDL 1234567, TX, 01/15/1990' },
  { key: 'rosterConsentNote', type: 'note', label: 'Driver consent', note: 'Each driver also signs a general consent form for the annual query. The signed forms are uploaded in your portal under Documents we need from you.' },

  { key: 'chAccount', label: 'Is your FMCSA Clearinghouse account established?', section: 'Accounts and authorize', type: 'select', options: ['Established', 'Not yet', 'Not sure'] },
  { key: 'designationAck', label: 'I understand the C/TPA designation is completed inside my own Clearinghouse account, with step by step guidance from the team.', type: 'checkbox' },
  { key: 'consortiumEnrollAuth', label: 'I authorize The Trucking Business to enroll my drivers in a DOT drug & alcohol consortium.', type: 'checkbox' },
  { key: 'filingAuth', label: 'I authorize The Trucking Business to handle the UCR and MCS-150 filings included in my subscription.', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/**
 * AUDIT KIT — a digital download, delivered automatically at purchase and
 * attached in the portal. No intake is needed to fulfill it, so the form
 * is a single short confirm step (name, email, optional company name):
 * routing still sends the buyer here from checkout and the portal, and a
 * one-step confirm is the least invasive correct version.
 */
const AUDIT_KIT_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'Confirm your details' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email', hint: 'Your kit is delivered in your portal, and we email you when it is ready.' },
  { key: 'companyName', label: 'Company name', required: false },
];

/**
 * AUDIT ASSISTANCE PLUS — the coach cannot prepare a mock audit without
 * knowing the audit (type, agency, date) and seeing the client's files.
 * The record selection lives here; the files themselves are uploaded in
 * the portal as requested documents.
 */
const AUDIT_PLUS_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'About you' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },

  { key: 'legalName', label: 'Legal business name', section: 'Your company' },
  { key: 'usdot', label: 'USDOT number' },
  { key: 'mc', label: 'MC number', required: false },
  { key: 'trucks', label: 'Number of trucks', type: 'number' },
  { key: 'drivers', label: 'Number of drivers', type: 'number' },

  { key: 'auditType', label: 'What kind of audit is this?', section: 'Your audit', type: 'select', options: ['New entrant safety audit', 'Compliance review', 'Focused audit', 'No audit scheduled', 'I want a practice run'] },
  { key: 'auditAgency', label: 'Who is auditing you?', type: 'select', options: ['FMCSA', 'State agency', 'Not sure'] },
  { key: 'auditDate', label: 'Audit date', type: 'date', required: false, hint: 'Leave blank if no date is set.' },

  { key: 'recordsIntro', type: 'note', section: 'Your records', label: 'What do you have ready?', note: 'Check everything you have. It is fine if some are missing; the gap report will cover them.' },
  { key: 'recordsDq', label: 'Driver qualification files', type: 'checkbox', required: false },
  { key: 'recordsMaint', label: 'Vehicle maintenance records', type: 'checkbox', required: false },
  { key: 'recordsDa', label: 'Drug and alcohol testing records', type: 'checkbox', required: false },
  { key: 'recordsHos', label: 'Hours of service records', type: 'checkbox', required: false },
  { key: 'recordsNone', label: 'None of these yet', type: 'checkbox', required: false },
  { key: 'eld', label: 'ELD provider', required: false, hint: 'If you already use one.' },
  { key: 'recordsNote', type: 'note', label: 'Sending your files', note: 'The files themselves are uploaded in your portal under Documents we need from you, so your coach can review them before your session.' },

  { key: 'auditPlusAuth', label: 'I authorize The Trucking Business to review my company files and prepare my audit gap report.', section: 'Confirm & authorize', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/**
 * STATE PERMIT INTAKE — for State Permit Application Filing (OR / NM / KY).
 * The accounts key off the carrier's USDOT record, tax ID, and address.
 * Oregon enrolls individual vehicles, so the vehicle step appears only
 * when Oregon is selected.
 */
const STATE_PERMIT_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'About you' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },

  { key: 'legalName', label: 'Legal business name', section: 'Your business' },
  { key: 'dba', label: 'DBA / trade name', required: false, hint: 'Only if different from the legal name.' },
  { key: 'ein', label: 'EIN' },
  { key: 'usdot', label: 'USDOT number' },

  { key: 'street', label: 'Street address', section: 'Business address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State', type: 'state' },
  { key: 'zip', label: 'ZIP code' },
  ...MAILING_FIELDS,

  { key: 'statesNeeded', label: 'Which state permit(s) do you need?', section: 'Your permits', type: 'select', options: ['Oregon — PUC permit', 'New Mexico — Weight-Distance Tax (WDT) permit', 'Kentucky — KYU number', 'All three states'] },
  { key: 'existingAccounts', label: 'Existing state account numbers', required: false, hint: 'Tell us if you already have an Oregon, New Mexico, or Kentucky account, and the account number if you know it.' },

  { key: 'vehicles', label: 'Vehicle details (Oregon)', section: 'Your vehicles', type: 'textarea', showIfIn: { key: 'statesNeeded', values: ['Oregon — PUC permit', 'All three states'] }, hint: 'One vehicle per line: unit number, VIN, license plate and state, combined weight. New Mexico and Kentucky do not need vehicle details at setup.', placeholder: 'Unit 12, VIN 1FUJGHDV5KL123456, Plate ABC-1234 FL, 80,000 lbs' },

  { key: 'feeNote', label: 'I understand the service fee covers filing only — state permit fees, if any, are billed separately, and the Oregon surety bond must be provided by my company.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'permitAuth', label: 'I authorize The Trucking Business to prepare and submit my state permit application(s) on my behalf.', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/**
 * MOTUS INTAKE — for MOTUS Set-up. The company official must be an owner
 * or officer; MOTUS identity (biometric) verification can only be done
 * by them. Additions over the original form: the official's title, an
 * optional EIN, and Login.gov status.
 */
const MOTUS_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'Company official', hint: 'Must be an owner or officer of the company — MOTUS requires it.' },
  { key: 'lastName', label: 'Last name' },
  { key: 'title', label: 'Title', type: 'select', options: ['Owner', 'Officer', 'Managing member'] },
  { key: 'email', label: 'Email', type: 'email', hint: 'Used for the MOTUS account.' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },

  { key: 'legalName', label: 'Legal business name', section: 'Your business' },
  { key: 'ein', label: 'EIN', required: false },
  { key: 'usdot', label: 'USDOT number', required: false, hint: 'If you already have one.' },

  { key: 'logingov', label: 'Do you already have a Login.gov account?', section: 'Getting started', type: 'select', options: ['Yes', 'No', 'Not sure'] },
  { key: 'bestTime', label: 'Best time to reach you for the walkthrough', required: false },

  { key: 'verifyAck', label: 'I understand MOTUS requires identity verification (including biometric verification) completed by the company owner or officer themselves, and The Trucking Business cannot complete that verification step on my behalf.', section: 'Confirm & authorize', type: 'checkbox' },
  { key: 'motusAuth', label: 'I authorize The Trucking Business to set up my carrier MOTUS account and guide me through the verification process.', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/**
 * CLEARINGHOUSE SET-UP INTAKE — for the FMCSA Clearinghouse Account
 * Set-up. Registration centers on the Designated Employer Representative
 * (DER) and happens inside the client's own account; the form collects
 * who the DER is, the company record, and the C/TPA designation choice.
 */
const CLEARINGHOUSE_SETUP_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'About you' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'role', label: 'Your role', type: 'select', options: ['Owner', 'Designated Employer Representative (DER)', 'Safety manager', 'Other'] },

  { key: 'derSame', label: 'Is the Designated Employer Representative (DER) the same person as you?', section: 'Your account administrator', type: 'select', options: ['Yes', 'No'], hint: 'The DER is the person who administers your Clearinghouse account and receives its notices.' },
  { key: 'derName', label: 'DER full name', showIf: { key: 'derSame', value: 'No' } },
  { key: 'derEmail', label: 'DER email', type: 'email', showIf: { key: 'derSame', value: 'No' } },
  { key: 'derPhone', label: 'DER phone', type: 'tel', showIf: { key: 'derSame', value: 'No' } },

  { key: 'legalName', label: 'Legal business name', section: 'Your company' },
  { key: 'usdot', label: 'USDOT number' },

  { key: 'designationChoice', label: 'C/TPA designation', section: 'Designation', type: 'select', options: ['Walk me through designating The Trucking Business as my C/TPA, with Conduct Queries selected', 'Not at this time'] },
  { key: 'designationNote', type: 'note', label: 'How designation works', noteList: ['Sign in to the FMCSA Clearinghouse with Login.gov.', 'Open My Dashboard, then Manage, then C/TPAs.', 'Type our name in "Who is your C/TPA?" and select The Trucking Business.', 'Check the Conduct Queries box (and Report Violations if you want us to handle those too).', 'Click Save. Save sends the request to us.', 'We accept, and your designation shows Active.'] },
  { key: 'designationAckSetup', label: 'I understand registration and designation are completed inside my own Clearinghouse account, with step by step guidance from the team.', type: 'checkbox' },

  { key: 'setupAuth', label: 'I authorize The Trucking Business to guide my FMCSA Clearinghouse account setup.', section: 'Confirm & authorize', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/**
 * CLEARINGHOUSE ANNUAL QUERY INTAKE — for the $39 annual driver query.
 * Only for carriers with an established Clearinghouse account. A limited
 * query needs the driver's date of birth, the driver's own general
 * consent (held by the employer), an active C/TPA designation, and the
 * employer's own query plan; the form captures all four.
 */
const CLEARINGHOUSE_QUERY_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'Your company' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },
  { key: 'companyName', label: 'Company legal name' },
  { key: 'usdot', label: 'USDOT number' },

  { key: 'driverName', label: 'Driver full name', section: 'Driver for this query' },
  { key: 'driverDob', label: 'Driver date of birth', type: 'date' },
  { key: 'cdlNumber', label: 'CDL number' },
  { key: 'cdlState', label: 'CDL issuing state', type: 'state' },
  { key: 'driverIs', label: 'This driver is', type: 'select', options: ['My employee', 'Myself, I am the owner-operator'] },

  { key: 'consentStatus', label: 'Has the driver signed a general consent for Clearinghouse queries?', section: 'Driver consent', type: 'select', options: ['Yes, signed', 'Not yet, please send me the consent form'], hint: 'You keep the signed original. The federal rule asks you to hold it for 3 years from the last query.' },
  { key: 'consentTimeframe', label: 'Consent timeframe', type: 'select', options: ['Duration of employment', 'One year', 'This query only'], hint: 'The consent names the timeframe it covers.' },
  { key: 'consentNote', type: 'note', label: 'Why this matters', note: 'The annual Clearinghouse query can only run with the driver consent on file, and a current C/TPA designation. Without both, the query cannot be run.' },

  { key: 'chAccount', label: 'Is your FMCSA Clearinghouse account established?', section: 'Your Clearinghouse account', type: 'select', options: ['Yes — established', 'No — I need help setting one up first'], hint: 'This service is only for carriers with an established FMCSA Clearinghouse account.' },
  { key: 'designationStatus', label: 'Have you designated The Trucking Business as your C/TPA, with Conduct Queries selected?', type: 'select', options: ['Yes, I have designated you', 'Not yet, send me the steps'] },
  { key: 'designationNote', type: 'note', label: 'How to designate us (takes about 2 minutes)', noteList: ['Sign in to the FMCSA Clearinghouse with Login.gov.', 'Open My Dashboard, then Manage, then C/TPAs.', 'Type our name in "Who is your C/TPA?" and select The Trucking Business.', 'Check the Conduct Queries box (and Report Violations if you want us to handle those too).', 'Click Save. Save sends the request to us.', 'We accept, and your designation shows Active.'] },
  { key: 'queryPlan', label: 'Do you have a query plan or balance on your account?', type: 'select', options: ['Yes', 'Not yet'], hint: 'FMCSA sells query plans to employers only. A C/TPA cannot buy one for you.' },

  { key: 'queryAuth', label: 'I certify that I hold the driver consent described above and authorize The Trucking Business to run this annual limited query as my designated C/TPA. This is my service authorization for the query; the driver consent above is separate and stays on file with my company.', section: 'Confirm & authorize', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/**
 * MCS-150 INTAKE — for the Motor Carrier Identification Report biennial
 * update, following the MCS-150 dataset: business, both addresses,
 * operation, cargo, hazmat, fleet counts, CDL driver count, and mileage.
 */
const MCS150_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'About you' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },

  { key: 'legalName', label: 'Legal business name', section: 'Your business' },
  { key: 'dba', label: 'DBA / trade name', required: false, hint: 'Only if different from the legal name.' },
  { key: 'ein', label: 'EIN' },
  { key: 'usdot', label: 'USDOT number' },

  { key: 'street', label: 'Street address', section: 'Your addresses', hint: 'Your current principal address as it should appear on file.' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State', type: 'state' },
  { key: 'zip', label: 'ZIP code' },
  ...MAILING_FIELDS,

  { key: 'operation', label: 'Operation type', section: 'Your operation', type: 'select', options: ['Interstate', 'Intrastate'] },
  { key: 'carrierOperation', label: 'Carrier operation', type: 'select', options: ['Authorized for-hire', 'Private', 'Exempt for-hire'] },
  { key: 'cargo', label: 'Cargo hauled', type: 'select', options: ['General freight', 'Household goods', 'Building materials', 'Metal coils', 'Logs and lumber', 'Passengers', 'Other'], hint: 'Choose the one that matches most of your loads.' },
  { key: 'hazmat', label: 'Do you transport hazardous materials?', type: 'select', options: ['No', 'Yes'] },

  { key: 'trucks', label: 'Number of trucks (power units)', section: 'Fleet and mileage', type: 'number' },
  { key: 'trailers', label: 'Number of trailers', type: 'number', required: false },
  { key: 'drivers', label: 'Number of drivers', type: 'number' },
  { key: 'cdlDrivers', label: 'Drivers holding a CDL', type: 'number' },
  { key: 'annualMiles', label: 'Total miles driven last year', type: 'number' },

  { key: 'mcs150Auth', label: 'I authorize The Trucking Business to prepare and submit my MCS-150 biennial update on my behalf.', section: 'Confirm & authorize', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/**
 * UCR INTAKE — the Unified Carrier Registration is filed against the
 * carrier's USDOT record and priced by fleet size. This package covers
 * 0 to 2 power units with the government fee included.
 */
const UCR_FIELDS: FieldDef[] = [
  { key: 'firstName', label: 'First name', section: 'About you' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Cell phone', type: 'tel' },

  { key: 'legalName', label: 'Legal business name', section: 'Your business' },
  { key: 'dba', label: 'DBA / trade name', required: false, hint: 'Only if different from the legal name.' },
  { key: 'ein', label: 'EIN' },
  { key: 'usdot', label: 'USDOT number' },
  { key: 'mc', label: 'MC number', required: false },

  { key: 'street', label: 'Street address', section: 'Business address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State', type: 'state' },
  { key: 'zip', label: 'ZIP code' },
  ...MAILING_FIELDS,

  { key: 'trucks', label: 'Number of power units you operate in interstate commerce', section: 'Your fleet', type: 'number' },
  { key: 'fleetNote', type: 'note', label: 'Fee bracket', note: 'This package covers 0 to 2 units, with the government fee included. If you run more than 2 units, we will quote the difference before filing.' },
  { key: 'registrationType', label: 'Registration type', type: 'select', options: ['New registration', 'Renewal'] },

  { key: 'ucrAuth', label: 'I authorize The Trucking Business to prepare and submit my UCR registration on my behalf.', section: 'Confirm & authorize', type: 'checkbox' },
  ...SIGNATURE_FIELDS,
];

/** Intake registry — each product's `intake` key maps to its dedicated form. */
const INTAKES: Record<string, { title: string; intro: string; fields: FieldDef[] }> = {
  authority: {
    title: 'Operating authority intake',
    intro:
      'These are the details we need to prepare your FMCSA operating authority filings — based on the official OP-1 application, in plain language. At the end you\u2019ll authorize us to file on your behalf. Double-check spelling: filings use exactly what you enter.',
    fields: AUTHORITY_FIELDS,
  },
  intrastate: {
    title: 'Intrastate DOT number intake',
    intro:
      'These are the details we need to register your USDOT number for intrastate operation. Intrastate means your operations stay inside one state.',
    fields: INTRASTATE_FIELDS,
  },
  reinstatement: {
    title: 'DOT number reinstatement intake',
    intro:
      'Tell us what happened and give us your current information. We review your status, then handle the reinstatement filing for you.',
    fields: REINSTATEMENT_FIELDS,
  },
  compliance: {
    title: 'Compliance intake',
    intro: 'These details let us set up your compliance program correctly from day one.',
    fields: COMPLIANCE_FIELDS,
  },
  'audit-kit': {
    title: 'Audit kit delivery details',
    intro:
      'Your Audit Assistance Kit is a digital download that lives in your portal. Confirm your details below and you are done.',
    fields: AUDIT_KIT_FIELDS,
  },
  'audit-plus': {
    title: 'Audit Assistance Plus intake',
    intro:
      'These details let your compliance coach prepare: your audit, your company, and the records you have ready.',
    fields: AUDIT_PLUS_FIELDS,
  },
  'state-permit': {
    title: 'State permit intake',
    intro:
      'These are the details we need to file your Oregon, New Mexico, or Kentucky permit application. State permit fees, if any, are billed separately.',
    fields: STATE_PERMIT_FIELDS,
  },
  motus: {
    title: 'MOTUS setup intake',
    intro:
      'These are the details we need to set up your FMCSA MOTUS account. Note: MOTUS identity verification must be completed by a company owner or officer — we\u2019ll walk you through it.',
    fields: MOTUS_FIELDS,
  },
  'clearinghouse-setup': {
    title: 'Clearinghouse account setup intake',
    intro:
      'These are the details we need to guide your FMCSA Clearinghouse account setup. Registration happens inside your own account, and we walk you through it.',
    fields: CLEARINGHOUSE_SETUP_FIELDS,
  },
  'clearinghouse-query': {
    title: 'Clearinghouse annual query intake',
    intro:
      'These are the details we need to run your driver\u2019s annual FMCSA Clearinghouse query. This service is only for carriers with an established Clearinghouse account.',
    fields: CLEARINGHOUSE_QUERY_FIELDS,
  },
  ucr: {
    title: 'UCR registration intake',
    intro:
      'These are the details we need to file your Unified Carrier Registration (UCR).',
    fields: UCR_FIELDS,
  },
  mcs150: {
    title: 'MCS-150 update intake',
    intro:
      'These are the details we need to file your MCS-150 biennial update and keep your carrier record current.',
    fields: MCS150_FIELDS,
  },
};

/**
 * Group the visible fields into wizard steps, one section per step. A
 * field starts a new step when its section differs from the step in
 * progress, so consecutive fields carrying the same section name (the
 * authority form's final step) stay together.
 */
function groupSteps(fields: FieldDef[]): { name: string; fields: FieldDef[] }[] {
  const groups: { name: string; fields: FieldDef[] }[] = [];
  for (const f of fields) {
    const last = groups[groups.length - 1];
    if (f.section && (!last || last.name !== f.section)) {
      groups.push({ name: f.section, fields: [f] });
    } else if (last) {
      last.fields.push(f);
    } else {
      groups.push({ name: '', fields: [f] });
    }
  }
  return groups;
}

function IntakeInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const service = params.service as string;
  const orderId = search.get('order');
  const order = getOrder(orderId);

  // Slug-conditional fields (the authority form's consortium items) only
  // exist on the packages that include them.
  const fields = (INTAKES[service]?.fields ?? []).filter(
    (f) => !f.onlyForPackages || f.onlyForPackages.includes(order?.packageSlug ?? '')
  );
  const intakeMeta = INTAKES[service];
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Pre-fill name/email from checkout so nothing is typed twice.
    // Saved intake answers always win when present.
    const [first = '', ...rest] = (order?.buyerName ?? '').trim().split(/\s+/);
    return {
      signDate: today,
      firstName: first,
      lastName: rest.join(' '),
      email: order?.buyerEmail ?? '',
      ...(order?.intake ?? {}),
    };
  });
  const [error, setError] = useState('');
  // Lifecycle: form -> (correction) -> certify -> locked. 'schedule' is the
  // Complete Package kickoff-call offer shown right after first submission.
  const [step, setStep] = useState<'form' | 'certify' | 'schedule'>(() =>
    order?.intakeStatus === 'corrected' ? 'certify' : 'form'
  );
  // Wizard position (1-based). Named wstep to stay clear of `step`, the
  // lifecycle state above.
  const [wstep, setWstep] = useState(1);
  // Certification screen state.
  const [certChecked, setCertChecked] = useState(false);
  const [certSig, setCertSig] = useState('');
  const [certDate, setCertDate] = useState(today);

  /** Fresh order on every render (store persists synchronously). */
  const fresh = getOrder(orderId);
  const status: IntakeStatus | undefined =
    fresh?.intakeStatus ?? (fresh?.intake && Object.keys(fresh.intake).length > 0 ? 'submitted' : undefined);
  const alreadySubmitted = status !== undefined;
  const correctionsUsed = fresh?.correctionsUsed ?? 0;
  const canCorrect = alreadySubmitted && correctionsUsed === 0 && status === 'submitted';
  const isLocked = status === 'certified' || status === 'filing';

  /** Fields currently visible (conditional fields only show when their trigger matches). */
  const visibleFields = fields.filter(
    (f) =>
      (!f.showIf || values[f.showIf.key] === f.showIf.value) &&
      (!f.showIfIn || f.showIfIn.values.includes(values[f.showIfIn.key] ?? ''))
  );

  // Wizard steps built from the visible fields only, so a step whose
  // fields are all hidden (Oregon vehicles, for example) never appears.
  const stepGroups = groupSteps(visibleFields);
  const currentStep = Math.min(wstep, Math.max(stepGroups.length, 1));
  const currentGroup = stepGroups[currentStep - 1];

  if (!intakeMeta) {
    return (
      <div className="sharp mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[20px] font-extrabold text-navy">Unknown service</h1>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="sharp mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[20px] font-extrabold text-navy">Order not found</h1>
        <p className="mt-2 text-steel">Please complete checkout first — intake is linked to your order.</p>
        <Link href="/pricing" className="btn-dark mt-6">Back to pricing</Link>
      </div>
    );
  }

  const title = intakeMeta.title;
  const intro = intakeMeta.intro;

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function orderInfo() {
    const current = getOrder(orderId)!;
    return {
      id: current.id,
      packageName: current.packageName,
      amount: formatUSD(current.amount),
      buyerName: current.buyerName,
      buyerEmail: current.buyerEmail,
      createdAt: current.createdAt,
    };
  }

  /** Required visible fields in a step that are still empty. */
  function missingIn(fs: FieldDef[]): FieldDef[] {
    return fs.filter(
      (f) => f.type !== 'note' && f.required !== false && !values[f.key]?.trim()
    );
  }

  function advance() {
    const missing = missingIn(currentGroup?.fields ?? []);
    if (missing.length > 0) {
      setError(`Please complete: ${missing.map((f) => f.label).join(', ')}.`);
      return;
    }
    setError('');
    setWstep(currentStep + 1);
    window.scrollTo(0, 0);
  }

  function goBack() {
    setError('');
    setWstep(Math.max(currentStep - 1, 1));
    window.scrollTo(0, 0);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // The submit button only renders on the final step; pressing Enter
    // submits the form from any step, so advance instead of saving.
    if (currentStep < stepGroups.length) {
      advance();
      return;
    }
    const current = getOrder(orderId);
    if (!current) {
      setError('Order not found. Please restart checkout.');
      return;
    }
    const missing = visibleFields.filter((f) => f.required !== false && !values[f.key]?.trim());
    if (missing.length > 0) {
      setError(`Please complete: ${missing.map((f) => f.label).join(', ')}.`);
      return;
    }
    // Only persist answers to currently-visible questions.
    const visibleKeys = new Set(visibleFields.map((f) => f.key));
    const data = Object.fromEntries(Object.entries(values).filter(([k]) => visibleKeys.has(k)));
    const labels = Object.fromEntries(visibleFields.map((f) => [f.key, f.label]));

    const doingCorrection =
      canCorrect && current.intake && Object.keys(current.intake).length > 0;

    if (doingCorrection) {
      // The one allowed correction -> v2, then certification.
      saveIntakeCorrection(current.id, data);
      syncIntake(current.id, orderInfo(), data, labels, { status: 'corrected', version: 2 });
      setError('');
      setStep('certify');
      window.scrollTo(0, 0);
      return;
    }

    saveIntakeSubmission(current.id, data);
    // Phase 2: persist server-side + email answers to the owner (best-effort).
    syncIntake(current.id, orderInfo(), data, labels, { status: 'submitted', version: 1 });
    // Phase 2: POST to /api/orders/[id]/intake -> Supabase + owner email notification
    if (current.packageSlug === 'complete') {
      // Complete Package includes a kickoff call — offer scheduling before fulfillment.
      setStep('schedule');
      return;
    }
    router.push(`/fulfillment?order=${current.id}`);
  }

  function certify(e: React.FormEvent) {
    e.preventDefault();
    const current = getOrder(orderId);
    if (!current) {
      setError('Order not found. Please restart checkout.');
      return;
    }
    if (!certChecked) {
      setError('Please check the certification box to continue.');
      return;
    }
    if (!certSig.trim() || !certDate) {
      setError('Please type your full legal name and the date.');
      return;
    }
    certifyIntake(current.id, certSig.trim(), certDate);
    const latest = getOrder(orderId);
    const data = latest?.intake ?? {};
    const labels = Object.fromEntries(fields.map((f) => [f.key, f.label]));
    const version = latest?.intakeVersions?.length ?? 2;
    syncIntake(current.id, orderInfo(), data, labels, {
      status: 'certified',
      version,
      certified: { name: certSig.trim(), date: certDate },
    });
    setError('');
    setStep('form'); // re-render -> locked view
    window.scrollTo(0, 0);
  }

  if (step === 'schedule') {
    return (
      <div className="sharp bg-mist py-14">
        <div className="mx-auto max-w-2xl px-4">
          <p className="eyebrow">Intake received ✓</p>
          <h1 className="mt-2 text-[28px] font-extrabold text-navy md:text-[36px]">Want a kickoff call?</h1>
          <p className="mt-2 text-steel">
            Your Complete Package includes a one-on-one walkthrough of your filings and next steps.
            Pick a time that works for you — or skip it and we&apos;ll handle everything by email.
          </p>
          <div className="mt-6">
            <ScheduleCall
              orderId={order!.id}
              order={{
                id: order!.id,
                packageName: order!.packageName,
                amount: formatUSD(order!.amount),
                buyerName: order!.buyerName,
                buyerEmail: order!.buyerEmail,
                createdAt: order!.createdAt,
                buyerPhone: values.phone ?? '',
              }}
              onDone={() => router.push(`/fulfillment?order=${order!.id}`)}
            />
          </div>
        </div>
      </div>
    );
  }

  const latestVersion = fresh?.intakeVersions?.[fresh.intakeVersions.length - 1];
  const reviewData = fresh?.intake ?? {};
  const reviewRows = fields
    .filter((f) => reviewData[f.key]?.trim())
    .map((f) => ({ label: f.label, value: reviewData[f.key] === 'yes' ? 'Yes — agreed/signed' : reviewData[f.key] }));

  if (isLocked) {
    const cert = latestVersion?.certifiedAt
      ? `${latestVersion.certifiedName} · ${latestVersion.certifiedDate}`
      : 'Certified final';
    return (
      <div className="sharp bg-mist py-14">
        <div className="mx-auto max-w-2xl px-4">
          <p className="eyebrow">Intake locked</p>
          <h1 className="mt-2 text-[28px] font-extrabold text-navy md:text-[36px]">Your intake is certified final</h1>
          <p className="mt-2 text-steel">
            Order <span className="font-bold text-charcoal">{order.id}</span> · {order.packageName}
          </p>
          <div className="mt-4 rounded-none border border-navy/20 bg-white px-4 py-3">
            <p className="text-[13.5px] font-bold text-navy">🔒 {cert}</p>
            <p className="mt-1 text-[13.5px] text-steel">
              {status === 'filing'
                ? 'We have started your filing — your information can no longer be changed.'
                : 'Your answers are locked. We will use them to start your filing.'}{' '}
              Need a change? Contact us and we&rsquo;ll handle it.
            </p>
          </div>
          <div className="card mt-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-steel">Your certified answers</p>
            <dl className="mt-3 space-y-1">
              {reviewRows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-[#dde3ec] py-2 text-[13.5px]">
                  <dt className="text-steel">{r.label}</dt>
                  <dd className="text-right font-medium text-charcoal">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'certify') {
    return (
      <div className="sharp bg-mist py-14">
        <div className="mx-auto max-w-2xl px-4">
          <p className="eyebrow">Final step — certify your corrections</p>
          <h1 className="mt-2 text-[28px] font-extrabold text-navy md:text-[36px]">Review &amp; certify</h1>
          <p className="mt-2 text-steel">
            You updated your intake. Please review the corrected answers below, then certify them as
            final. After certification your intake locks and we start your filing.
          </p>
          <div className="card mt-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-steel">Your corrected answers</p>
            <dl className="mt-3 space-y-1">
              {reviewRows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-[#dde3ec] py-2 text-[13.5px]">
                  <dt className="text-steel">{r.label}</dt>
                  <dd className="text-right font-medium text-charcoal">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <form onSubmit={certify} className="card mt-6 space-y-4">
            <label className="flex cursor-pointer gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-[#0f2a4a]"
                checked={certChecked}
                onChange={(e) => setCertChecked(e.target.checked)}
              />
              <span className="text-[13.5px] font-medium text-charcoal">
                I certify that these corrections are final and correct, and I authorize The Trucking
                Business to proceed with my filing using this information.
              </span>
            </label>
            <Field label="Type your full legal name as your electronic signature">
              <input className="input" value={certSig} onChange={(e) => setCertSig(e.target.value)} placeholder="Jane Doe" />
            </Field>
            <Field label="Date">
              <input className="input" type="date" value={certDate} onChange={(e) => setCertDate(e.target.value)} />
            </Field>
            {error && <p role="alert" className="text-[13.5px] font-semibold text-[#dc2626]">{error}</p>}
            <button type="submit" className="btn-primary w-full">Certify corrections as final</button>
            <p className="text-center text-[11px] text-steel">
              Your electronic signature is legally binding under the federal ESIGN Act.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="sharp bg-mist py-14">
      <div className="mx-auto max-w-2xl px-4">
        <p className="eyebrow">Step 3 of 3 — intake</p>
        <h1 className="mt-2 text-[28px] font-extrabold text-navy md:text-[36px]">{title}</h1>
        <p className="mt-2 text-steel">
          Order <span className="font-bold text-charcoal">{order.id}</span> · {order.packageName}
        </p>
        <p className="mt-2 text-[13.5px] text-steel">{intro}</p>
        {alreadySubmitted && !isLocked && (
          <div className="mt-4 rounded-none border border-highway/60 bg-highway/10 px-4 py-3">
            <p className="text-[13.5px] font-bold text-navy">You&rsquo;ve already submitted this intake ✓</p>
            <p className="mt-1 text-[13.5px] text-steel">
              Your answers are loaded below. You have <strong>one correction</strong> left — edit
              and save, then you&rsquo;ll certify the corrections as final.
            </p>
          </div>
        )}

        {/* Progress indicator: one wizard step per form section. */}
        <div className="relative mx-1 mt-6">
          <div
            aria-hidden
            className="absolute left-[10%] right-[10%] top-[15px] h-[3px] rounded-none bg-[#e6ebf2]"
          >
            <div
              className="h-full rounded-none bg-navy transition-all"
              style={{
                width: `${
                  stepGroups.length > 1
                    ? ((currentStep - 1) / (stepGroups.length - 1)) * 100
                    : 100
                }%`,
              }}
            />
          </div>
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${stepGroups.length}, minmax(0, 1fr))`,
            }}
          >
            {stepGroups.map((g, i) => {
              const n = i + 1;
              const done = n < currentStep;
              const now = n === currentStep;
              return (
                <div key={g.name || n} className="text-center">
                  <span
                    className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-none text-[12.5px] font-extrabold ${
                      done
                        ? 'bg-navy text-white'
                        : now
                          ? 'bg-highway text-navy shadow-[0_0_0_4px_rgba(255,198,26,0.25)]'
                          : 'bg-[#e6ebf2] text-steel'
                    }`}
                  >
                    {done ? '✓' : n}
                  </span>
                  <p
                    className={`mt-1.5 text-[11px] leading-[1.25] ${
                      now || done
                        ? 'font-extrabold text-navy'
                        : 'font-semibold text-steel'
                    }`}
                  >
                    {g.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={submit} className="card mt-6 space-y-4">
          <h2 className="border-b border-[#dde3ec] pb-2 text-[17px] font-extrabold text-navy">
            {currentGroup?.name}
          </h2>
          {currentGroup?.fields.map((f) => (
            <div key={f.key}>
              {f.type === 'note' ? (
                <div className="rounded-none border border-[#cfe0f2] bg-[#eef4fb] px-3.5 py-3">
                  {f.label && (
                    <p className="text-[13.5px] font-bold text-navy">{f.label}</p>
                  )}
                  {f.note && (
                    <p className="mt-0.5 text-[13.5px] leading-[1.6] text-charcoal">{f.note}</p>
                  )}
                  {f.noteList && (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13.5px] leading-[1.6] text-charcoal">
                      {f.noteList.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  )}
                </div>
              ) : f.type === 'checkbox' ? (
                <div>
                  {f.poaPanel && (
                    <div className="mb-4 max-h-[230px] overflow-y-auto rounded-none border border-[#dde3ec] bg-[#fbfcfe] px-4 py-3.5">
                      <p className="text-[13.5px] font-extrabold text-navy">{POA_TITLE}</p>
                      {POA_SECTIONS.map((s) => (
                        <div key={s.heading || 'intro'}>
                          {s.heading && (
                            <p className="mt-2.5 text-[13.5px] font-bold text-navy">{s.heading}</p>
                          )}
                          <p className="mt-0.5 text-[13.5px] leading-[1.7] text-charcoal">{s.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex cursor-pointer gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-[#0f2a4a]"
                      checked={values[f.key] === 'yes'}
                      onChange={(e) => set(f.key, e.target.checked ? 'yes' : '')}
                    />
                    <span className="text-[13.5px] font-medium text-charcoal">{f.label}</span>
                  </label>
                  {f.hint && <p className="ml-7 mt-1 text-[12.5px] text-steel">{f.hint}</p>}
                </div>
              ) : (
                <Field label={f.label + (f.required === false ? ' (optional)' : '')} hint={f.hint}>
                  {f.type === 'select' || f.type === 'state' ? (
                    <select className="input" value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                      <option value="">Select…</option>
                      {(f.type === 'state' ? US_STATES : f.options!).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === 'tel' ? (
                    <PhoneInput value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
                  ) : f.type === 'textarea' ? (
                    <textarea
                      className="input"
                      rows={3}
                      value={values[f.key] ?? ''}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder ?? 'Jane Doe, CDL 1234567, TX'}
                    />
                  ) : (
                    <input
                      className="input"
                      type={f.type ?? 'text'}
                      value={values[f.key] ?? ''}
                      placeholder={f.placeholder}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                </Field>
              )}
            </div>
          ))}
          {error && <p role="alert" className="text-[13.5px] font-semibold text-[#dc2626]">{error}</p>}
          <div className="flex gap-2.5">
            {currentStep > 1 && (
              <button type="button" className="btn-outline-dark" onClick={goBack}>
                Back
              </button>
            )}
            {currentStep < stepGroups.length ? (
              <button type="button" className="btn-primary flex-1" onClick={advance}>
                Continue
              </button>
            ) : (
              <button type="submit" className="btn-primary flex-1">
                {alreadySubmitted ? 'Save corrections' : 'Submit details'}
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-steel">
            Your answers go straight to our team so we can start your filing.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center">Loading intake…</div>}>
      <IntakeInner />
    </Suspense>
  );
}

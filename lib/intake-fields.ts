/**
 * Intake form field definitions: the single source of truth for every
 * service intake form (moved out of the intake page Oct 18, 2026 so
 * the admin filing information editor and the case file summary read
 * the same labels, field types, and answer options the client saw).
 */

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

export interface FieldDef {
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
export const INTAKES: Record<string, { title: string; intro: string; fields: FieldDef[] }> = {
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

/* ------------------------------------------------------------------ */
/* Shared labels and control types for the admin filing information    */
/* editor and the case file summary (Oct 18, 2026). The admin used to  */
/* render the raw data keys (firstName, signDate, cdlNumber) as        */
/* labels and a free text box for every answer, including answers the  */
/* client picked from a list. These helpers resolve each key against   */
/* the same definitions the client saw, so labels read as proper       */
/* English and choice answers stay inside their valid options.         */
/* ------------------------------------------------------------------ */

/** Certification fields staff must never retype: the client's own
 *  electronic signature and its date. Rendered read only in the admin
 *  and stripped again on the server (see the admin-edit route). */
export const LOCKED_INTAKE_KEYS: readonly string[] = ['signature', 'signDate'];

/** Short display names where the form label is a full sentence or the
 *  humanized key would read wrong. */
const SHORT_LABEL_OVERRIDES: Record<string, string> = {
  queryAuth: 'Query authorization',
  chAccount: 'Clearinghouse account',
  hasAccount: 'Has account',
  signature: 'Signature',
  signDate: 'Sign date',
  poaAuth: 'Power of attorney authorization',
  confirmTrue: 'Confirmed true and correct',
  consortiumAuth: 'Consortium authorization',
  consentStatus: 'Driver consent status',
  designationStatus: 'C/TPA designation status',
  driverDob: 'Driver date of birth',
  mailingSame: 'Mailing address same as above',
  hasDot: 'Has a USDOT number',
  affiliated: 'Affiliated with another company',
};

const TOKEN_WORDS: Record<string, string> = {
  usdot: 'USDOT',
  cdl: 'CDL',
  ein: 'EIN',
  dba: 'DBA',
  dob: 'DOB',
  dot: 'DOT',
  mc: 'MC',
  zip: 'ZIP',
  id: 'ID',
  auth: 'authorization',
};

/** firstName -> "First name", cdlNumber -> "CDL number". */
export function humanizeIntakeKey(key: string): string {
  const tokens = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean);
  return tokens
    .map((t, i) => {
      const mapped = TOKEN_WORDS[t.toLowerCase()];
      if (mapped) return mapped;
      return i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t.toLowerCase();
    })
    .join(' ');
}

function shortDefLabel(label: string): string | null {
  if (label.length > 42 || label.endsWith('?')) return null;
  return label;
}

/** The definition for a key when every form that uses the key agrees on
 *  its type and options; undefined when forms disagree (the caller then
 *  falls back to the order's own form, or to a plain text field). */
function agreedDef(key: string): FieldDef | undefined {
  let found: FieldDef | undefined;
  for (const form of Object.values(INTAKES)) {
    const def = form.fields.find((f) => f.key === key);
    if (!def) continue;
    if (!found) {
      found = def;
      continue;
    }
    const sameType = (found.type ?? 'text') === (def.type ?? 'text');
    const sameOptions =
      JSON.stringify(found.options ?? []) === JSON.stringify(def.options ?? []);
    if (!sameType || !sameOptions) return undefined;
  }
  return found;
}

/** Keys retired from the forms that still live in older submissions. */
const LEGACY_FIELD_META: Record<string, { label: string; type: string; options?: string[] }> = {
  hasAccount: {
    label: 'Has account',
    type: 'select',
    options: ['Yes — established', 'No — I need help setting one up first'],
  },
};

export interface IntakeFieldMeta {
  label: string;
  type: 'text' | 'date' | 'select' | 'state' | 'checkbox' | 'note';
  options?: string[];
}

/**
 * Label and editor control for one submitted intake answer. Resolution:
 * the order's own form definition first, then a key every form agrees
 * on, then retired-key metadata, then a plain text field. Checkboxes
 * become a two-state dropdown carrying the same stored wording the
 * client flow writes ('Yes — agreed/signed').
 */
export function intakeFieldMeta(
  service: string | null | undefined,
  key: string
): IntakeFieldMeta {
  const own = service ? INTAKES[service]?.fields.find((f) => f.key === key) : undefined;
  const def = own ?? agreedDef(key);
  const label =
    SHORT_LABEL_OVERRIDES[key] ??
    (def ? shortDefLabel(def.label) : null) ??
    humanizeIntakeKey(key);
  if (!def) {
    const legacy = LEGACY_FIELD_META[key];
    if (legacy) {
      return { label: legacy.label, type: 'select', options: legacy.options };
    }
    return { label, type: 'text' };
  }
  switch (def.type) {
    case 'select':
      return { label, type: 'select', options: def.options ?? [] };
    case 'state':
      return { label, type: 'state', options: US_STATES };
    case 'checkbox':
      return { label, type: 'checkbox', options: ['Yes — agreed/signed', 'No'] };
    case 'date':
      return { label, type: 'date' };
    case 'note':
      return { label, type: 'note' };
    default:
      return { label, type: 'text' };
  }
}

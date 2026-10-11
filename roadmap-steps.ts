/* The 7-step startup roadmap, from the approved prototype. */

export interface RoadmapStep {
  t: string; // title
  s: string; // subtitle
  d: string; // description
  c: string[]; // checklist
}

export const STEPS: RoadmapStep[] = [
  {
    t: 'Business Setup',
    s: 'LLC / corp + EIN',
    d: "Form your business entity, get an EIN, open business banking, and decide how you'll be taxed — before any DOT filings.",
    c: ['Entity formed & EIN in hand', 'Business bank account open', 'Operating agreement drafted'],
  },
  {
    t: 'USDOT Number',
    s: 'FMCSA registration',
    d: 'Your USDOT number is your safety identity with FMCSA. Accuracy here matters — errors follow your record.',
    c: ['USDOT application reviewed', 'MCS-150 data verified', 'PIN & portal access saved'],
  },
  {
    t: 'MC Authority',
    s: 'Operating authority',
    d: 'Interstate for-hire carriers generally need MC operating authority before hauling loads across state lines.',
    c: ['Authority type confirmed', 'FMCSA filing submitted', '21-day protest period tracked'],
  },
  {
    t: 'BOC-3 & Insurance',
    s: 'Filings that activate you',
    d: "Authority can't go active until your BOC-3 process agent and insurance filings reach FMCSA.",
    c: ['BOC-3 filed', 'Insurance filings received', 'Coverage meets minimums'],
  },
  {
    t: 'Registrations',
    s: 'UCR, IRP, IFTA',
    d: 'UCR, apportioned plates (IRP), and fuel tax (IFTA) depend on your operation and states of travel.',
    c: ['UCR registered', 'IRP cab card issued', 'IFTA license & decals'],
  },
  {
    t: 'Driver & Vehicle',
    s: 'Files & inspections',
    d: 'Driver Qualification Files, medical cards, road tests, and vehicle inspection programs — set up before day one.',
    c: ['DQ files complete', 'Medical examiner certs', 'Inspection schedule set'],
  },
  {
    t: 'Operate Legally',
    s: 'Roll compliant',
    d: "Hours of Service, ELDs, maintenance records, and your New Entrant Safety Audit window — now you're rolling right.",
    c: ['HOS / ELD configured', 'Maintenance program live', 'Audit-ready binder built'],
  },
];

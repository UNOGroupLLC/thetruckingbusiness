import { NextRequest, NextResponse } from 'next/server';
import { emailConfigured, sendClientEmail, backendConfigured, dbInsert } from '@/lib/server';
import {
  calculatorResultsEmail,
  cpmResultsEmail,
  startupResultsEmail,
  type CalculatorResultsData,
} from '@/lib/email';

/**
 * POST /api/calculators/email-results: "Email my results" on the free
 * calculators. Body: { calculator, email, headline, lines, company_website }
 *
 * `company_website` is a honeypot, same as the contact form: a filled
 * honeypot gets a silent success and nothing is sent or saved.
 *
 * The lead is saved to the admin Inquiries inbox (contact_messages) and the
 * visitor is emailed their own breakdown. In demo mode (email not
 * configured) the route still returns success so it never looks broken.
 */

const CALCULATORS = {
  'cost-per-mile': {
    title: 'Cost Per Mile Calculator',
    topic: 'Calculator results: Cost per mile',
  },
  startup: {
    title: 'Startup Cost Calculator',
    topic: 'Calculator results: Startup cost',
  },
} as const;

type CalculatorKey = keyof typeof CALCULATORS;

/* Calculator results emails go out from hello@ (owner ruling, Oct 16, 2026),
 * so a visitor's reply lands in the inbox the team reads. Every other email
 * keeps the shared EMAIL_FROM (orders@). */
const CALC_RESULTS_FROM = 'The Trucking Business <hello@thetruckingbusiness.com>';

const stripTags = (s: string): string => s.replace(/<[^>]*>/g, '').trim();

const cleanStr = (v: unknown, max = 120): string =>
  stripTags(typeof v === 'string' ? v : '').slice(0, max);

function cleanRows(v: unknown, maxRows = 8): [string, string][] {
  if (!Array.isArray(v)) return [];
  const out: [string, string][] = [];
  for (const r of v.slice(0, maxRows)) {
    if (Array.isArray(r)) out.push([cleanStr(r[0], 90), cleanStr(r[1], 60)]);
  }
  return out;
}

function cleanPair(v: unknown): [string, string] | null {
  if (!Array.isArray(v)) return null;
  return [cleanStr(v[0], 90), cleanStr(v[1], 60)];
}

/**
 * Sanitized structured results payload for the redesigned results emails.
 * Returns null when anything essential is missing or the kind does not
 * match the calculator, so the caller falls back to the plain line email.
 */
function cleanData(raw: unknown, calculator: string): CalculatorResultsData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  if (calculator === 'cost-per-mile' && d.kind === 'cpm') {
    const cpm = cleanStr(d.cpm, 40);
    const floorLoaded = cleanStr(d.floorLoaded, 40);
    const targetLoaded = cleanStr(d.targetLoaded, 40);
    const marginPct = cleanStr(d.marginPct, 12);
    const moneyRows = cleanRows(d.moneyRows, 6);
    const moneyTotal = cleanPair(d.moneyTotal);
    const monthRows = cleanRows(d.monthRows, 6);
    const breakdownRows = cleanRows(d.breakdownRows, 20);
    if (!cpm || !floorLoaded || !targetLoaded || !moneyTotal || moneyRows.length === 0) {
      return null;
    }
    return {
      kind: 'cpm',
      cpm,
      floorLoaded,
      targetLoaded,
      marginPct,
      moneyRows,
      moneyTotal,
      monthRows,
      breakdownRows,
    };
  }
  if (calculator === 'startup' && d.kind === 'startup') {
    const capital = cleanStr(d.capital, 40);
    const coverRows = cleanRows(d.coverRows, 6);
    const monthly = cleanStr(d.monthly, 40);
    const buffer = cleanStr(d.buffer, 40);
    const bufferMonths = cleanStr(d.bufferMonths, 30);
    const readyMoney = cleanStr(d.readyMoney, 40);
    const operation = cleanStr(d.operation, 120);
    if (!capital || !monthly || !buffer || coverRows.length === 0) return null;
    return {
      kind: 'startup',
      capital,
      coverRows,
      monthly,
      buffer,
      bufferMonths,
      readyMoney,
      operation,
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (String(body?.company_website ?? '').trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const calculator = String(body?.calculator ?? '') as CalculatorKey;
  const email = String(body?.email ?? '').trim();
  const headline = stripTags(String(body?.headline ?? ''));
  const rawLines: unknown[] = Array.isArray(body?.lines) ? body.lines : [];
  const lines = rawLines
    .map((l) => stripTags(String(l ?? '')))
    .filter((l) => l.length > 0)
    .slice(0, 40)
    .map((l) => l.slice(0, 160));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const valid =
    calculator in CALCULATORS &&
    emailOk &&
    headline.length > 0 &&
    headline.length <= 120 &&
    lines.length > 0 &&
    rawLines.length <= 40 &&
    rawLines.every((l) => String(l ?? '').length <= 160);
  if (!valid) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Please add a valid email address so we can send your results.',
      },
      { status: 400 }
    );
  }

  const meta = CALCULATORS[calculator];

  // Save the lead to the admin Inquiries inbox, with the numbers they saw,
  // so a follow-up conversation starts with their breakdown in hand.
  if (backendConfigured()) {
    await dbInsert('contact_messages', {
      name: 'Calculator lead',
      email,
      topic: meta.topic,
      message: [headline, ...lines].join('\n'),
    });
  }

  if (!emailConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const data = cleanData(body?.data, calculator);
  const { subject, html } =
    data?.kind === 'cpm'
      ? cpmResultsEmail(data)
      : data?.kind === 'startup'
        ? startupResultsEmail(data)
        : calculatorResultsEmail(meta.title, headline, lines);
  const r = await sendClientEmail(email, subject, html, undefined, CALC_RESULTS_FROM);
  if (!r.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'We could not send your results. Please email us directly at hello@thetruckingbusiness.com and we will send them over.',
      },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}

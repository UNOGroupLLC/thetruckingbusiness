import { NextRequest, NextResponse } from 'next/server';
import { emailConfigured, sendClientEmail, backendConfigured, dbInsert } from '@/lib/server';
import { calculatorResultsEmail } from '@/lib/email';

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

const stripTags = (s: string): string => s.replace(/<[^>]*>/g, '').trim();

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

  const { subject, html } = calculatorResultsEmail(meta.title, headline, lines);
  const r = await sendClientEmail(email, subject, html);
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

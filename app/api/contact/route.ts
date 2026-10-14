import { NextRequest, NextResponse } from 'next/server';
import { emailConfigured, sendOwnerEmail } from '@/lib/server';
import { contactEmail } from '@/lib/email';
import { CONTACT_TOPICS, DEFAULT_CONTACT_TOPIC } from '@/lib/contact';

/**
 * POST /api/contact — website contact form.
 * Body: { name, email, topic, message, company_website }
 *
 * `company_website` is a honeypot: humans never see the field, bots fill it.
 * A filled honeypot gets a silent success and nothing is sent.
 * Messages go to the owner inbox (OWNER_EMAIL) with reply-to set to the
 * sender, so the owner can answer in one click. In demo mode (Resend not
 * configured) the form still returns success so it never looks broken.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (String(body?.company_website ?? '').trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const rawTopic = String(body?.topic ?? '').trim();
  const topic = (CONTACT_TOPICS as readonly string[]).includes(rawTopic)
    ? rawTopic
    : DEFAULT_CONTACT_TOPIC;
  const message = String(body?.message ?? '').trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name || !emailOk || !message || name.length > 200 || message.length > 5000) {
    return NextResponse.json(
      { ok: false, error: 'Please add your name, a valid email address, and a message.' },
      { status: 400 }
    );
  }

  if (!emailConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const { subject, html } = contactEmail(name, email, topic, message);
  const r = await sendOwnerEmail(subject, html, email);
  if (!r.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'We could not send your message. Please email us directly at hello@thetruckingbusiness.com.',
      },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}

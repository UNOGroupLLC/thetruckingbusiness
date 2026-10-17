import { NextRequest, NextResponse } from 'next/server';
import { emailConfigured, sendOwnerEmail, backendConfigured, dbInsert } from '@/lib/server';
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

/* The owner notification goes out from inquiry@ (owner ruling, Oct 16, 2026),
 * so contact form messages are easy to spot and filter in the inbox. The
 * recipient is still the owner inbox, and reply-to is still the visitor. */
const CONTACT_FROM = 'The Trucking Business <inquiry@thetruckingbusiness.com>';
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (String(body?.company_website ?? '').trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const orderNumber = String(body?.orderNumber ?? '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 40);
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

  // Save to the admin Inquiries inbox as well as emailing the owner, so
  // messages are tracked, assignable, and never lost in an email thread.
  if (backendConfigured()) {
    await dbInsert('contact_messages', {
      name,
      email,
      topic,
      message: orderNumber ? `Order number: ${orderNumber}\n\n${message}` : message,
    });
  }

  if (!emailConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const { subject, html } = contactEmail(name, email, topic, message, orderNumber);
  const r = await sendOwnerEmail(subject, html, email, undefined, CONTACT_FROM);
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

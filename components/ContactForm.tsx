'use client';

import { useState } from 'react';
import Link from 'next/link';
import Field from '@/components/Field';
import { CONTACT_TOPICS, DEFAULT_CONTACT_TOPIC } from '@/lib/contact';

/**
 * Website contact form. Posts to /api/contact, which emails the message to
 * the owner inbox with reply-to set to the sender. Includes a hidden
 * honeypot field (company_website) that only bots fill.
 */
export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [topic, setTopic] = useState<string>(DEFAULT_CONTACT_TOPIC);
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          orderNumber: orderNumber.trim(),
          topic,
          message: message.trim(),
          company_website: website,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(
          data?.error ||
            'We could not send your message. Please email us directly at hello@thetruckingbusiness.com.'
        );
        return;
      }
      setSent(true);
    } catch {
      setError(
        'We could not send your message. Please email us directly at hello@thetruckingbusiness.com.'
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-none border border-[#dde3ec] bg-[#f6f7f9] px-6 py-6 text-center">
        <p className="text-[15px] font-extrabold text-[#0a1a36]">Message sent.</p>
        <p className="mt-1 text-[13px] text-[#5b6a82]">We&rsquo;ll get back to you by email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="contact-form mt-6 space-y-4">
      <Field label="Name">
        <input
          className="input"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </Field>
      <Field label="Email">
        <input
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>
      <Field label="Order number (if you have one)">
        <input
          className="input"
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="TTB-123456"
          autoComplete="off"
        />
      </Field>
      <Field label="What is this about?">
        <select
          className="input"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          {CONTACT_TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Message">
        <textarea
          className="input"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
        />
      </Field>
      {/* Honeypot: hidden from humans, bots fill it and get a silent success. */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <label>
          Company website
          <input
            type="text"
            name="company_website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-[#dc2626]">
          {error}
        </p>
      )}
      <button type="submit" disabled={sending} className="btn btn-y w-full disabled:opacity-60">
        {sending ? 'Sending…' : 'Send message'}
      </button>
      <p className="text-center text-[13px] leading-relaxed text-[#5b6a82]">
        Your information stays private. See our{' '}
        <Link href="/privacy-policy" className="font-semibold text-[#1755a8] hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

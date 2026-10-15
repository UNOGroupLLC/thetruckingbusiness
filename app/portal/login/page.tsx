'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setPortalEmail, setPortalToken } from '@/lib/store';
import Field from '@/components/Field';

/**
 * Passwordless portal login — real Supabase Auth OTP via /api/auth/*.
 * The login code goes to the customer's email inbox.
 */
export default function PortalLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const addr = email.trim();
    if (!addr.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'We could not send the code. Please try again.');
        return;
      }
      setStep('code');
      // 60s cooldown before resend.
      setCooldown(60);
      const t = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(t);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError('We could not send the code. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,10}$/.test(code.trim())) {
      setError('Enter the code from your email.');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'That code is incorrect or expired. Please try again.');
        return;
      }
      setPortalEmail(email.trim());
      if (data?.token) setPortalToken(data.token);
      router.push('/portal/dashboard');
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="bg-mist py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="card">
          <p className="eyebrow">Client portal</p>
          <h1 className="mt-2 text-[28px] font-extrabold text-navy">
            {step === 'email' ? 'Log in' : 'Check your email'}
          </h1>
          {step === 'email' ? (
            <>
              <p className="mt-2 text-[13.5px] text-steel">
                Enter the email you used at purchase. We&apos;ll email you a login code — no password needed.
              </p>
              <form onSubmit={sendCode} className="mt-5 space-y-4">
                <Field label="Email">
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </Field>
                {error && <p role="alert" className="text-[13.5px] font-semibold text-[#dc2626]">{error}</p>}
                <button type="submit" disabled={sending} className="btn-dark w-full disabled:opacity-60">
                  {sending ? 'Sending…' : 'Send code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-[13.5px] text-steel">
                We sent a login code to <span className="font-bold text-charcoal">{email}</span>.
                It may take a minute to arrive — check spam if you don&apos;t see it.
              </p>
              <form onSubmit={verify} className="mt-5 space-y-4">
                <Field label="Login code">
                  <input
                    className="input text-center text-[20px] font-bold tracking-[0.5em]"
                    inputMode="numeric"
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    aria-label="Login code from your email"
                  />
                </Field>
                {error && <p role="alert" className="text-[13.5px] font-semibold text-[#dc2626]">{error}</p>}
                <button type="submit" disabled={verifying} className="btn-dark w-full disabled:opacity-60">
                  {verifying ? 'Verifying…' : 'Verify & log in'}
                </button>
                <div className="flex items-center justify-between text-[13.5px]">
                  <button
                    type="button"
                    disabled={cooldown > 0 || sending}
                    onClick={() => sendCode()}
                    className="font-semibold text-dotblue hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
                  </button>
                  <button type="button" onClick={() => setStep('email')} className="font-semibold text-dotblue hover:underline">
                    Use a different email
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

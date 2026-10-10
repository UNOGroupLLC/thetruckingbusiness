'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setPortalEmail } from '@/lib/store';
import Field from '@/components/Field';

/**
 * MOCK passwordless login — Phase 1.
 * Phase 2: replace with Supabase Auth signInWithOtp (email) + verifyOtp (code).
 */
export default function PortalLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    // Phase 2: await supabase.auth.signInWithOtp({ email })
    setStep('code');
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code.');
      return;
    }
    // Phase 2: await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    setPortalEmail(email.trim());
    router.push('/portal/dashboard');
  }

  return (
    <div className="bg-mist py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="card">
          <p className="eyebrow">Client portal</p>
          <h1 className="mt-2 text-3xl font-extrabold text-navy">
            {step === 'email' ? 'Log in' : 'Check your email'}
          </h1>
          {step === 'email' ? (
            <>
              <p className="mt-2 text-sm text-steel">
                Enter the email you used at purchase. We&apos;ll send you a 6-digit code — no
                password needed.
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
                {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
                <button type="submit" className="btn-dark w-full">Send code</button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-steel">
                We sent a code to <span className="font-bold text-charcoal">{email}</span>.{' '}
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">
                  Demo: any 6 digits work
                </span>
              </p>
              <form onSubmit={verify} className="mt-5 space-y-4">
                <Field label="6-digit code">
                  <input
                    className="input text-center text-2xl font-bold tracking-[0.5em]"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    aria-label="6-digit login code"
                  />
                </Field>
                {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
                <button type="submit" className="btn-dark w-full">Verify &amp; log in</button>
                <button type="button" onClick={() => setStep('email')} className="w-full text-center text-sm font-semibold text-dotblue hover:underline">
                  Use a different email
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

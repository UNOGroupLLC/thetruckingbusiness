import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, sendOtpCode } from '@/lib/server';

/**
 * POST /api/auth/send-code — send a 6-digit portal login code via Supabase Auth.
 * Body: { email }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!authConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Login codes are not configured yet. Please contact us.' },
      { status: 503 }
    );
  }
  const r = await sendOtpCode(email);
  if (!r.ok) {
    const msg =
      r.status === 429
        ? 'Too many attempts — please wait a few minutes and try again.'
        : 'We could not send the code. Please try again.';
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

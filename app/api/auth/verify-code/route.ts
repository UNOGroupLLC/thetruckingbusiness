import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, verifyOtpCode } from '@/lib/server';

/**
 * POST /api/auth/verify-code — verify a 6-digit portal login code via Supabase Auth.
 * Body: { email, code }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const code = String(body?.code ?? '').trim();
  if (!email || !email.includes('@') || !/^\d{4,10}$/.test(code)) {
    return NextResponse.json({ ok: false, error: 'Enter the code from your email.' }, { status: 400 });
  }
  if (!authConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Login is not configured yet. Please contact us.' },
      { status: 503 }
    );
  }
  const r = await verifyOtpCode(email, code);
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'That code is incorrect or expired. Please try again.' },
      { status: 401 }
    );
  }
  return NextResponse.json({ ok: true });
}

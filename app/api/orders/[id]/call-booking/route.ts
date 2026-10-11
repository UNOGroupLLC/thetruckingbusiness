import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbInsert, sendOwnerEmail, sendClientEmail, emailConfigured } from '@/lib/server';
import { bookingEmail, clientBookingEmail, type OrderInfo } from '@/lib/email';

/**
 * POST /api/orders/[id]/call-booking — persist a kickoff-call booking + notify the owner.
 * Body: { order: OrderInfo, date: "YYYY-MM-DD", time: "11:00 AM" }
 * Production hardening: re-check slot availability in the DB before insert
 * (one client per hour) — the demo enforces it in the UI only.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const { order, date, time } = body ?? {} as {
    order?: OrderInfo;
    date?: string;
    time?: string;
  };

  if (!id || !order || !date || !time) {
    return NextResponse.json({ ok: false, error: 'Missing booking fields.' }, { status: 400 });
  }

  let persisted = false;
  let emailed = false;
  let clientEmailed = false;

  if (backendConfigured()) {
    persisted = (await dbInsert('call_bookings', { order_id: id, date, time })).ok;
  }

  if (emailConfigured()) {
    const { subject, html } = bookingEmail(order, date, time);
    emailed = (await sendOwnerEmail(subject, html)).ok;
    const client = clientBookingEmail(order, date, time);
    clientEmailed = (await sendClientEmail(order.buyerEmail, client.subject, client.html)).ok;
  }

  return NextResponse.json({ ok: true, persisted, emailed, clientEmailed });
}

import { NextRequest, NextResponse, connection } from 'next/server';
import {
  backendConfigured,
  dbDelete,
  dbInsert,
  dbSelect,
  sendOwnerEmail,
  sendClientEmail,
  emailConfigured,
} from '@/lib/server';
import { bookingEmail, clientBookingEmail, type OrderInfo } from '@/lib/email';
import { bookingIcs } from '@/lib/calendar';

/**
 * /api/orders/[id]/call-booking — kickoff-call bookings.
 *
 * GET: the slots already taken by OTHER orders, today (Eastern) onward,
 * so the scheduler can grey out hours that are genuinely booked. Slot
 * date/time pairs only; no personal data.
 *
 * POST: persist a booking + notify the owner and the customer.
 * Body: { order: OrderInfo, date: "YYYY-MM-DD", time: "11:00 AM" }
 * One client per hour is enforced here, not just in the picker: when the
 * backend is configured, the slot is checked first and a slot held by
 * another order returns 409 (and sends no emails). Booking again
 * replaces this order's previous booking. Both emails carry the same
 * real calendar invite (.ics, METHOD:REQUEST) for the booked hour.
 */

const SLOT_TAKEN_ERROR = 'That time was just booked by another client. Please pick a different time.';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Live database state: never prerender or cache this response.
  await connection();
  const { id } = await params;
  if (!backendConfigured()) {
    return NextResponse.json({ ok: true, taken: [] });
  }
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date());
  const res = await dbSelect<{ order_id: string; date: string; time: string }>(
    `call_bookings?select=order_id,date,time&date=gte.${encodeURIComponent(today)}`
  );
  const taken = res.rows
    .filter((r) => r.order_id !== id)
    .map((r) => ({ date: String(r.date).slice(0, 10), time: String(r.time) }));
  return NextResponse.json({ ok: true, taken });
}

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
    // One client per hour: refuse a slot another order already holds.
    const slotRes = await dbSelect<{ order_id: string }>(
      `call_bookings?select=order_id&date=eq.${encodeURIComponent(date)}&time=eq.${encodeURIComponent(time)}`
    );
    if (slotRes.rows.some((r) => r.order_id !== id)) {
      return NextResponse.json({ ok: false, error: SLOT_TAKEN_ERROR }, { status: 409 });
    }
    // Rebooking replaces this order's previous booking (unique(order_id)).
    await dbDelete('call_bookings', 'order_id', id);
    persisted = (await dbInsert('call_bookings', { order_id: id, date, time })).ok;
    if (!persisted) {
      // The unique (date, time) index (migration-009) caught a race the
      // check above could not see; report it the same way.
      return NextResponse.json({ ok: false, error: SLOT_TAKEN_ERROR }, { status: 409 });
    }
  }

  if (emailConfigured()) {
    const ics = bookingIcs({
      orderId: id,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      date,
      time,
    });
    const attachments = [
      { filename: 'kickoff-call.ics', content: Buffer.from(ics, 'utf8').toString('base64') },
    ];
    const { subject, html } = bookingEmail(order, date, time);
    emailed = (await sendOwnerEmail(subject, html, undefined, attachments)).ok;
    const client = clientBookingEmail(order, date, time);
    clientEmailed = (await sendClientEmail(order.buyerEmail, client.subject, client.html, attachments)).ok;
  }

  return NextResponse.json({ ok: true, persisted, emailed, clientEmailed });
}

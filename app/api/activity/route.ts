import { NextRequest, NextResponse, connection } from 'next/server';
import { backendConfigured, dbSelect } from '@/lib/server';

/**
 * GET /api/activity — the cross-order work log for the admin Team section:
 * who did what, on which order, and when (order_events, newest first).
 * ADMIN_KEY required (same lock as GET /api/orders).
 */
export async function GET(req: NextRequest) {
  // Run at request time: the response depends on the caller's admin key
  // and on live database state, so it must never be prerendered.
  await connection();
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey && (req.headers.get('x-admin-key') ?? '').trim() !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  if (!backendConfigured()) {
    return NextResponse.json({ ok: true, configured: false, events: [] });
  }
  const res = await dbSelect<{
    order_id: string;
    actor: string;
    action: string;
    detail: string | null;
    created_at: string;
  }>('order_events?select=order_id,actor,action,detail,created_at&order=created_at.desc&limit=100');
  if (!res.ok) {
    return NextResponse.json({ ok: true, configured: true, events: [] });
  }
  return NextResponse.json({
    ok: true,
    configured: true,
    events: res.rows.map((e) => ({
      orderId: e.order_id,
      actor: e.actor,
      action: e.action,
      detail: e.detail ?? undefined,
      createdAt: e.created_at,
    })),
  });
}

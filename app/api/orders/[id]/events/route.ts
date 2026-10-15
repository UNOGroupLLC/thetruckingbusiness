import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbInsert } from '@/lib/server';

/**
 * POST /api/orders/[id]/events — add a team note to an order's activity
 * trail. Body: { detail: string }. ADMIN_KEY required. Notes are internal:
 * customers never see order_events.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey && (req.headers.get('x-admin-key') ?? '').trim() !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const detail = String(body?.detail ?? '').trim();
  if (!id || !detail || detail.length > 2000) {
    return NextResponse.json({ ok: false, error: 'A note is required.' }, { status: 400 });
  }
  let persisted = false;
  if (backendConfigured()) {
    persisted = (
      await dbInsert('order_events', { order_id: id, actor: 'Owner', action: 'note', detail })
    ).ok;
  }
  return NextResponse.json({ ok: true, persisted });
}

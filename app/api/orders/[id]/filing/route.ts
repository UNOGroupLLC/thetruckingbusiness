import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbUpsert, logOrderEvent } from '@/lib/server';

/**
 * POST /api/orders/[id]/filing — owner pressed "Start filing".
 * Marks the order as filing (intake fully locked). Always ok:true.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Same ADMIN_KEY lock as GET /api/orders: when ADMIN_KEY is set in the
  // environment, only the owner (sending x-admin-key) can start a filing.
  const adminKey = process.env.ADMIN_KEY ?? '';
  if (adminKey && req.headers.get('x-admin-key') !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing order id.' }, { status: 400 });
  }
  let persisted = false;
  if (backendConfigured()) {
    persisted = (
      await dbUpsert(
        'orders',
        { id, filing_status: 'filing', filing_started_at: new Date().toISOString() },
        'id'
      )
    ).ok;
    if (persisted) await logOrderEvent(id, 'Owner', 'filing_started');
  }
  return NextResponse.json({ ok: true, persisted });
}

import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbUpdate, logOrderEvent } from '@/lib/server';

/**
 * POST /api/orders/[id]/filing — owner pressed "Start filing".
 * Marks the order as filing (intake fully locked). Reports honestly:
 * ok is true only when the change actually saved.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Same ADMIN_KEY lock as GET /api/orders: when ADMIN_KEY is set in the
  // environment, only the owner (sending x-admin-key) can start a filing.
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey && (req.headers.get('x-admin-key') ?? '').trim() !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing order id.' }, { status: 400 });
  }
  let persisted = false;
  if (backendConfigured()) {
    // True PATCH (dbUpdate), never a partial-row upsert: the orders table
    // has NOT NULL columns without defaults, so an upsert carrying only
    // these fields fails even when the order exists (the Oct 16 audit bug).
    persisted = (
      await dbUpdate('orders', 'id', id, {
        filing_status: 'filing',
        filing_started_at: new Date().toISOString(),
      })
    ).ok;
    if (persisted) await logOrderEvent(id, 'Owner', 'filing_started');
  }
  return NextResponse.json(
    { ok: persisted, persisted },
    { status: persisted ? 200 : 500 }
  );
}

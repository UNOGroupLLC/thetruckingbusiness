import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbUpsert } from '@/lib/server';

/**
 * POST /api/orders/[id]/filing — owner pressed "Start filing".
 * Marks the order as filing (intake fully locked). Always ok:true.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  }
  return NextResponse.json({ ok: true, persisted });
}

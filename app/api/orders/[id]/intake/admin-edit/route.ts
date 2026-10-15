import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbSelect, dbUpsert, logOrderEvent } from '@/lib/server';

/**
 * POST /api/orders/[id]/intake/admin-edit — the team corrects a customer's
 * intake information on their behalf (the customer asked by phone; filing
 * information is never customer-editable after certification, so changes
 * come through the office and are stamped in the activity trail).
 *
 * Body: { data: Record<string,string>, note?: string }
 * The edit merges into the LATEST submission version (same version row,
 * same status — it does not consume the customer's one correction and does
 * not change certification). ADMIN_KEY required.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey && (req.headers.get('x-admin-key') ?? '').trim() !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const data = (body?.data ?? null) as Record<string, string> | null;
  const note = String(body?.note ?? '').trim();
  if (!id || !data || typeof data !== 'object') {
    return NextResponse.json({ ok: false, error: 'Missing intake data.' }, { status: 400 });
  }
  if (!backendConfigured()) {
    return NextResponse.json({ ok: true, persisted: false });
  }
  const latest = await dbSelect<{
    data: Record<string, string>;
    status: string | null;
    version: number | null;
    certified: { name: string; date: string } | null;
  }>(
    `intake_submissions?select=data,status,version,certified&order_id=eq.${encodeURIComponent(id)}&order=version.desc&limit=1`
  );
  const row = latest.rows[0];
  if (!row) {
    return NextResponse.json(
      { ok: false, error: 'No intake submission to edit yet.' },
      { status: 404 }
    );
  }
  const merged = { ...(row.data ?? {}), ...data };
  const persisted = (
    await dbUpsert(
      'intake_submissions',
      {
        order_id: id,
        data: merged,
        status: row.status ?? 'submitted',
        version: row.version ?? 1,
        ...(row.certified ? { certified: row.certified } : {}),
      },
      'order_id,version'
    )
  ).ok;
  if (persisted) {
    await logOrderEvent(
      id,
      'Owner',
      'intake_edited',
      note || 'Intake information updated by the office'
    );
  }
  return NextResponse.json({ ok: true, persisted });
}

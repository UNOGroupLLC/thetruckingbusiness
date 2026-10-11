import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbUpsert, sendOwnerEmail, emailConfigured } from '@/lib/server';
import { intakeEmail, type OrderInfo } from '@/lib/email';

/**
 * POST /api/orders/[id]/intake — persist intake answers + email them to the owner.
 * Body: { order: OrderInfo, data: Record<string,string>, labels: Record<string,string> }
 * Always ok:true (client saved locally); reports persisted/emailed.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const { order, data, labels } = body ?? {} as {
    order?: OrderInfo;
    data?: Record<string, string>;
    labels?: Record<string, string>;
  };

  if (!id || !order || !data) {
    return NextResponse.json({ ok: false, error: 'Missing intake fields.' }, { status: 400 });
  }

  let persisted = false;
  let emailed = false;

  if (backendConfigured()) {
    persisted = (
      await dbUpsert('intake_submissions', { order_id: id, data }, 'order_id')
    ).ok;
  }

  if (emailConfigured()) {
    const { subject, html } = intakeEmail(order, data, labels ?? {});
    emailed = (await sendOwnerEmail(subject, html)).ok;
  }

  return NextResponse.json({ ok: true, persisted, emailed });
}

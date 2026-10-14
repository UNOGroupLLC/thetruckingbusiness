import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbUpsert, sendOwnerEmail, sendClientEmail, emailConfigured } from '@/lib/server';
import {
  intakeEmail,
  clientIntakeEmail,
  intakeCertifiedEmail,
  type OrderInfo,
} from '@/lib/email';

/**
 * POST /api/orders/[id]/intake — persist intake answers + email them to the owner.
 * Body: { order: OrderInfo, data: Record<string,string>, labels: Record<string,string>,
 *         status?: 'submitted'|'corrected'|'certified', version?: number,
 *         certified?: { name, date } }
 * Versioned rows: (order_id, version) unique. Always ok:true (client saved
 * locally); reports persisted/emailed.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const { order, data, labels, status, version, certified } = (body ?? {}) as {
    order?: OrderInfo;
    data?: Record<string, string>;
    labels?: Record<string, string>;
    status?: 'submitted' | 'corrected' | 'certified';
    version?: number;
    certified?: { name: string; date: string };
  };

  if (!id || !order || !data) {
    return NextResponse.json({ ok: false, error: 'Missing intake fields.' }, { status: 400 });
  }

  let persisted = false;
  let emailed = false;
  let clientEmailed = false;

  if (backendConfigured()) {
    if (status === 'corrected' || status === 'certified') {
      persisted = (
        await dbUpsert(
          'intake_submissions',
          {
            order_id: id,
            data,
            status,
            version: version ?? 2,
            ...(certified ? { certified } : {}),
          },
          'order_id,version'
        )
      ).ok;
    } else {
      // First submission: upsert on the real unique key (order_id, version)
      // and always write status + version. The old 'order_id' on-conflict
      // target did not match any unique constraint, so first submissions
      // silently failed to persist (Postgres 42P10) while returning ok:true.
      persisted = (
        await dbUpsert(
          'intake_submissions',
          { order_id: id, data, status: 'submitted', version: version ?? 1 },
          'order_id,version'
        )
      ).ok;
    }
  }

  if (emailConfigured()) {
    if (status === 'certified') {
      // Customer certified their corrections as final — notify the owner only.
      const { subject, html } = intakeCertifiedEmail(order, certified ?? { name: '', date: '' });
      emailed = (await sendOwnerEmail(subject, html)).ok;
    } else if (status === 'corrected') {
      // Owner gets the corrected answers; customer already knows (they just saved).
      const { subject, html } = intakeEmail(order, data, labels ?? {}, true);
      emailed = (await sendOwnerEmail(subject, html)).ok;
    } else {
      const { subject, html } = intakeEmail(order, data, labels ?? {});
      emailed = (await sendOwnerEmail(subject, html)).ok;
      const client = clientIntakeEmail(order);
      clientEmailed = (await sendClientEmail(order.buyerEmail, client.subject, client.html)).ok;
    }
  }

  return NextResponse.json({ ok: true, persisted, emailed, clientEmailed });
}

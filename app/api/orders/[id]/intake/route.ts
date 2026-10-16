import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbUpsert,
  dbSelect,
  dbInsert,
  dbUpdate,
  storageUpload,
  storageRemove,
  logOrderEvent,
  sendOwnerEmail,
  sendClientEmail,
  emailConfigured,
} from '@/lib/server';
import { buildSignedPoaHtml } from '@/lib/poa';
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

  // ---------------------------------------------------------------
  // Signed limited POA copy (authority intakes only). When the client
  // read and signed the limited POA inside the intake, generate the
  // standalone signed document and store it with the order's documents
  // so the business holds the signed copy on file. Best effort only:
  // a failure here must never fail the intake submission.
  // ---------------------------------------------------------------
  if (backendConfigured() && status !== 'certified') {
    try {
      // syncIntake prettifies checkbox answers before posting, so the
      // POA checkbox arrives as "Yes — agreed/signed", not "yes".
      const poaSigned =
        typeof data?.poaAuth === 'string' && data.poaAuth.startsWith('Yes');
      if (poaSigned) {
        const orderRes = await dbSelect<{ intake_service?: string }>(
          `orders?select=intake_service&id=eq.${encodeURIComponent(id)}&limit=1`
        );
        if (orderRes.rows[0]?.intake_service === 'authority') {
          const html = buildSignedPoaHtml({
            orderId: id,
            legalName: data.legalName ?? '',
            signerName: data.signature ?? '',
            signDate: data.signDate ?? '',
            submittedAt: new Date().toISOString(),
          });
          const path = `${id}/client/limited-poa-${id}.html`;
          const existingRes = await dbSelect<{ id: string; storage_path: string }>(
            `order_documents?select=id,storage_path&order_id=eq.${encodeURIComponent(
              id
            )}&slot_key=eq.limited-poa&order=uploaded_at.desc&limit=1`
          );
          const existingDoc = existingRes.rows[0] ?? null;
          const encoded = new TextEncoder().encode(html);
          const bytes = encoded.buffer.slice(
            encoded.byteOffset,
            encoded.byteOffset + encoded.byteLength
          ) as ArrayBuffer;
          const uploaded = await storageUpload(
            'order-documents',
            path,
            bytes,
            'text/html'
          );
          if (uploaded.ok) {
            if (existingDoc) {
              // A correction re-signed the POA: refresh the same copy.
              if (existingDoc.storage_path !== path) {
                await storageRemove('order-documents', existingDoc.storage_path);
              }
              await dbUpdate('order_documents', 'id', existingDoc.id, {
                storage_path: path,
                file_name: 'Limited power of attorney (signed).html',
                status: 'accepted',
              });
            } else {
              const inserted = await dbInsert('order_documents', {
                order_id: id,
                slot_key: 'limited-poa',
                slot_label: 'Signed limited power of attorney',
                file_name: 'Limited power of attorney (signed).html',
                storage_path: path,
                direction: 'from_client',
                status: 'accepted',
                staff_note: null,
              });
              if (!inserted.ok) {
                await storageRemove('order-documents', path);
              }
            }
            await logOrderEvent(
              id,
              'System',
              'poa_signed_copy_saved',
              'Signed limited power of attorney saved with the order documents'
            );
          }
        }
      }
    } catch (err) {
      console.error('[intake] signed POA copy failed', err);
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

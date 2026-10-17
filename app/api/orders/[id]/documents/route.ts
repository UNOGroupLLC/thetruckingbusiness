import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbInsert,
  storageObjectSize,
  storageRemove,
  sendClientEmail,
  emailConfigured,
  logOrderEvent,
} from '@/lib/server';
import { documentReadyEmail, type OrderInfo } from '@/lib/email';

/**
 * POST /api/orders/[id]/documents — register a staff document upload
 * (Oct 17, 2026, F9). The file itself already went straight from the
 * browser to Storage through the signed URL minted by the /sign route;
 * this call records it: it proves the object exists, enforces the
 * 50 MB cap against the stored object, inserts the order_documents
 * row, logs the activity event, and emails the customer "your
 * document is ready". When the save fails it answers ok:false with
 * status 502 so the admin panel shows the failure instead of claiming
 * success, and it removes the stored object so a failed save never
 * leaves an orphaned file behind.
 */

const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Same ADMIN_KEY lock as the rest of the admin API.
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey && (req.headers.get('x-admin-key') ?? '').trim() !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    slotKey?: string;
    slotLabel?: string;
    storagePath?: string;
    fileName?: string;
    orderInfo?: OrderInfo | null;
  } | null;
  const slotKey = String(body?.slotKey ?? '');
  const slotLabel = String(body?.slotLabel ?? '');
  const storagePath = String(body?.storagePath ?? '');
  const fileName = String(body?.fileName ?? '');
  const orderInfo = body?.orderInfo ?? null;

  // The path must be one the sign step minted for THIS order and slot.
  if (!id || !slotKey || !fileName || !storagePath.startsWith(`${id}/${slotKey}-`)) {
    return NextResponse.json({ ok: false, error: 'Missing file, slot, or order.' }, { status: 400 });
  }
  if (!orderInfo) {
    return NextResponse.json({ ok: false, error: 'Missing order.' }, { status: 400 });
  }

  let persisted = false;
  let emailed = false;

  if (backendConfigured()) {
    const size = await storageObjectSize('order-documents', storagePath);
    if (size === null) {
      return NextResponse.json(
        { ok: false, error: 'We could not find that uploaded file. Please try again.' },
        { status: 502 }
      );
    }
    if (size > MAX_BYTES) {
      await storageRemove('order-documents', storagePath);
      return NextResponse.json(
        { ok: false, error: 'That file is too large. The limit is 50 MB per file.' },
        { status: 400 }
      );
    }
    persisted = (
      await dbInsert('order_documents', {
        order_id: id,
        slot_key: slotKey,
        slot_label: slotLabel || slotKey,
        file_name: fileName,
        storage_path: storagePath,
      })
    ).ok;
    if (persisted) {
      await logOrderEvent(id, 'Owner', 'document_uploaded', slotLabel || slotKey);
    } else {
      await storageRemove('order-documents', storagePath);
    }
  }

  if (persisted && emailConfigured()) {
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host = req.headers.get('host') ?? 'thetruckingbusiness.vercel.app';
    const portalUrl = `${proto}://${host}/portal/login`;
    const { subject, html } = documentReadyEmail(orderInfo, slotLabel || slotKey, portalUrl);
    emailed = (await sendClientEmail(orderInfo.buyerEmail, subject, html)).ok;
  }

  if (backendConfigured() && !persisted) {
    return NextResponse.json(
      { ok: false, error: 'We could not save that document. Please try again.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, persisted, emailed });
}

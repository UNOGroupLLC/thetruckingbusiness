import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbInsert,
  dbSelect,
  emailConfigured,
  logOrderEvent,
  sendOwnerEmail,
  storageObjectSize,
  storageRemove,
  verifyPortalToken,
} from '@/lib/server';
import { getPackage } from '@/lib/packages';
import { documentUploadedByClientEmail } from '@/lib/email';

/**
 * POST /api/portal/orders/[id]/documents: register a client document
 * upload (Oct 17, 2026, F9). The file itself already went straight
 * from the browser to Storage through the signed URL minted by the
 * /sign route; this call records it: same auth (x-portal-token, the
 * order must belong to the token's email), the slot must be on the
 * package's requested list, the stored object must exist and respect
 * the 50 MB cap. The row lands in order_documents with direction
 * 'from_client' + status 'in_review' (migration-008). The owner is
 * emailed; the team reviews the upload in the admin panel. A file
 * whose row cannot be recorded is removed from Storage, so a failed
 * upload never leaves an orphaned file behind.
 */

const MAX_BYTES = 50 * 1024 * 1024;

interface OrderRow {
  id: string;
  package_slug: string;
  package_name: string;
  buyer_name: string;
  buyer_email: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = verifyPortalToken(req.headers.get('x-portal-token') ?? '');
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing order id.' }, { status: 400 });
  }
  if (!backendConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Uploads are not available right now. Please try again later.' },
      { status: 503 }
    );
  }

  const orderRes = await dbSelect<OrderRow>(
    `orders?select=id,package_slug,package_name,buyer_name,buyer_email&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  const order = orderRes.rows[0];
  if (!order) {
    return NextResponse.json({ ok: false, error: 'Order not found.' }, { status: 404 });
  }
  if (order.buyer_email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { ok: false, error: 'This order belongs to a different account.' },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    slotKey?: string;
    storagePath?: string;
    fileName?: string;
  } | null;
  const slotKey = String(body?.slotKey ?? '');
  const storagePath = String(body?.storagePath ?? '');
  const fileName = String(body?.fileName ?? '');

  const pkg = getPackage(order.package_slug);
  const slot = pkg?.requestedDocuments?.find((d) => d.key === slotKey);
  if (!slot) {
    return NextResponse.json(
      { ok: false, error: 'That document is not on the list for this order.' },
      { status: 400 }
    );
  }
  // The path must be one the sign step minted for THIS order and slot.
  if (!fileName || !storagePath.startsWith(`${id}/client/${slot.key}-`)) {
    return NextResponse.json(
      { ok: false, error: 'Please choose a file to upload.' },
      { status: 400 }
    );
  }

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

  const inserted = await dbInsert('order_documents', {
    order_id: id,
    slot_key: slot.key,
    slot_label: slot.label,
    file_name: fileName,
    storage_path: storagePath,
    direction: 'from_client',
    status: 'in_review',
    staff_note: null,
  });
  if (!inserted.ok) {
    await storageRemove('order-documents', storagePath);
    return NextResponse.json(
      { ok: false, error: 'We could not record that upload. Please try again.' },
      { status: 502 }
    );
  }

  await logOrderEvent(id, 'Client', 'document_uploaded_by_client', slot.label);

  if (emailConfigured()) {
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host = req.headers.get('host') ?? 'thetruckingbusiness.vercel.app';
    const { subject, html } = documentUploadedByClientEmail(
      {
        orderId: order.id,
        packageName: order.package_name,
        buyerName: order.buyer_name,
        buyerEmail: order.buyer_email,
        slotLabel: slot.label,
        fileName,
      },
      `${proto}://${host}/admin`
    );
    await sendOwnerEmail(subject, html, order.buyer_email).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}

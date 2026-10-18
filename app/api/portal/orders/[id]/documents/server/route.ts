import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbInsert,
  dbSelect,
  emailConfigured,
  logOrderEvent,
  sendOwnerEmail,
  storageRemove,
  storageUpload,
  verifyPortalToken,
} from '@/lib/server';
import { getPackage } from '@/lib/packages';
import { documentUploadedByClientEmail } from '@/lib/email';

/**
 * POST /api/portal/orders/[id]/documents: a signed-in client uploads one
 * of the documents their package asks for (EIN letter, license, ...).
 * Multipart form: file, slotKey.
 * Auth: x-portal-token header; the order must belong to the token's email.
 * The file lands in the private Storage bucket and an order_documents row
 * with direction 'from_client' + status 'in_review' (migration-008). The
 * owner is emailed; the team reviews the upload in the admin panel.
 */

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
]);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.heif']);

interface OrderRow {
  id: string;
  package_slug: string;
  package_name: string;
  buyer_name: string;
  buyer_email: string;
}

function fileAllowed(file: File): boolean {
  const type = (file.type ?? '').toLowerCase();
  if (ALLOWED_TYPES.has(type)) return true;
  // Some phones/browsers report no usable MIME type for HEIC photos; fall
  // back to the file extension in that case only.
  if (type === '' || type === 'application/octet-stream') {
    const dot = file.name.lastIndexOf('.');
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
    return ALLOWED_EXTENSIONS.has(ext);
  }
  return false;
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

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const slotKey = String(form?.get('slotKey') ?? '');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'Please choose a file to upload.' },
      { status: 400 }
    );
  }

  const pkg = getPackage(order.package_slug);
  const slot = pkg?.requestedDocuments?.find((d) => d.key === slotKey);
  if (!slot) {
    return NextResponse.json(
      { ok: false, error: 'That document is not on the list for this order.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'That file is too large to send this way. Please try again.' },
      { status: 400 }
    );
  }
  if (!fileAllowed(file)) {
    return NextResponse.json(
      { ok: false, error: 'Please upload a PDF, JPG, PNG, or HEIC file.' },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${id}/client/${slot.key}-${Date.now()}-${safeName}`;
  const bytes = await file.arrayBuffer();
  const up = await storageUpload(
    'order-documents',
    path,
    bytes,
    file.type || 'application/octet-stream'
  );
  if (!up.ok) {
    return NextResponse.json(
      { ok: false, error: 'We could not save that file. Please try again.' },
      { status: 502 }
    );
  }

  const inserted = await dbInsert('order_documents', {
    order_id: id,
    slot_key: slot.key,
    slot_label: slot.label,
    file_name: file.name,
    storage_path: path,
    direction: 'from_client',
    status: 'in_review',
    staff_note: null,
  });
  if (!inserted.ok) {
    // The row was not recorded: remove the uploaded file so a failed
    // upload never leaves an orphaned file in the bucket.
    await storageRemove('order-documents', path);
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
        fileName: file.name,
      },
      `${proto}://${host}/admin`
    );
    await sendOwnerEmail(subject, html, order.buyer_email).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}

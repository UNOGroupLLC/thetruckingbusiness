import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbInsert,
  storageRemove,
  storageUpload,
  sendClientEmail,
  emailConfigured,
  logOrderEvent,
} from '@/lib/server';
import { documentReadyEmail, type OrderInfo } from '@/lib/email';

/**
 * POST /api/orders/[id]/documents — owner uploads a filing document.
 * Multipart form: file, slotKey, slotLabel, orderInfo (JSON OrderInfo).
 * Stores bytes in the private Storage bucket, inserts an order_documents row,
 * and emails the customer "your document is ready". When the backend is
 * configured but the save failed, returns ok:false with status 502 so the
 * admin panel can show the failure instead of claiming success. In demo
 * mode (backend not configured) it still returns ok:true.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Same ADMIN_KEY lock as the rest of the admin API.
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey && (req.headers.get('x-admin-key') ?? '').trim() !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const slotKey = String(form?.get('slotKey') ?? '');
  const slotLabel = String(form?.get('slotLabel') ?? '');
  let orderInfo: OrderInfo | null = null;
  try {
    orderInfo = JSON.parse(String(form?.get('orderInfo') ?? 'null'));
  } catch {
    orderInfo = null;
  }

  if (!id || !(file instanceof File) || !slotKey || !orderInfo) {
    return NextResponse.json({ ok: false, error: 'Missing file, slot, or order.' }, { status: 400 });
  }

  let persisted = false;
  let emailed = false;

  if (backendConfigured()) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${id}/${slotKey}-${Date.now()}-${safeName}`;
    const bytes = await file.arrayBuffer();
    const up = await storageUpload('order-documents', path, bytes, file.type || 'application/pdf');
    if (up.ok) {
      persisted = (
        await dbInsert('order_documents', {
          order_id: id,
          slot_key: slotKey,
          slot_label: slotLabel || slotKey,
          file_name: file.name,
          storage_path: path,
        })
      ).ok;
      if (persisted) {
        await logOrderEvent(id, 'Owner', 'document_uploaded', slotLabel || slotKey);
      } else {
        // The row was not recorded: remove the uploaded file so a failed
        // save never leaves an orphaned file in the bucket.
        await storageRemove('order-documents', path);
      }
    }
  }

  if (emailConfigured() && orderInfo) {
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

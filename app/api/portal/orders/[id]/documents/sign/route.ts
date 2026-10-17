import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbSelect,
  storageSignedUploadUrl,
  verifyPortalToken,
} from '@/lib/server';
import { getPackage } from '@/lib/packages';

/**
 * POST /api/portal/orders/[id]/documents/sign — step 1 of a client
 * document upload (Oct 17, 2026, F9). Same auth and validation as the
 * register route it feeds: portal token, order ownership, the slot
 * must be on the package's requested list, the file type must be
 * allowed, and the size cap is 50 MB per file. The browser then sends
 * the file straight to Storage with the signed URL, so uploads no
 * longer pass through this function and the host's 4.5 MB body cap
 * does not apply. The register call checks the stored object again.
 */

const MAX_BYTES = 50 * 1024 * 1024;
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
  buyer_email: string;
}

function fileAllowed(name: string, type: string): boolean {
  const t = (type ?? '').toLowerCase();
  if (ALLOWED_TYPES.has(t)) return true;
  // Some phones/browsers report no usable MIME type for HEIC photos;
  // fall back to the file extension in that case only.
  if (t === '' || t === 'application/octet-stream') {
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
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
    `orders?select=id,package_slug,buyer_email&id=eq.${encodeURIComponent(id)}&limit=1`
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
    fileName?: string;
    size?: number;
    type?: string;
  } | null;
  const slotKey = String(body?.slotKey ?? '');
  const fileName = String(body?.fileName ?? '');
  const size = Number(body?.size ?? 0);
  const type = String(body?.type ?? '');

  const pkg = getPackage(order.package_slug);
  const slot = pkg?.requestedDocuments?.find((d) => d.key === slotKey);
  if (!slot) {
    return NextResponse.json(
      { ok: false, error: 'That document is not on the list for this order.' },
      { status: 400 }
    );
  }
  if (!fileName || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json(
      { ok: false, error: 'Please choose a file to upload.' },
      { status: 400 }
    );
  }
  if (size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'That file is too large. The limit is 50 MB per file.' },
      { status: 400 }
    );
  }
  if (!fileAllowed(fileName, type)) {
    return NextResponse.json(
      { ok: false, error: 'Please upload a PDF, JPG, PNG, or HEIC file.' },
      { status: 400 }
    );
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${id}/client/${slot.key}-${Date.now()}-${safeName}`;
  const uploadUrl = await storageSignedUploadUrl('order-documents', path);
  if (!uploadUrl) {
    return NextResponse.json(
      { ok: false, error: 'We could not start the upload. Please try again.' },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, path, uploadUrl });
}

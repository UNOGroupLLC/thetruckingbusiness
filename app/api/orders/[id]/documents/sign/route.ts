import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, storageSignedUploadUrl } from '@/lib/server';

/**
 * POST /api/orders/[id]/documents/sign — step 1 of a staff document
 * upload (Oct 17, 2026, F9). The admin panel asks for a signed upload
 * URL; the browser then sends the file straight to Storage, and the
 * register call (POST /api/orders/[id]/documents) records it. Files no
 * longer pass through this function, so the host's 4.5 MB body cap
 * does not apply. The cap here is 50 MB per file, checked again at
 * register time against the stored object itself.
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
    fileName?: string;
    size?: number;
  } | null;
  const slotKey = String(body?.slotKey ?? '');
  const fileName = String(body?.fileName ?? '');
  const size = Number(body?.size ?? 0);

  if (!id || !/^[a-zA-Z0-9._-]+$/.test(slotKey) || !fileName) {
    return NextResponse.json({ ok: false, error: 'Missing file or slot.' }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ ok: false, error: 'Missing file size.' }, { status: 400 });
  }
  if (size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'That file is too large. The limit is 50 MB per file.' },
      { status: 400 }
    );
  }
  if (!backendConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'We could not save that document. Please try again.' },
      { status: 503 }
    );
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${id}/${slotKey}-${Date.now()}-${safeName}`;
  const uploadUrl = await storageSignedUploadUrl('order-documents', path);
  if (!uploadUrl) {
    return NextResponse.json(
      { ok: false, error: 'We could not save that document. Please try again.' },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, path, uploadUrl });
}

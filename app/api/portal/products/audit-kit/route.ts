import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbSelect,
  verifyPortalToken,
  storageObjectSize,
  storageSignedUrl,
  AUDIT_KIT_MASTER_PATH,
} from '@/lib/server';
import { SEED_PACKAGES } from '@/lib/packages';

/**
 * GET /api/portal/products/audit-kit — download link for the Audit
 * Assistance Kit master file (Oct 18, 2026). The kit is a digital
 * product carried as an automatic document slot on the Complete
 * Package, the standalone kit, and Audit Assistance Plus. One master
 * copy lives in Storage at AUDIT_KIT_MASTER_PATH; staff set it by
 * uploading the finished kit file into the kit slot on any order (the
 * document routes copy it to the master path). This route answers a
 * short-lived signed URL only when the signed-in customer owns an
 * order whose package includes the kit, and only once the master file
 * actually exists; before that it answers 404 not-ready and the portal
 * keeps the honest "included with your purchase" wording.
 * Auth: x-portal-token header (same as /api/portal/orders).
 */

const KIT_SLUGS = SEED_PACKAGES.filter((p) =>
  p.expectedDocuments.some((d) => d.key === 'audit-kit' && d.auto)
).map((p) => p.slug);

export async function GET(req: NextRequest) {
  const email = verifyPortalToken(req.headers.get('x-portal-token') ?? '');
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  if (!backendConfigured()) {
    return NextResponse.json({ ok: false, error: 'not-ready' }, { status: 404 });
  }
  const res = await dbSelect<{ package_slug: string }>(
    `orders?select=package_slug&buyer_email=eq.${encodeURIComponent(email)}&limit=100`
  );
  const owns = res.rows.some((r) => KIT_SLUGS.includes(r.package_slug));
  if (!owns) {
    return NextResponse.json({ ok: false, error: 'not-included' }, { status: 403 });
  }
  const size = await storageObjectSize('order-documents', AUDIT_KIT_MASTER_PATH);
  if (!size) {
    return NextResponse.json({ ok: false, error: 'not-ready' }, { status: 404 });
  }
  const url = await storageSignedUrl('order-documents', AUDIT_KIT_MASTER_PATH);
  if (!url) {
    return NextResponse.json({ ok: false, error: 'not-ready' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, url });
}

import { NextRequest, NextResponse } from 'next/server';
import {
  backendConfigured,
  dbSelect,
  dbUpsert,
  emailConfigured,
  logOrderEvent,
  sendClientEmail,
} from '@/lib/server';
import {
  documentAcceptedEmail,
  documentNeedsNewCopyEmail,
  type DocumentEmailInfo,
} from '@/lib/email';

/**
 * POST /api/orders/[id]/documents/review: the team reviews one document
 * a client uploaded from their portal (order_documents, direction
 * 'from_client', migration-008).
 * Body JSON: { docId, action: 'accept' | 'request_new', note? }
 * Accept marks the document accepted; request_new sends it back with the
 * team's note so the client can upload a clearer copy. The client is
 * emailed either way. ADMIN_KEY required (same lock as the rest of the
 * admin API; actor in the activity trail is 'Owner', the admin session).
 */

function unauthorized(req: NextRequest): NextResponse | null {
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey && (req.headers.get('x-admin-key') ?? '').trim() !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  return null;
}

interface DocRow {
  id: string;
  order_id: string;
  slot_key: string;
  slot_label: string;
  direction?: string | null;
  status?: string | null;
}

interface OrderRow {
  id: string;
  package_name: string;
  buyer_name: string;
  buyer_email: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = unauthorized(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const docId = String(body?.docId ?? '');
  const action = String(body?.action ?? '');
  if (!id || !docId || (action !== 'accept' && action !== 'request_new')) {
    return NextResponse.json(
      { ok: false, error: 'Missing document or review action.' },
      { status: 400 }
    );
  }

  let note = '';
  if (action === 'request_new') {
    note = String(body?.note ?? '').trim();
    if (!note) {
      return NextResponse.json(
        { ok: false, error: 'Please add a short note telling the client what to fix.' },
        { status: 400 }
      );
    }
    if (note.length > 300) {
      return NextResponse.json(
        { ok: false, error: 'Please keep the note under 300 characters.' },
        { status: 400 }
      );
    }
  }

  if (!backendConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Document review is not available right now.' },
      { status: 503 }
    );
  }

  const docRes = await dbSelect<DocRow>(
    `order_documents?select=id,order_id,slot_key,slot_label,direction,status&id=eq.${encodeURIComponent(docId)}&limit=1`
  );
  const doc = docRes.rows[0];
  if (!doc || doc.order_id !== id) {
    return NextResponse.json({ ok: false, error: 'Document not found.' }, { status: 404 });
  }
  if (doc.direction !== 'from_client') {
    return NextResponse.json(
      { ok: false, error: 'Only documents uploaded by the client can be reviewed.' },
      { status: 400 }
    );
  }

  const status = action === 'accept' ? 'accepted' : 'needs_new_copy';
  const persisted = (
    await dbUpsert(
      'order_documents',
      { id: doc.id, status, staff_note: action === 'accept' ? null : note },
      'id'
    )
  ).ok;
  if (!persisted) {
    return NextResponse.json(
      { ok: false, error: 'Could not save that review. Please try again.' },
      { status: 502 }
    );
  }

  await logOrderEvent(
    id,
    'Owner',
    action === 'accept' ? 'document_accepted' : 'document_new_copy_requested',
    action === 'accept' ? doc.slot_label : `${doc.slot_label}: ${note}`
  );

  let emailed = false;
  if (emailConfigured()) {
    const orderRes = await dbSelect<OrderRow>(
      `orders?select=id,package_name,buyer_name,buyer_email&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    const order = orderRes.rows[0];
    if (order) {
      const info: DocumentEmailInfo = {
        id: order.id,
        packageName: order.package_name,
        buyerName: order.buyer_name,
        buyerEmail: order.buyer_email,
      };
      const proto = req.headers.get('x-forwarded-proto') ?? 'https';
      const host = req.headers.get('host') ?? 'thetruckingbusiness.vercel.app';
      const portalUrl = `${proto}://${host}/portal/login`;
      const { subject, html } =
        action === 'accept'
          ? documentAcceptedEmail(info, doc.slot_label)
          : documentNeedsNewCopyEmail(info, doc.slot_label, note, portalUrl);
      emailed = (await sendClientEmail(order.buyer_email, subject, html)).ok;
    }
  }

  return NextResponse.json({ ok: true, emailed });
}

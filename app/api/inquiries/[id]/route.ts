import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbUpdate } from '@/lib/server';

/**
 * PATCH /api/inquiries/[id] — update an inquiry's workflow state.
 * Body: { status?: 'new'|'in_progress'|'done', assignedTo?: string }
 * ADMIN_KEY required.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminKey = (process.env.ADMIN_KEY ?? '').trim();
  if (adminKey && (req.headers.get('x-admin-key') ?? '').trim() !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const patch: Record<string, unknown> = { id };
  if (typeof body?.status === 'string' && ['new', 'in_progress', 'done'].includes(body.status)) {
    patch.status = body.status;
  }
  if (typeof body?.assignedTo === 'string') {
    patch.assigned_to = body.assignedTo || null;
  }
  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ ok: false, error: 'Nothing to update.' }, { status: 400 });
  }
  let persisted = false;
  if (backendConfigured()) {
    // True PATCH (dbUpdate), never a partial-row upsert: contact_messages
    // has NOT NULL columns without defaults (name, email, topic, message),
    // so an upsert carrying only the changed fields fails even when the
    // inquiry exists (the Oct 16 audit bug family).
    const { id: _rowId, ...fields } = patch;
    persisted = (await dbUpdate('contact_messages', 'id', id, fields)).ok;
  }
  return NextResponse.json(
    { ok: persisted, persisted },
    { status: persisted ? 200 : 500 }
  );
}

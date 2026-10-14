import { NextRequest, NextResponse } from 'next/server';
import { backendConfigured, dbUpsert } from '@/lib/server';

/**
 * PATCH /api/inquiries/[id] — update an inquiry's workflow state.
 * Body: { status?: 'new'|'in_progress'|'done', assignedTo?: string }
 * ADMIN_KEY required.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminKey = process.env.ADMIN_KEY ?? '';
  if (adminKey && req.headers.get('x-admin-key') !== adminKey) {
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
    persisted = (await dbUpsert('contact_messages', patch, 'id')).ok;
  }
  return NextResponse.json({ ok: true, persisted });
}

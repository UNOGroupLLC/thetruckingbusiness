import { NextRequest, NextResponse, connection } from 'next/server';
import { backendConfigured, dbSelect } from '@/lib/server';

/**
 * GET /api/inquiries — website contact messages for the admin Inquiries
 * section (saved by POST /api/contact since migration-007). Newest first.
 * ADMIN_KEY required (same lock as GET /api/orders).
 */
export async function GET(req: NextRequest) {
  // Run at request time: the response depends on the caller's admin key
  // and on live database state, so it must never be prerendered.
  await connection();
  const adminKey = process.env.ADMIN_KEY ?? '';
  if (adminKey && req.headers.get('x-admin-key') !== adminKey) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  if (!backendConfigured()) {
    return NextResponse.json({ ok: true, configured: false, inquiries: [] });
  }
  const res = await dbSelect<{
    id: string;
    name: string;
    email: string;
    topic: string;
    message: string;
    status: string;
    assigned_to: string | null;
    created_at: string;
  }>(
    'contact_messages?select=id,name,email,topic,message,status,assigned_to,created_at&order=created_at.desc&limit=200'
  );
  if (!res.ok) {
    return NextResponse.json({ ok: true, configured: true, inquiries: [] });
  }
  return NextResponse.json({
    ok: true,
    configured: true,
    inquiries: res.rows.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      topic: m.topic,
      message: m.message,
      status: m.status,
      assignedTo: m.assigned_to ?? undefined,
      createdAt: m.created_at,
    })),
  });
}

import { NextResponse } from 'next/server';
import {
  checkBlogKey,
  getPublishedPost,
  getAnyPost,
  updatePost,
  deletePost,
  type BlogInput,
} from '@/lib/blog';

/** Public: one published post. ?all=1 with the API key returns drafts too (admin preview). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  if (searchParams.get('all') === '1' && checkBlogKey(req)) {
    const post = await getAnyPost(slug);
    if (!post) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true, post });
  }
  const post = await getPublishedPost(slug);
  if (!post) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, post });
}

/** Update a post — requires Authorization: Bearer <BLOG_API_KEY>. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!checkBlogKey(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const { slug } = await params;
  let body: BlogInput;
  try {
    body = (await req.json()) as BlogInput;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }
  const post = await updatePost(slug, body);
  if (!post) {
    return NextResponse.json({ ok: false, error: 'not found or update failed' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, post });
}

/** Delete a post — requires Authorization: Bearer <BLOG_API_KEY>. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!checkBlogKey(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const { slug } = await params;
  const ok = await deletePost(slug);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'not found or delete failed' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

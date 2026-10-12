import { NextResponse } from 'next/server';
import {
  blogConfigured,
  checkBlogKey,
  listPublishedPosts,
  listAllPosts,
  createPost,
  type BlogInput,
} from '@/lib/blog';

/** Public: list published posts. ?category= filters. ?all=1 + API key lists drafts too. */
export async function GET(req: Request) {
  if (!blogConfigured()) {
    return NextResponse.json({ ok: true, configured: false, posts: [] });
  }
  const { searchParams } = new URL(req.url);
  if (searchParams.get('all') === '1') {
    if (!checkBlogKey(req)) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const posts = await listAllPosts();
    return NextResponse.json({ ok: true, configured: true, posts });
  }
  const category = searchParams.get('category') || undefined;
  const posts = await listPublishedPosts(category);
  return NextResponse.json({ ok: true, configured: true, posts });
}

/**
 * Create a post — owner, VA, or agent only.
 * Requires: Authorization: Bearer <BLOG_API_KEY>
 * Body: { title*, excerpt, content_md*, category, tags[], cover_image_url,
 *         seo_title, seo_description, has_affiliate_links, status, author, slug? }
 */
export async function POST(req: Request) {
  if (!checkBlogKey(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  let body: BlogInput;
  try {
    body = (await req.json()) as BlogInput;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.title || !body.content_md) {
    return NextResponse.json(
      { ok: false, error: 'title and content_md are required' },
      { status: 400 }
    );
  }
  const post = await createPost(body);
  if (!post) {
    return NextResponse.json({ ok: false, error: 'could not create post' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, post }, { status: 201 });
}

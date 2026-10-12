/**
 * Blog data layer — server-side only.
 * Reads/writes the `blog_posts` table via Supabase REST with the service key.
 * Public pages only ever surface status='published' rows.
 */

import { marked } from 'marked';
import { timingSafeEqual } from 'crypto';
import { supabaseRestHeaders } from './server';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
// Public (unauthenticated) reads use the anon/publishable key: the
// blog_posts table grants SELECT to anon and the RLS policy exposes
// only published rows. Admin writes keep using the service key.
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
const BLOG_API_KEY = process.env.BLOG_API_KEY ?? '';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  cover_image_url: string | null;
  category: string;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  has_affiliate_links: boolean;
  faqs: { q: string; a: string }[];
  status: 'draft' | 'published';
  author: string;
  published_at: string | null;
  /** True = pinned to the top of the blog index, above publish-date order. */
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function blogConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

async function sb(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        ...supabaseRestHeaders(SUPABASE_KEY),
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init.headers || {}),
      },
      cache: 'no-store',
    });
  } catch {
    // Network-level failure (bad URL, DNS, offline): never crash the page.
    // Callers treat !ok as "no data".
    return new Response(null, { status: 599 });
  }
}

/**
 * Public reads (published posts) via the anon key. The table grants
 * SELECT to anon and the RLS policy exposes only published rows, so
 * this works even if the service key is misconfigured.
 */
async function sbPublic(path: string): Promise<Response> {
  const key = SUPABASE_ANON_KEY || SUPABASE_KEY;
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        ...supabaseRestHeaders(key),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
  } catch {
    return new Response(null, { status: 599 });
  }
}

/** Verify the shared BLOG_API_KEY from an Authorization: Bearer header. */
export function checkBlogKey(req: Request): boolean {
  if (!BLOG_API_KEY) return false;
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(BLOG_API_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

const POST_COLS =
  'id,slug,title,excerpt,content_md,cover_image_url,category,tags,seo_title,seo_description,has_affiliate_links,faqs,status,author,published_at,pinned,created_at,updated_at';

export async function listPublishedPosts(category?: string): Promise<BlogPost[]> {
  if (!blogConfigured()) return [];
  let path = `blog_posts?select=${POST_COLS}&status=eq.published&order=pinned.desc,published_at.desc.nullslast,created_at.desc`;
  if (category) path += `&category=eq.${encodeURIComponent(category)}`;
  const res = await sbPublic(path);
  if (!res.ok) return [];
  return (await res.json()) as BlogPost[];
}

export async function listAllPosts(): Promise<BlogPost[]> {
  if (!blogConfigured()) return [];
  const res = await sb(
    `blog_posts?select=${POST_COLS}&order=updated_at.desc`
  );
  if (!res.ok) return [];
  return (await res.json()) as BlogPost[];
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  if (!blogConfigured()) return null;
  const res = await sbPublic(
    `blog_posts?select=${POST_COLS}&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as BlogPost[];
  return rows[0] ?? null;
}

export async function getAnyPost(slug: string): Promise<BlogPost | null> {
  if (!blogConfigured()) return null;
  const res = await sb(
    `blog_posts?select=${POST_COLS}&slug=eq.${encodeURIComponent(slug)}&limit=1`
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as BlogPost[];
  return rows[0] ?? null;
}

export type BlogInput = Partial<
  Pick<
    BlogPost,
    | 'slug'
    | 'title'
    | 'excerpt'
    | 'content_md'
    | 'cover_image_url'
    | 'category'
    | 'tags'
    | 'seo_title'
    | 'seo_description'
    | 'has_affiliate_links'
    | 'faqs'
    | 'status'
    | 'author'
    | 'published_at'
    | 'pinned'
  >
>;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function createPost(input: BlogInput): Promise<BlogPost | null> {
  if (!blogConfigured()) return null;
  const slug = input.slug?.trim() || slugify(input.title || 'untitled');
  const now = new Date().toISOString();
  const body: Record<string, unknown> = {
    slug,
    title: (input.title || '').trim(),
    excerpt: (input.excerpt || '').trim(),
    content_md: input.content_md || '',
    cover_image_url: input.cover_image_url || null,
    category: (input.category || 'Guides').trim(),
    tags: Array.isArray(input.tags) ? input.tags : [],
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    has_affiliate_links: Boolean(input.has_affiliate_links),
    faqs: Array.isArray(input.faqs) ? input.faqs : [],
    status: input.status === 'published' ? 'published' : 'draft',
    author: (input.author || 'The Trucking Business').trim(),
    pinned: Boolean(input.pinned),
    updated_at: now,
  };
  if (body.status === 'published' && !input.published_at) body.published_at = now;
  if (input.published_at) body.published_at = input.published_at;
  const res = await sb('blog_posts', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) return null;
  const rows = (await res.json()) as BlogPost[];
  return rows[0] ?? null;
}

export async function updatePost(
  slug: string,
  input: BlogInput
): Promise<BlogPost | null> {
  if (!blogConfigured()) return null;
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of [
    'title',
    'excerpt',
    'content_md',
    'cover_image_url',
    'category',
    'tags',
    'seo_title',
    'seo_description',
    'has_affiliate_links',
    'faqs',
    'status',
    'author',
    'published_at',
    'pinned',
  ] as const) {
    if (input[k] !== undefined) body[k] = input[k];
  }
  if (body.status === 'published') {
    const existing = await getAnyPost(slug);
    if (existing && !existing.published_at && !body.published_at) {
      body.published_at = new Date().toISOString();
    }
  }
  const res = await sb(`blog_posts?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as BlogPost[];
  return rows[0] ?? null;
}

export async function deletePost(slug: string): Promise<boolean> {
  if (!blogConfigured()) return false;
  const res = await sb(`blog_posts?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

/** Render markdown to HTML with a light sanitizer (author-controlled content). */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md || '', { breaks: true }) as string;
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*"(javascript|data):[^"]*"/gi, 'href="#"')
    .replace(/href\s*=\s*'(javascript|data):[^']*'/gi, "href='#'");
}

const EMBED_HEIGHTS: Record<string, number> = {
  'calculators/startup-cost': 1100,
  'calculators/cost-per-mile': 1100,
  'visuals/sleeper-berth': 760,
  'visuals/startup-roadmap': 1300,
  'visuals/hos-clocks': 720,
  'visuals/authority-timeline': 640,
};

function embedFrame(src: string): string {
  const h = EMBED_HEIGHTS[src.replace('/embeds/', '')] || 700;
  return `<div class="blog-embed"><iframe src="${src}" title="Interactive embed" loading="lazy" style="width:100%;height:${h}px;border:1px solid #e3e9ef;border-radius:12px;" sandbox="allow-scripts allow-same-origin allow-popups"></iframe></div>`;
}

/**
 * Expand [calculator:slug] and [visual:slug] shortcodes (own line in markdown)
 * into iframe embeds. Unknown slugs render a graceful fallback link.
 */
export function expandShortcodes(md: string): string {
  return (md || '')
    .replace(
      /^\[calculator:([a-z0-9-]+)\]$/gm,
      (_m, slug: string) => `\n\n${embedFrame(`/embeds/calculators/${slug}`)}\n\n`
    )
    .replace(
      /^\[visual:([a-z0-9-]+)\]$/gm,
      (_m, slug: string) => `\n\n${embedFrame(`/embeds/visuals/${slug}`)}\n\n`
    );
}

/** Full pipeline: shortcodes first, then markdown → sanitized HTML. */
export function renderPost(md: string): string {
  return renderMarkdown(expandShortcodes(md));
}

export function readMinutes(md: string): number {
  const words = (md || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatPostDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

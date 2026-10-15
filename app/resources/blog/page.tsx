import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublishedPosts } from '@/lib/blog';
import BlogSearch, { type BlogCardPost } from '@/components/BlogSearch';
export const instant = false;

export const metadata: Metadata = {
  title: 'Blog — Trucking Startup & DOT Compliance Guides | The Trucking Business',
  description:
    'Plain-English guides on starting a trucking company, MC authority, DOT compliance, ELDs, and staying audit-ready.',
  alternates: { canonical: 'https://www.thetruckingbusiness.com/resources/blog' },
};


export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const posts = await listPublishedPosts(category);
  const all = await listPublishedPosts();
  const categories = Array.from(new Set(all.map((p) => p.category))).sort();

  return (
    <div className="wrap" style={{ paddingTop: 48, paddingBottom: 64 }}>
      <div className="sec-head">
        <div className="kicker">Blog</div>
        <h2>
          Trucking knowledge,
          <br />
          <em>no jargon.</em>
        </h2>
        <p>
          Step-by-step guides on starting your trucking company, getting your
          authority, and staying DOT compliant — written in plain English.
        </p>
      </div>

      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '20px 0 8px' }}>
          <Link
            href="/resources/blog"
            className="btn btn-s"
            style={!category ? { background: '#0a1a36', color: '#fff' } : undefined}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/resources/blog?category=${encodeURIComponent(c)}`}
              className="btn btn-s"
              style={category === c ? { background: '#0a1a36', color: '#fff' } : undefined}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <p style={{ marginTop: 32, color: '#5b6a82' }}>
          No articles here yet — check back soon.
        </p>
      ) : (
        <BlogSearch
          posts={posts.map(
            (p): BlogCardPost => ({
              slug: p.slug,
              title: p.title,
              excerpt: p.excerpt,
              cover_image_url: p.cover_image_url,
              category: p.category,
              tags: p.tags || [],
              published_at: p.published_at,
              content_md: p.content_md,
            })
          )}
        />
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublishedPosts, formatPostDate, readMinutes } from '@/lib/blog';
export const instant = false;

export const metadata: Metadata = {
  title: 'Blog — Trucking Startup & DOT Compliance Guides | The Trucking Business',
  description:
    'Plain-English guides on starting a trucking company, MC authority, DOT compliance, ELDs, and staying audit-ready.',
  alternates: { canonical: 'https://www.thetruckingbusiness.com/resources/blog' },
};


function CardImage({ post }: { post: { cover_image_url: string | null; title: string; category: string } }) {
  if (post.cover_image_url) {
    return <img src={post.cover_image_url} alt={post.title} loading="lazy" />;
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg,#0b2e4f 0%,#164a7a 100%)',
        color: '#f5c400',
        fontWeight: 900,
        fontSize: 13,
        letterSpacing: 2,
        textTransform: 'uppercase',
        padding: 16,
        textAlign: 'center',
      }}
    >
      {post.category}
    </div>
  );
}

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
            style={!category ? { background: '#0b2e4f', color: '#fff' } : undefined}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/resources/blog?category=${encodeURIComponent(c)}`}
              className="btn btn-s"
              style={category === c ? { background: '#0b2e4f', color: '#fff' } : undefined}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <p style={{ marginTop: 32, color: '#5b6b7b' }}>
          No articles here yet — check back soon.
        </p>
      ) : (
        <div className="res-grid" style={{ marginTop: 24 }}>
          {posts.map((p) => (
            <article key={p.slug} className="res">
              <div className="res-img">
                <CardImage post={p} />
              </div>
              <div className="res-body">
                <span className="path-tag">{p.category}</span>
                <h3>
                  <Link
                    href={`/resources/blog/${p.slug}`}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {p.title}
                  </Link>
                </h3>
                <p>{p.excerpt}</p>
                <div style={{ fontSize: 12.5, color: '#5b6b7b', marginBottom: 10 }}>
                  {formatPostDate(p.published_at)} · {readMinutes(p.content_md)} min read
                </div>
                <Link href={`/resources/blog/${p.slug}`} className="res-link">
                  Read article
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

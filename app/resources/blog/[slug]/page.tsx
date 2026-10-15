import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPublishedPost,
  listPublishedPosts,
  renderPost,
  readMinutes,
  formatPostDate,
} from '@/lib/blog';


const SITE = 'https://www.thetruckingbusiness.com';

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: 'Article not found | The Trucking Business' };
  const title = post.seo_title || `${post.title} | The Trucking Business`;
  const description = post.seo_description || post.excerpt;
  const url = `${SITE}/resources/blog/${post.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      publishedTime: post.published_at || undefined,
      authors: [post.author],
      ...(post.cover_image_url ? { images: [{ url: post.cover_image_url }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BlogArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const html = renderPost(post.content_md);
  const url = `${SITE}/resources/blog/${post.slug}`;
  const related = (await listPublishedPosts(post.category))
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  const faqs = Array.isArray(post.faqs) ? post.faqs : [];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        image: post.cover_image_url || undefined,
        author: { '@type': 'Organization', name: post.author },
        publisher: {
          '@type': 'Organization',
          name: 'The Trucking Business',
          url: SITE,
        },
        datePublished: post.published_at || post.created_at,
        dateModified: post.updated_at,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      },
      ...(faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 64 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: '#5b6a82', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'inherit' }}>Home</Link>
        {'  /  '}
        <Link href="/resources/blog" style={{ color: 'inherit' }}>Blog</Link>
        {'  /  '}
        <span>{post.category}</span>
      </nav>

      <article style={{ maxWidth: 760, margin: '0 auto' }}>
        <span className="path-tag">{post.category}</span>
        <h1
          style={{
            color: '#0a1a36',
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: '12px 0',
          }}
        >
          {post.title}
        </h1>
        <div style={{ fontSize: 13.5, color: '#5b6a82', marginBottom: 24 }}>
          By {post.author} · {formatPostDate(post.published_at)} ·{' '}
          {readMinutes(post.content_md)} min read
        </div>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            style={{ width: '100%', borderRadius: 12, marginBottom: 28 }}
          />
        )}

        {post.has_affiliate_links && (
          <div
            role="note"
            style={{
              background: '#fff8e1',
              border: '1px solid #ffc61a',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 13.5,
              color: '#5b4a00',
              marginBottom: 24,
            }}
          >
            <strong>Affiliate disclosure:</strong> this article contains affiliate
            links. If you buy through them, we may earn a commission at no extra
            cost to you — it helps keep our guides free.
          </div>
        )}

        <div
          className="blog-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {faqs.length > 0 && (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ color: '#0a1a36', fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
              Frequently asked questions
            </h2>
            {faqs.map((f, i) => (
              <details
                key={i}
                style={{
                  border: '1px solid #dde3ec',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 10,
                  background: '#f6f7f9',
                }}
              >
                <summary style={{ fontWeight: 700, color: '#0a1a36', cursor: 'pointer', fontSize: 15 }}>
                  {f.q}
                </summary>
                <p style={{ margin: '10px 0 0', fontSize: 15, color: '#0e1728' }}>{f.a}</p>
              </details>
            ))}
          </section>
        )}

        <div
          style={{
            marginTop: 40,
            background: '#0a1a36',
            borderRadius: 14,
            padding: '28px 28px',
            color: '#fff',
          }}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>
            Want this handled for you?
          </h3>
          <p style={{ margin: '0 0 16px', color: '#c9d6e2', fontSize: 15 }}>
            Our startup and compliance packages take the paperwork off your
            plate — authority, filings, and ongoing compliance, done right.
          </p>
          <Link href="/pricing" className="btn btn-y">
            See packages & pricing
          </Link>
        </div>

        <p
          style={{
            marginTop: 28,
            fontSize: 12.5,
            color: '#5b6a82',
            borderTop: '1px solid #dde3ec',
            paddingTop: 16,
          }}
        >
          <strong>Disclaimer:</strong> The Trucking Business is an independent
          private company and is not affiliated with FMCSA, the U.S. Department
          of Transportation, or any government agency. This article is
          educational and for planning only; always verify current requirements,
          fees, and deadlines with FMCSA, the eCFR, IRS, and your state agencies
          before filing.
        </p>
      </article>

      {related.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <h2 style={{ color: '#0a1a36', fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
            Keep reading
          </h2>
          <div className="res-grid">
            {related.map((p) => (
              <article key={p.slug} className="res">
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
                  <Link href={`/resources/blog/${p.slug}`} className="res-link">
                    Read article
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

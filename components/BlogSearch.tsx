'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface BlogCardPost {
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  tags: string[];
  published_at: string | null;
  content_md: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function readMinutes(md: string): number {
  const words = md.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogSearch({ posts }: { posts: BlogCardPost[] }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? posts.filter((p) =>
        [p.title, p.excerpt, p.category, ...(p.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      )
    : posts;

  return (
    <div>
      <div style={{ margin: '20px 0 8px', maxWidth: 520 }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search articles — try “MC”, “insurance”, “ELD”…"
          aria-label="Search blog articles"
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 15,
            border: '2px solid #dde3ec',
            borderRadius: 12,
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#1755a8')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#dde3ec')}
        />
        {needle && (
          <p style={{ fontSize: 12.5, color: '#5b6a82', margin: '8px 0 0' }}>
            {filtered.length} {filtered.length === 1 ? 'article' : 'articles'} matching
            “{q.trim()}”
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ marginTop: 32, color: '#5b6a82' }}>
          No articles match “{q.trim()}” — try a different word.
        </p>
      ) : (
        <div className="res-grid" style={{ marginTop: 24 }}>
          {filtered.map((p) => (
            <article key={p.slug} className="res">
              <div className="res-img">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt={p.title} loading="lazy" />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg,#0a1a36 0%,#0f2a5c 100%)',
                      color: '#ffc61a',
                      fontWeight: 900,
                      fontSize: 12.5,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      padding: 16,
                      textAlign: 'center',
                    }}
                  >
                    {p.category}
                  </div>
                )}
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
                <div style={{ fontSize: 12.5, color: '#5b6a82', marginBottom: 10 }}>
                  {formatDate(p.published_at)} · {readMinutes(p.content_md)} min read
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

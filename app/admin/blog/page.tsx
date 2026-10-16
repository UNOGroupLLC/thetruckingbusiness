'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { marked } from 'marked';

interface Post {
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
  updated_at: string;
}

const EMPTY: Post = {
  slug: '',
  title: '',
  excerpt: '',
  content_md: '',
  cover_image_url: '',
  category: 'Guides',
  tags: [],
  seo_title: '',
  seo_description: '',
  has_affiliate_links: false,
  faqs: [],
  status: 'draft',
  author: 'The Trucking Business',
  published_at: null,
  updated_at: '',
};

const KEY_NAME = 'ttb_blog_key';

function slugify(t: string) {
  return t
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #dbe3ea',
  borderRadius: 0,
  padding: '10px 12px',
  fontSize: 14,
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 700,
  color: '#0b2e4f',
  margin: '14px 0 6px',
};

export default function AdminBlog() {
  const [key, setKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY_NAME) || '';
    setKey(saved);
    setKeyInput(saved);
    if (saved) load(saved);
  }, []);

  async function load(k: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/blog?all=1', {
        headers: { Authorization: `Bearer ${k}` },
      });
      const data = await res.json();
      if (data.ok) setPosts(data.posts);
      else setMsg(data.error === 'unauthorized' ? 'Wrong API key.' : 'Could not load posts.');
    } catch {
      setMsg('Could not load posts. Is the site deployed with the blog migration?');
    }
    setLoading(false);
  }

  function saveKey() {
    sessionStorage.setItem(KEY_NAME, keyInput.trim());
    setKey(keyInput.trim());
    setMsg('');
    load(keyInput.trim());
  }

  function startNew() {
    setEditing({ ...EMPTY });
    setIsNew(true);
    setPreview(false);
    setMsg('');
  }

  function startEdit(p: Post) {
    setEditing({ ...p, tags: p.tags || [], faqs: p.faqs || [] });
    setIsNew(false);
    setPreview(false);
    setMsg('');
  }

  async function save(status: 'draft' | 'published') {
    if (!editing) return;
    if (!editing.title.trim() || !editing.content_md.trim()) {
      setMsg('Title and content are required.');
      return;
    }
    const payload = {
      ...editing,
      slug: editing.slug.trim() || slugify(editing.title),
      status,
      tags: editing.tags,
    };
    setLoading(true);
    try {
      const url = isNew ? '/api/blog' : `/api/blog/${encodeURIComponent(editing.slug)}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg(status === 'published' ? 'Published.' : 'Draft saved.');
        setEditing(null);
        load(key);
      } else {
        setMsg(data.error || 'Save failed.');
      }
    } catch {
      setMsg('Save failed — check your connection.');
    }
    setLoading(false);
  }

  async function remove(slug: string) {
    if (!confirm(`Delete "${slug}" permanently?`)) return;
    const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json();
    if (data.ok) {
      setMsg('Deleted.');
      load(key);
    } else setMsg(data.error || 'Delete failed.');
  }

  if (!key) {
    return (
      <div className="wrap sharp" style={{ paddingTop: 48, paddingBottom: 64, maxWidth: 560 }}>
        <Link href="/admin" style={{ fontSize: 13 }}>← Back to admin</Link>
        <h1 style={{ color: '#0b2e4f', fontWeight: 900, fontSize: 28, margin: '12px 0' }}>
          Blog — API key
        </h1>
        <p style={{ color: '#5b6b7b', fontSize: 14 }}>
          Paste your <code>BLOG_API_KEY</code> to manage articles. It's kept only in
          this browser tab — never in the code.
        </p>
        <label style={labelStyle}>API key</label>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          style={inputStyle}
          placeholder="Paste BLOG_API_KEY"
        />
        <button className="btn btn-y" style={{ marginTop: 14 }} onClick={saveKey}>
          Unlock blog admin
        </button>
        {msg && <p style={{ color: '#b00', marginTop: 12 }}>{msg}</p>}
      </div>
    );
  }

  return (
    <div className="wrap sharp" style={{ paddingTop: 40, paddingBottom: 64 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link href="/admin" style={{ fontSize: 13 }}>← Back to admin</Link>
          <h1 style={{ color: '#0b2e4f', fontWeight: 900, fontSize: 28, margin: '8px 0 0' }}>
            Blog articles
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/resources/blog" target="_blank" className="btn btn-o btn-s">
            View blog
          </Link>
          <button className="btn btn-y btn-s" onClick={startNew}>
            + New article
          </button>
        </div>
      </div>

      {msg && (
        <p style={{ marginTop: 12, color: msg.includes('fail') || msg.includes('Wrong') || msg.includes('Could not') ? '#b00' : '#0a7a2f' }}>
          {msg}
        </p>
      )}

      {loading && <p style={{ color: '#5b6b7b' }}>Loading…</p>}

      {!editing && (
        <div style={{ marginTop: 20, border: '1px solid #e3e9ef', borderRadius: 0, overflow: 'hidden' }}>
          {posts.map((p: Post) => (
            <div
              key={p.slug}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid #eef2f6',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#0b2e4f' }}>{p.title || '(untitled)'}</div>
                <div style={{ fontSize: 12.5, color: '#5b6b7b' }}>
                  /{p.slug} · {p.category} · updated{' '}
                  {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    padding: '4px 10px',
                    borderRadius: 0,
                    background: p.status === 'published' ? '#e6f4ea' : '#fff4d6',
                    color: p.status === 'published' ? '#0a7a2f' : '#8a6d00',
                  }}
                >
                  {p.status}
                </span>
                {p.status === 'published' && (
                  <Link
                    href={`/resources/blog/${p.slug}`}
                    target="_blank"
                    className="btn btn-o btn-s"
                  >
                    View
                  </Link>
                )}
                <button className="btn btn-o btn-s" onClick={() => startEdit(p)}>
                  Edit
                </button>
                <button
                  className="btn btn-s"
                  style={{ border: '1px solid #f0b6b6', color: '#b00', background: '#fff' }}
                  onClick={() => remove(p.slug)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {posts.length === 0 && !loading && (
            <p style={{ padding: 20, color: '#5b6b7b' }}>
              No articles yet. Click <strong>+ New article</strong> to write your first one —
              no code needed.
            </p>
          )}
        </div>
      )}

      {editing && (
        <div style={{ marginTop: 20, background: '#fff', border: '1px solid #e3e9ef', borderRadius: 0, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#0b2e4f', fontSize: 20, fontWeight: 800, margin: 0 }}>
              {isNew ? 'New article' : 'Edit article'}
            </h2>
            <button
              className="btn btn-o btn-s"
              onClick={() => setPreview((v: boolean) => !v)}
            >
              {preview ? 'Back to editing' : 'Preview'}
            </button>
          </div>

          {!preview ? (
            <>
              <label style={labelStyle}>Title *</label>
              <input
                style={inputStyle}
                value={editing.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setEditing({
                    ...editing,
                    title,
                    slug: isNew || !editing.slug ? slugify(title) : editing.slug,
                    seo_title: editing.seo_title || title,
                  });
                }}
                placeholder="How to …"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>URL slug</label>
                  <input
                    style={inputStyle}
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                    placeholder="auto-from-title"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <input
                    style={inputStyle}
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    placeholder="Guides"
                  />
                </div>
              </div>
              <label style={labelStyle}>Excerpt (shows on cards + Google)</label>
              <textarea
                style={{ ...inputStyle, minHeight: 64 }}
                value={editing.excerpt}
                onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                placeholder="One or two sentences."
                maxLength={300}
              />
              <label style={labelStyle}>Content (Markdown) *</label>
              <textarea
                style={{ ...inputStyle, minHeight: 320, fontFamily: 'monospace', fontSize: 13 }}
                value={editing.content_md}
                onChange={(e) => setEditing({ ...editing, content_md: e.target.value })}
                placeholder={'## Heading\n\nWrite here. **Bold**, *italic*, [links](https://…), ![alt](image-url).'}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Cover image URL (optional)</label>
                  <input
                    style={inputStyle}
                    value={editing.cover_image_url || ''}
                    onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tags (comma separated)</label>
                  <input
                    style={inputStyle}
                    value={(editing.tags || []).join(', ')}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    placeholder="eld, compliance"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>SEO title (optional)</label>
                  <input
                    style={inputStyle}
                    value={editing.seo_title || ''}
                    onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })}
                    placeholder="Defaults to the title"
                    maxLength={70}
                  />
                </div>
                <div>
                  <label style={labelStyle}>SEO description (optional)</label>
                  <input
                    style={inputStyle}
                    value={editing.seo_description || ''}
                    onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })}
                    placeholder="~155 characters for Google"
                    maxLength={160}
                  />
                </div>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={editing.has_affiliate_links}
                  onChange={(e) => setEditing({ ...editing, has_affiliate_links: e.target.checked })}
                />
                This article contains affiliate links (shows a disclosure box — required by the FTC)
              </label>
              <label style={labelStyle}>FAQs (one per line — Question :: Answer)</label>
              <textarea
                style={{ ...inputStyle, minHeight: 110, fontSize: 13 }}
                value={(editing.faqs || []).map((f) => `${f.q} :: ${f.a}`).join('\n')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    faqs: e.target.value
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean)
                      .map((l) => {
                        const i = l.indexOf('::');
                        return i > 0
                          ? { q: l.slice(0, i).trim(), a: l.slice(i + 2).trim() }
                          : { q: l, a: '' };
                      })
                      .filter((f) => f.q && f.a),
                  })
                }
                placeholder={'How long does it take? :: Usually a few weeks…'}
              />
              <p style={{ fontSize: 12, color: '#5b6b7b', marginTop: 4 }}>
                FAQs boost Google's "People Also Ask" placement. Aim for 3–5 per article.
              </p>
            </>
          ) : (
            <div style={{ marginTop: 16 }}>
              <h1 style={{ color: '#0b2e4f', fontWeight: 900, fontSize: 30, letterSpacing: '-0.02em' }}>
                {editing.title || '(untitled)'}
              </h1>
              <div
                className="blog-body"
                style={{ border: '1px dashed #c9d3dd', borderRadius: 0, padding: 20, marginTop: 12 }}
                dangerouslySetInnerHTML={{ __html: marked.parse(
                    (editing.content_md || '*Nothing yet*')
                      .replace(/^\[calculator:([a-z0-9-]+)\]$/gm, '*[Calculator embed: $1 — shows on the live site]*')
                      .replace(/^\[visual:([a-z0-9-]+)\]$/gm, '*[Interactive visual: $1 — shows on the live site]*')
                  ) as string }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button className="btn btn-y" disabled={loading} onClick={() => save('published')}>
              {editing.status === 'published' && !isNew ? 'Save & keep published' : 'Publish'}
            </button>
            <button className="btn btn-o" disabled={loading} onClick={() => save('draft')}>
              Save as draft
            </button>
            <button className="btn btn-o" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: '#5b6b7b', marginTop: 12 }}>
            Publishing makes the article live instantly at{' '}
            <code>/resources/blog/{editing.slug || 'your-slug'}</code>.
          </p>
        </div>
      )}
    </div>
  );
}

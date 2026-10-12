import type { MetadataRoute } from 'next';
import { listPublishedPosts } from '@/lib/blog';

const SITE = 'https://www.thetruckingbusiness.com';

const STATIC_ROUTES = [
  '',
  '/pricing',
  '/calculators',
  '/resources/blog',
  '/portal/login',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = STATIC_ROUTES.map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    changeFrequency: p === '/resources/blog' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));

  try {
    const posts = await listPublishedPosts();
    for (const p of posts) {
      routes.push({
        url: `${SITE}/resources/blog/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
  } catch {
    // Blog table not migrated yet — sitemap still serves static routes.
  }

  return routes;
}

import type { MetadataRoute } from 'next';
import { latestArticles } from '@/lib/queries';
import { CATEGORIES, SITE } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { items } = await latestArticles({ limit: 1000 });
  return [
    { url: SITE.url, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE.url}/news`, changeFrequency: 'hourly' },
    ...CATEGORIES.map((c) => ({ url: `${SITE.url}/section/${c.slug}`, changeFrequency: 'hourly' as const })),
    ...items.map((a) => ({ url: `${SITE.url}/news/${a.id}`, lastModified: a.published_at ?? undefined })),
  ];
}

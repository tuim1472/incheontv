import { latestArticles } from '@/lib/queries';
import { SITE, categoryName } from '@/lib/site';

export const revalidate = 300;

function esc(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

// 포털 검색제휴·뉴스 수집용 RSS
export async function GET() {
  const { items } = await latestArticles({ limit: 50 });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${esc(SITE.name)}</title>
<link>${SITE.url}</link>
<description>${esc(SITE.description)}</description>
<language>ko</language>
${items
  .map(
    (a) => `<item>
<title>${esc(a.title)}</title>
<link>${SITE.url}/news/${a.id}</link>
<guid isPermaLink="true">${SITE.url}/news/${a.id}</guid>
<description>${esc(a.subtitle)}</description>
<category>${esc(categoryName(a.category))}</category>
${a.author_name ? `<author>${esc(a.author_name)}</author>` : ''}
<pubDate>${a.published_at ? new Date(a.published_at).toUTCString() : ''}</pubDate>
</item>`,
  )
  .join('\n')}
</channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
